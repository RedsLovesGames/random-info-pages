export function createPixelGrid(size, color = '#ffffff') {
    return Array(Math.max(1, size) ** 2).fill(color);
}

export function setPixel(grid, index, color) {
    if (index < 0 || index >= grid.length) return grid.slice();
    const next = grid.slice();
    next[index] = color;
    return next;
}
