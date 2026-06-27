'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
  '#b0bec5', // Tuerca - gris metálico
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // Tuerca (nut) - 3x3 hueca
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');
const pauseMenu = document.getElementById('pause-menu');
const pmResumeBtn = document.getElementById('pm-resume');
const pmRestartBtn = document.getElementById('pm-restart');
const pmControlsBtn = document.getElementById('pm-controls');
const pmControlsPanel = document.getElementById('pm-controls-panel');
const pmLevelDec = document.getElementById('pm-level-dec');
const pmLevelInc = document.getElementById('pm-level-inc');
const pmLevelValue = document.getElementById('pm-level-value');

const startOverlay = document.getElementById('start-overlay');
const startHighscores = document.getElementById('start-highscores');
const overlayHighscores = document.getElementById('overlay-highscores');
const hsNameRow = document.getElementById('hs-name-row');
const hsNameInput = document.getElementById('hs-name-input');
const hsSaveBtn = document.getElementById('hs-save-btn');
const hsResetBtn = document.getElementById('hs-reset-btn');
const playBtn = document.getElementById('play-btn');

const MIN_LEVEL = 1;
const MAX_LEVEL = 15;

function intervalFor(lvl) {
  return Math.max(100, 1000 - (lvl - 1) * 90);
}

function clampLevel(lvl) {
  if (!Number.isFinite(lvl)) return MIN_LEVEL;
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, lvl));
}

let startLevel = clampLevel(parseInt(localStorage.getItem('tetris-start-level'), 10));

function setStartLevel(lvl) {
  startLevel = clampLevel(lvl);
  localStorage.setItem('tetris-start-level', String(startLevel));
  pmLevelValue.textContent = startLevel;
}

setStartLevel(startLevel);

pmLevelDec.addEventListener('click', () => setStartLevel(startLevel - 1));
pmLevelInc.addEventListener('click', () => setStartLevel(startLevel + 1));

let gridStroke = '#22222e';
let blockHighlight = 'rgba(255,255,255,0.12)';

function updateThemeColors() {
  const s = getComputedStyle(document.documentElement);
  gridStroke = s.getPropertyValue('--grid-stroke').trim();
  blockHighlight = s.getPropertyValue('--block-highlight').trim();
}

function applyTheme(light) {
  document.body.classList.toggle('light', light);
  themeToggle.checked = light;
  localStorage.setItem('tetris-theme', light ? 'light' : 'dark');
  updateThemeColors();
}

themeToggle.addEventListener('change', () => applyTheme(themeToggle.checked));

(function initTheme() {
  const saved = localStorage.getItem('tetris-theme');
  applyTheme(saved === 'light');
})();

/* ---- Récords (highscores) ---- */
const HS_KEY = 'tetris-highscores';
const STATS_KEY = 'tetris-stats';
const HS_MAX = 5;

