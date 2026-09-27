import React, { useEffect, useMemo, useRef, useState } from 'react';
import CoreAppFrame from './CoreAppFrame';
import { randomFood, stepSnake } from './logic/snake';
import { loadLocal, saveLocal } from './logic/storage';

type Point = { x: number; y: number };
const SIZE = 16;
const STORAGE_KEY = 'rip.core.snake.high';
const INITIAL_SNAKE: Point[] = [{ x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }];

const Snake: React.FC<WindowAppProps> = (props) => {
    const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
    const [food, setFood] = useState<Point | null>(() => randomFood(INITIAL_SNAKE, SIZE, SIZE));
    const [running, setRunning] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState<number>(() => loadLocal(STORAGE_KEY, 0));
    const direction = useRef<Point>({ x: 1, y: 0 });

    useEffect(() => {
        if (!running || gameOver) return undefined;
        const timer = window.setInterval(() => {
            setSnake((current) => {
                const result = stepSnake(current, direction.current, food, SIZE, SIZE);
                if (result.collision) {
                    setRunning(false);
                    setGameOver(true);
                    return current;
                }
                if (result.ateFood) {
                    setScore((value) => {
                        const next = value + 1;
                        if (next > highScore) {
                            setHighScore(next);
                            saveLocal(STORAGE_KEY, next);
                        }
                        return next;
                    });
                    setFood(randomFood(result.snake, SIZE, SIZE));
                }
                return result.snake;
            });
        }, 120);
        return () => window.clearInterval(timer);
    }, [food, gameOver, highScore, running]);

    const restart = () => {
        direction.current = { x: 1, y: 0 };
        setSnake(INITIAL_SNAKE);
        setFood(randomFood(INITIAL_SNAKE, SIZE, SIZE));
        setScore(0);
        setGameOver(false);
        setRunning(false);
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
        const key = event.key.toLowerCase();
        const choices: { [key: string]: Point } = {
            arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 },
            arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
            arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
            arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 },
        };
        if (key === ' ') {
            setRunning((value) => !value && !gameOver);
            event.preventDefault();
            return;
        }
        const next = choices[key];
        if (!next) return;
        if (next.x !== -direction.current.x || next.y !== -direction.current.y) {
            direction.current = next;
            if (!gameOver) setRunning(true);
        }
        event.preventDefault();
    };

    const occupied = useMemo(() => new Set(snake.map((segment) => `${segment.x},${segment.y}`)), [snake]);

    return (
        <CoreAppFrame
            {...props}
            title="Snake"
            width={430}
            height={485}
            status={`Score ${score} • High ${highScore}${gameOver ? ' • Game over' : running ? ' • Running' : ' • Paused'}`}
            onKeyDown={onKeyDown}
            onBlur={() => setRunning(false)}
        >
            <div style={styles.body}>
                <div style={styles.toolbar}>
                    <button type="button" onClick={() => !gameOver && setRunning((value) => !value)} style={styles.button}>{running ? 'Pause' : 'Start'}</button>
                    <button type="button" onClick={restart} style={styles.button}>Restart</button>
                    <span>Score: {score}</span><span>High: {highScore}</span>
                </div>
                <div style={styles.board} aria-label="Snake board">
                    {Array.from({ length: SIZE * SIZE }, (_value, index) => {
                        const x = index % SIZE;
                        const y = Math.floor(index / SIZE);
                        const isSnake = occupied.has(`${x},${y}`);
                        const isHead = snake[0]?.x === x && snake[0]?.y === y;
                        const isFood = food?.x === x && food?.y === y;
                        return <div key={index} style={Object.assign({}, styles.cell, isSnake && styles.snake, isHead && styles.head, isFood && styles.food)} />;
                    })}
                </div>
                <div style={styles.help}>{gameOver ? 'Game over. Restart to play again.' : 'Click the board, then use Arrow keys or WASD. Space toggles pause.'}</div>
            </div>
        </CoreAppFrame>
    );
};

const styles: StyleSheetCSS = {
    body: { display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column', alignItems: 'center', gap: 9, padding: 9, overflow: 'auto' },
    toolbar: { display: 'flex', width: 304, alignItems: 'center', justifyContent: 'space-between', gap: 6, fontSize: 10 },
    button: { padding: '4px 8px', backgroundColor: '#c0c0c0', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #404040', borderBottom: '2px solid #404040', fontFamily: 'MSSerif', cursor: 'pointer' },
    board: { display: 'grid', gridTemplateColumns: 'repeat(16, 18px)', gridAutoRows: '18px', padding: 3, backgroundColor: '#151515', border: '3px inset #ffffff' },
    cell: { width: 18, height: 18, boxSizing: 'border-box', border: '1px solid #202020', backgroundColor: '#0b0b0b' },
    snake: { backgroundColor: '#55bb55', border: '1px solid #358535' },
    head: { backgroundColor: '#98ef73' },
    food: { backgroundColor: '#e14b4b', borderRadius: '50%' },
    help: { fontSize: 9, color: '#404040', textAlign: 'center' },
};

export default Snake;
