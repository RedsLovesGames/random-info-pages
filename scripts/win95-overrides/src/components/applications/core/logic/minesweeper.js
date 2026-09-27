function neighbors(index, rows, cols) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const result = [];
    for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
            if (dr === 0 && dc === 0) continue;
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < rows && c >= 0 && c < cols) {
                result.push(r * cols + c);
            }
        }
    }
    return result;
}

export function createBoard(rows, cols, mineCount, safeIndex, random = Math.random) {
    const size = rows * cols;
    const candidates = Array.from({ length: size }, (_value, index) => index).filter(
        (index) => index !== safeIndex
    );
    for (let i = candidates.length - 1; i > 0; i -= 1) {
        const j = Math.max(0, Math.min(i, Math.floor(random() * (i + 1))));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const mines = new Set(candidates.slice(0, Math.min(mineCount, candidates.length)));
    return Array.from({ length: size }, (_value, index) => ({
        mine: mines.has(index),
        adjacent: neighbors(index, rows, cols).filter((n) => mines.has(n)).length,
        revealed: false,
        flagged: false,
    }));
}

export function toggleFlag(board, index) {
    if (!board[index] || board[index].revealed) return board;
    return board.map((cell, i) =>
        i === index ? { ...cell, flagged: !cell.flagged } : cell
    );
}

export function revealCell(board, index, rows, cols) {
    if (!board[index] || board[index].flagged || board[index].revealed) return board;
    const next = board.map((cell) => ({ ...cell }));
    const queue = [index];
    const seen = new Set();
    while (queue.length) {
        const current = queue.shift();
        if (current === undefined || seen.has(current)) continue;
        seen.add(current);
        const cell = next[current];
        if (!cell || cell.flagged) continue;
        cell.revealed = true;
        if (!cell.mine && cell.adjacent === 0) {
            neighbors(current, rows, cols).forEach((neighbor) => {
                if (!seen.has(neighbor) && !next[neighbor].mine) queue.push(neighbor);
            });
        }
    }
    return next;
}

export function revealAllMines(board) {
    return board.map((cell) => (cell.mine ? { ...cell, revealed: true } : cell));
}

export function hasWon(board) {
    return board.length > 0 && board.every((cell) => cell.mine || cell.revealed);
}
