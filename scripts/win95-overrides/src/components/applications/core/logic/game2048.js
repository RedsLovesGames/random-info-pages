function mergeLine(line) {
    const compact = line.filter((value) => value !== 0);
    const merged = [];
    let scoreDelta = 0;
    for (let i = 0; i < compact.length; i += 1) {
        if (compact[i] === compact[i + 1]) {
            const value = compact[i] * 2;
            merged.push(value);
            scoreDelta += value;
            i += 1;
        } else {
            merged.push(compact[i]);
        }
    }
    while (merged.length < 4) merged.push(0);
    return { line: merged, scoreDelta };
}

function reverse(line) {
    return [...line].reverse();
}

export function moveBoard(board, direction) {
    const next = Array(16).fill(0);
    let scoreDelta = 0;

    for (let outer = 0; outer < 4; outer += 1) {
        let line;
        if (direction === 'left' || direction === 'right') {
            line = board.slice(outer * 4, outer * 4 + 4);
        } else {
            line = [board[outer], board[outer + 4], board[outer + 8], board[outer + 12]];
        }
        if (direction === 'right' || direction === 'down') line = reverse(line);
        const result = mergeLine(line);
        scoreDelta += result.scoreDelta;
        let output = result.line;
        if (direction === 'right' || direction === 'down') output = reverse(output);

        for (let inner = 0; inner < 4; inner += 1) {
            if (direction === 'left' || direction === 'right') {
                next[outer * 4 + inner] = output[inner];
            } else {
                next[inner * 4 + outer] = output[inner];
            }
        }
    }

    const changed = next.some((value, index) => value !== board[index]);
    return { board: next, scoreDelta, changed };
}

export function addRandomTile(board, random = Math.random) {
    const empty = board.map((value, index) => (value === 0 ? index : -1)).filter((index) => index >= 0);
    if (!empty.length) return [...board];
    const spot = empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))];
    const next = [...board];
    next[spot] = random() < 0.9 ? 2 : 4;
    return next;
}

export function canMove(board) {
    if (board.some((value) => value === 0)) return true;
    for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 4; col += 1) {
            const index = row * 4 + col;
            if (col < 3 && board[index] === board[index + 1]) return true;
            if (row < 3 && board[index] === board[index + 4]) return true;
        }
    }
    return false;
}
