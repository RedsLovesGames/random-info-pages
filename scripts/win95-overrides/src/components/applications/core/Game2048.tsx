import React, { useState } from 'react';
import CoreAppFrame from './CoreAppFrame';
import { addRandomTile, canMove, moveBoard } from './logic/game2048';
import { loadLocal, saveLocal } from './logic/storage';

const STORAGE_KEY = 'rip.core.2048.best';

const newBoard = (): number[] => addRandomTile(addRandomTile(Array(16).fill(0)));

const Game2048: React.FC<WindowAppProps> = (props) => {
    const [board, setBoard] = useState<number[]>(newBoard);
    const [score, setScore] = useState(0);
    const [best, setBest] = useState<number>(() => loadLocal(STORAGE_KEY, 0));

    const restart = () => {
        setBoard(newBoard());
        setScore(0);
    };

    const move = (direction: string) => {
        const result = moveBoard(board, direction);
        if (!result.changed) return;
        const nextScore = score + result.scoreDelta;
        const nextBest = Math.max(best, nextScore);
        if (nextBest !== best) {
            setBest(nextBest);
            saveLocal(STORAGE_KEY, nextBest);
        }
        setScore(nextScore);
        setBoard(addRandomTile(result.board));
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
        const directions: { [key: string]: string } = {
            ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        };
        const direction = directions[event.key];
        if (!direction) return;
        move(direction);
        event.preventDefault();
    };

    const won = board.some((value) => value >= 2048);
    const gameOver = !canMove(board);

    return (
        <CoreAppFrame
            {...props}
            title="2048"
            width={470}
            height={545}
            status={`Score ${score} • Best ${best}${won ? ' • 2048 reached!' : gameOver ? ' • Game over' : ''}`}
            onKeyDown={onKeyDown}
        >
            <div style={styles.body}>
                <div style={styles.toolbar}>
                    <div><strong>2048</strong><div style={styles.subtitle}>Use the arrow keys to merge equal tiles.</div></div>
                    <div style={styles.scores}><span>Score<br/><b>{score}</b></span><span>Best<br/><b>{best}</b></span></div>
                    <button type="button" onClick={restart} style={styles.button}>New Game</button>
                </div>
                <div style={styles.board} aria-label="2048 board">
                    {board.map((value, index) => (
                        <div
                            key={index}
                            style={Object.assign({}, styles.tile, value && styles.filled, value >= 128 && styles.strong)}
                            aria-label={`Tile ${index + 1}: ${value || 'empty'}`}
                        >
                            {value || ''}
                        </div>
                    ))}
                </div>
                <div style={styles.message}>{won ? '2048 reached. Keep going if desired.' : gameOver ? 'No moves remain. Start a new game.' : 'Click inside the window, then use the arrow keys.'}</div>
            </div>
        </CoreAppFrame>
    );
};

const styles: StyleSheetCSS = {
    body: { display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', gap: 12, padding: 12, overflow: 'auto' },
    toolbar: { display: 'flex', width: 360, alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12 },
    subtitle: { marginTop: 3, maxWidth: 120, fontSize: 9, lineHeight: '12px', color: '#404040' },
    scores: { display: 'flex', gap: 4, textAlign: 'center', fontSize: 9 },
    button: { padding: '5px 9px', backgroundColor: '#c0c0c0', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #404040', borderBottom: '2px solid #404040', fontFamily: 'MSSerif', cursor: 'pointer' },
    board: { display: 'grid', gridTemplateColumns: 'repeat(4, 82px)', gridAutoRows: '82px', gap: 6, padding: 8, backgroundColor: '#9e958c', border: '2px inset #ffffff' },
    tile: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 82, height: 82, boxSizing: 'border-box', backgroundColor: '#c8c1b7', color: '#4a423b', fontFamily: 'Arial, sans-serif', fontSize: 27, fontWeight: 700 },
    filled: { backgroundColor: '#eee4da', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #8c8279', borderBottom: '2px solid #8c8279' },
    strong: { backgroundColor: '#edc96b', color: '#ffffff' },
    message: { minHeight: 14, fontSize: 9, color: '#404040', textAlign: 'center' },
};

export default Game2048;
