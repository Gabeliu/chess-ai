# Quiet Knight

A polished chess game with a fully local Stockfish AI opponent. It needs no API key, backend, account, or paid service.

## Play

[Play Quiet Knight](https://gabeliu.github.io/chess-ai/)

## Features

- Local Stockfish 18 WebAssembly AI with three difficulty levels
- Built-in Local AI fallback when Stockfish is unavailable
- Play as White, Black, or a randomly selected side against the AI
- 1+0, 3+2, 10+0, and unlimited time controls
- Beginner-friendly rules guide covering pieces, special moves, and endings
- Interface translations for English, Spanish, French, Chinese, and Hindi
- Private invite links for playing on two devices through a free secure relay
- Local Stockfish game review with move labels and an evaluation graph
- Three board palettes and three bundled Staunton piece sets
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

The bundled Cburnett, Merida, and Alpha piece artwork comes from the open-source [Lichess](https://github.com/lichess-org/lila/tree/master/public/piece) project. Online rooms use the MIT-licensed [MQTT.js](https://github.com/mqttjs/MQTT.js) browser library and the free public EMQX broker, with long random room IDs acting as private invitation secrets.

## Stockfish

This project bundles the lite single-threaded WebAssembly build and ASM fallback from [Stockfish.js 18.0.8](https://github.com/nmrugg/stockfish.js/tree/6a2a60eb3e3cd20bc1d6ad2f32f592c35233511c), licensed under GPL-3.0. The upstream license and package README are included in `assets/stockfish` alongside the unmodified engine files.

## License

MIT
