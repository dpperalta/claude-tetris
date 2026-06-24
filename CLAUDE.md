# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Classic Tetris implementation in vanilla JavaScript with HTML5 Canvas rendering. Zero dependencies — no package.json, no bundler, no build step.

## Running the Game

Open `index.html` directly in a browser, or serve with any static server:

```bash
npx serve .
# or
python3 -m http.server 8000
```

There are no build, lint, or test commands.

## Architecture

Three files, all at the root:

- **`index.html`** — DOM structure with two `<canvas>` elements (board at 300×600px, next-piece preview at 120×120px) and an overlay for pause/game-over states.
- **`style.css`** — Dark arcade theme using flexbox layout, monospace fonts for scores, backdrop-filter on overlays.
- **`game.js`** — All game logic (~300 lines, single-file, no modules).

### game.js internals

**State model:** Global mutable variables (`board`, `current`, `next`, `score`, `lines`, `level`, etc.) reset in `init()`. The board is a `ROWS×COLS` (20×10) 2D array where 0 = empty and 1–7 = piece color index.

**Pieces:** Defined as square matrices in `PIECES[1..7]`, where nonzero values encode the color index. Rotation uses transpose + row-reverse (`rotateCW`). Wall kicks try offsets [0, -1, +1, -2, +2] before rejecting a rotation.

**Game loop:** `requestAnimationFrame`-based. Accumulates delta time; when `dropAccum >= dropInterval`, piece drops one row or locks. `dropInterval` decreases with level: `max(100, 1000 - (level-1) * 90)` ms.

**Rendering:** Canvas 2D API. Each block is drawn with 1px padding and a white highlight strip. Ghost piece renders at `globalAlpha = 0.2`.

**Scoring:** Classic system — `LINE_SCORES = [0, 100, 300, 500, 800]` × level. Hard drop: +2 per cell. Soft drop: +1 per cell. Level increments every 10 cleared lines.

### Key constraint

Canvas dimensions in `index.html` must match `COLS × BLOCK` and `ROWS × BLOCK` from `game.js`. Changing grid constants requires updating both files.
