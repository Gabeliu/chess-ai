# Quiet Knight

A polished chess game with a fully local Stockfish AI opponent. It needs no API key, backend, account, or paid service.

## Play

[Play Quiet Knight](https://gabeliu.github.io/chess-ai/)

## Features

- Local Stockfish 18 WebAssembly AI with three difficulty levels
- Play as White, Black, or a randomly selected side against the AI
- 1+0, 3+2, 10+0, and unlimited time controls
- Complete legal move validation
- Castling, en passant, and promotion
- Check, checkmate, stalemate, repetition, fifty-move, and insufficient-material detection
- Undo, board flip, captures, and algebraic move history
- Separate win and loss audio for AI and two-player games
- A single-pulse warning alarm when a move puts the king in check
- Responsive desktop and mobile layout
- No build step, cookies, analytics, API calls, or external runtime requests

## Technology

Vanilla HTML, CSS, and JavaScript. Stockfish runs entirely in a browser Web Worker using WebAssembly.

## Stockfish

This project bundles the lite single-threaded build from [Stockfish.js 18.0.8](https://github.com/nmrugg/stockfish.js/tree/6a2a60eb3e3cd20bc1d6ad2f32f592c35233511c), licensed under GPL-3.0. The upstream license and package README are included in `assets/stockfish` alongside the unmodified engine files.

## License

MIT
