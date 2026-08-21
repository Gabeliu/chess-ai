# Quiet Knight

A polished, dependency-free chess game with a fully local AI opponent. It needs no API key, backend, account, or paid service.

## Play

Open `index.html` in a modern browser. Choose **Vs AI** or **Two players**, then click a piece and a highlighted destination square.

## Features

- Local minimax AI with three difficulty levels
- Complete legal move validation
- Castling, en passant, and promotion
- Check, checkmate, stalemate, repetition, fifty-move, and insufficient-material detection
- Undo, board flip, captures, and algebraic move history
- Responsive desktop and mobile layout
- No dependencies, build step, cookies, analytics, or network requests

## Technology

Vanilla HTML, CSS, and JavaScript. The AI evaluates positions directly in the browser using minimax with alpha-beta pruning.

## License

MIT
