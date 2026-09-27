export function createSandGrid(width, height) {
    return Array.from({ length: height }, () => Array(width).fill(0));
}

export function stepSand(grid, random = Math.random) {
    const next = grid.map((row) => row.slice());
    const height = next.length;
    const width = height ? next[0].length : 0;

    for (let y = height - 2; y >= 0; y -= 1) {
        const leftToRight = random() < 0.5;
        for (let offset = 0; offset < width; offset += 1) {
            const x = leftToRight ? offset : width - 1 - offset;
            if (next[y][x] !== 1) continue;
            if (next[y + 1][x] === 0) {
                next[y][x] = 0;
                next[y + 1][x] = 1;
                continue;
            }
            const directions = random() < 0.5 ? [-1, 1] : [1, -1];
            for (const direction of directions) {
                const targetX = x + direction;
                if (targetX >= 0 && targetX < width && next[y + 1][targetX] === 0) {
                    next[y][x] = 0;
                    next[y + 1][targetX] = 1;
                    break;
                }
            }
        }
    }
    return next;
}
