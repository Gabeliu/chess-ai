# Quiet Knight

A polished, dependency-free chess game with a fully local AI opponent. It needs no API key, backend, account, or paid service.

## Play

[Play Quiet Knight](https://gabeliu.github.io/chess-ai/)

## Features

- Local minimax AI with three difficulty levels
- Play as White, Black, or a randomly selected side against the AI
- 1+0, 3+2, 10+0, and unlimited time controls
- Complete legal move validation
- Castling, en passant, and promotion
- Check, checkmate, stalemate, repetition, fifty-move, and insufficient-material detection
- Undo, board flip, captures, and algebraic move history
- Separate win and loss audio for AI and two-player games
- A single-pulse warning alarm when a move puts the king in check
- Responsive desktop and mobile layout
- No dependencies, build step, cookies, analytics, or network requests

## Technology

Vanilla HTML, CSS, and JavaScript. The AI evaluates positions directly in the browser using minimax with alpha-beta pruning.

## License

MIT