function loadHighscores() {
  try {
    const raw = JSON.parse(localStorage.getItem(HS_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveHighscores(list) {
  localStorage.setItem(HS_KEY, JSON.stringify(list.slice(0, HS_MAX)));
}

function loadStats() {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY));
    if (raw && typeof raw === 'object') {
      return { maxLines: raw.maxLines || 0, bestCombo: raw.bestCombo || 0 };
    }
  } catch {
    /* fall through to default */
  }
  return { maxLines: 0, bestCombo: 0 };
}

function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function qualifies(scoreVal) {
  if (scoreVal <= 0) return false;
  const list = loadHighscores();
  if (list.length < HS_MAX) return true;
  return scoreVal > list[list.length - 1].score;
}

function renderHighscores(container, highlightId) {
  const list = loadHighscores();
  const stats = loadStats();
  let html = '<p class="hs-title">RÉCORDS</p>';
  if (!list.length) {
    html += '<p class="hs-empty">Aún no hay récords</p>';
  } else {
    html += '<div class="hs-table">';
    html += '<div class="hs-row hs-head"><span>#</span><span class="hs-name">NOMBRE</span><span class="hs-score">PUNTOS</span></div>';
    list.forEach((entry, i) => {
      const cur = entry.id && entry.id === highlightId ? ' hs-current' : '';
      const name = escapeHtml(entry.name || '---');
      html += `<div class="hs-row${cur}"><span>${i + 1}</span><span class="hs-name">${name}</span><span class="hs-score">${entry.score.toLocaleString()}</span></div>`;
    });
    html += '</div>';
  }
  html += `<div class="hs-stats"><span>Mejor combo: <b>${stats.bestCombo}</b></span><span>Máx. líneas: <b>${stats.maxLines}</b></span></div>`;
  container.innerHTML = html;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, combo, maxCombo;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.max(startLevel, Math.floor(lines / 10) + 1);
    dropInterval = intervalFor(level);
    updateHUD();
  }
  return cleared;
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  const cleared = clearLines();
  if (cleared > 0) {
    combo++;
    if (combo > maxCombo) maxCombo = combo;
  } else {
    combo = 0;
  }
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  context.fillStyle = blockHighlight;
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = gridStroke;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

let currentRunId = null;

function persistStats() {
  const stats = loadStats();
  let changed = false;
  if (lines > stats.maxLines) { stats.maxLines = lines; changed = true; }
  if (maxCombo > stats.bestCombo) { stats.bestCombo = maxCombo; changed = true; }
  if (changed) saveStats(stats);
}

function saveCurrentScore(name) {
  const entry = {
    id: currentRunId,
    name: (name || '').trim().slice(0, 12) || 'Anónimo',
    score,
    lines,
    combo: maxCombo,
    date: new Date().toISOString(),
  };
  const list = loadHighscores();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  saveHighscores(list);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  pauseMenu.classList.add('hidden');
  restartBtn.classList.remove('hidden');
  overlayHighscores.classList.remove('hidden');
  persistStats();

  if (qualifies(score)) {
    currentRunId = `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    hsNameRow.classList.remove('hidden');
    renderHighscores(overlayHighscores, null);
    overlay.classList.remove('hidden');
    hsNameInput.value = '';
    hsNameInput.focus();
  } else {
    currentRunId = null;
    hsNameRow.classList.add('hidden');
    renderHighscores(overlayHighscores, null);
    overlay.classList.remove('hidden');
  }
}

function commitHighscore() {
  if (!currentRunId) return;
  saveCurrentScore(hsNameInput.value);
  hsNameRow.classList.add('hidden');
  renderHighscores(overlayHighscores, currentRunId);
}

function togglePause() {
  if (gameOver || !current) return;       // sin partida en curso (pantalla de inicio) no se pausa
  paused = !paused;
  if (!paused) {
    overlay.classList.add('hidden');
    pauseMenu.classList.add('hidden');
    pmControlsPanel.classList.add('hidden');
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    restartBtn.classList.add('hidden');
    overlayHighscores.classList.add('hidden');
    hsNameRow.classList.add('hidden');
    pauseMenu.classList.remove('hidden');
    pmControlsPanel.classList.add('hidden');
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  if (gameOver) return;        // endGame() ya mostró el overlay; no reprogramar ni dibujar más
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = startLevel;
  combo = 0;
  maxCombo = 0;
  currentRunId = null;
  paused = false;
  gameOver = false;
  dropInterval = intervalFor(level);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  pauseMenu.classList.add('hidden');
  pmControlsPanel.classList.add('hidden');
  restartBtn.classList.remove('hidden');
  hsNameRow.classList.add('hidden');
  overlay.classList.add('hidden');
  startOverlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

function showStartScreen() {
  renderHighscores(startHighscores, null);
  overlay.classList.add('hidden');
  startOverlay.classList.remove('hidden');
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);
playBtn.addEventListener('click', init);

pmResumeBtn.addEventListener('click', () => { if (paused) togglePause(); });
pmRestartBtn.addEventListener('click', init);
pmControlsBtn.addEventListener('click', () => pmControlsPanel.classList.toggle('hidden'));

hsSaveBtn.addEventListener('click', commitHighscore);
hsNameInput.addEventListener('keydown', e => {
  if (e.code === 'Enter') { e.preventDefault(); commitHighscore(); }
});

hsResetBtn.addEventListener('click', () => {
  localStorage.removeItem(HS_KEY);
  localStorage.removeItem(STATS_KEY);
  renderHighscores(startHighscores, null);
});

showStartScreen();
