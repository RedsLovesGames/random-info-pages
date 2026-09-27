export function stepSnake(snake, direction, food, width, height) {
    if (!Array.isArray(snake) || snake.length === 0) {
        return { snake: [], ateFood: false, collision: true };
    }
    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y,
    };
    const outside = head.x < 0 || head.y < 0 || head.x >= width || head.y >= height;
    if (outside) return { snake, ateFood: false, collision: true };

    const ateFood = Boolean(food && head.x === food.x && head.y === food.y);
    const collisionBody = ateFood ? snake : snake.slice(0, -1);
    const selfHit = collisionBody.some((segment) => segment.x === head.x && segment.y === head.y);
    if (selfHit) return { snake, ateFood: false, collision: true };

    const next = [head, ...(ateFood ? snake : snake.slice(0, -1))];
    return { snake: next, ateFood, collision: false };
}

export function randomFood(snake, width, height, random = Math.random) {
    const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
    const open = [];
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            if (!occupied.has(`${x},${y}`)) open.push({ x, y });
        }
    }
    if (!open.length) return null;
    return open[Math.min(open.length - 1, Math.floor(random() * open.length))];
}
