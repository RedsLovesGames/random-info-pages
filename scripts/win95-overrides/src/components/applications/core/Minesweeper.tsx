import React, { useEffect, useMemo, useState } from 'react';
import CoreAppFrame from './CoreAppFrame';
import { createBoard, hasWon, revealAllMines, revealCell, toggleFlag } from './logic/minesweeper';
import { loadLocal, saveLocal } from './logic/storage';

type Status = 'idle' | 'playing' | 'won' | 'lost';
type Cell = { mine: boolean; adjacent: number; revealed: boolean; flagged: boolean };
const ROWS = 9;
const COLS = 9;
const MINES = 10;
const STORAGE_KEY = 'rip.core.minesweeper.best';

const emptyBoard = (): Cell[] => Array.from({ length: ROWS * COLS }, () => ({
    mine: false, adjacent: 0, revealed: false, flagged: false,
}));

const Minesweeper: React.FC<WindowAppProps> = (props) => {
    const [board, setBoard] = useState<Cell[]>(emptyBoard);
    const [status, setStatus] = useState<Status>('idle');
    const [seconds, setSeconds] = useState(0);
    const [best, setBest] = useState<number | null>(() => loadLocal(STORAGE_KEY, null));

    useEffect(() => {
        if (status !== 'playing') return undefined;
        const timer = window.setInterval(() => setSeconds((value) => Math.min(999, value + 1)), 1000);
        return () => window.clearInterval(timer);
    }, [status]);

    const reset = () => {
        setBoard(emptyBoard());
        setStatus('idle');
        setSeconds(0);
    };

    const finishWin = (next: Cell[]) => {
        setBoard(next);
        setStatus('won');
        if (best === null || seconds < best) {
            setBest(seconds);
            saveLocal(STORAGE_KEY, seconds);
        }
    };

    const reveal = (index: number) => {
        if (status === 'won' || status === 'lost' || board[index].flagged) return;
        if (status === 'idle') {
            const generated = createBoard(ROWS, COLS, MINES, index) as Cell[];
            const next = revealCell(generated, index, ROWS, COLS) as Cell[];
            setBoard(next);
            setStatus(hasWon(next) ? 'won' : 'playing');
            return;
        }
        if (board[index].mine) {
            setBoard(revealAllMines(board) as Cell[]);
            setStatus('lost');
            return;
        }
        const next = revealCell(board, index, ROWS, COLS) as Cell[];
        if (hasWon(next)) finishWin(next);
        else setBoard(next);
    };

    const flag = (event: React.MouseEvent, index: number) => {
        event.preventDefault();
        if (status !== 'playing') return;
        setBoard(toggleFlag(board, index) as Cell[]);
    };

    const flags = useMemo(() => board.filter((cell) => cell.flagged).length, [board]);
    const face = status === 'lost' ? '☹' : status === 'won' ? '😎' : '🙂';

    return (
        <CoreAppFrame {...props} title="Minesweeper" width={410} height={505} status={status === 'idle' ? 'Click any square to begin' : `${status} • Best ${best === null ? '—' : `${best}s`}`}>
            <div style={styles.body}>
                <div style={styles.counterBar}>
                    <span style={styles.counter}>{String(Math.max(0, MINES - flags)).padStart(3, '0')}</span>
                    <button type="button" onClick={reset} aria-label="Reset Minesweeper" style={styles.face}>{face}</button>
                    <span style={styles.counter}>{String(seconds).padStart(3, '0')}</span>
                </div>
                <div style={styles.board} aria-label="Minesweeper board">
                    {board.map((cell, index) => (
                        <button
                            type="button"
                            key={index}
                            aria-label={`Cell ${index + 1}${cell.flagged ? ' flagged' : ''}`}
                            onClick={() => reveal(index)}
                            onContextMenu={(event) => flag(event, index)}
                            style={Object.assign({}, styles.cell, cell.revealed && styles.revealed)}
                        >
                            {cell.flagged && !cell.revealed ? '⚑' : cell.revealed && cell.mine ? '✹' : cell.revealed && cell.adjacent ? cell.adjacent : ''}
                        </button>
                    ))}
                </div>
                <div style={styles.help}>Left click reveals. Right click flags. First click is always safe.</div>
            </div>
        </CoreAppFrame>
    );
};

const styles: StyleSheetCSS = {
    body: { display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', gap: 10, padding: 10, overflow: 'auto' },
    counterBar: {
        display: 'flex', width: 304, alignItems: 'center', justifyContent: 'space-between', padding: 6, boxSizing: 'border-box',
        borderTop: '2px solid #808080', borderLeft: '2px solid #808080', borderRight: '2px solid #ffffff', borderBottom: '2px solid #ffffff',
    },
    counter: { minWidth: 48, padding: '3px 5px', backgroundColor: '#000000', color: '#ff2020', fontFamily: 'monospace', fontSize: 22, textAlign: 'center' },
    face: { width: 38, height: 34, backgroundColor: '#c0c0c0', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #404040', borderBottom: '2px solid #404040', fontSize: 18, cursor: 'pointer' },
    board: { display: 'grid', gridTemplateColumns: 'repeat(9, 32px)', gridAutoRows: '32px', border: '3px inset #ffffff' },
    cell: { width: 32, height: 32, padding: 0, backgroundColor: '#c0c0c0', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #606060', borderBottom: '2px solid #606060', color: '#000080', fontFamily: 'monospace', fontWeight: 700, cursor: 'pointer' },
    revealed: { border: '1px solid #808080', backgroundColor: '#c0c0c0' },
    help: { fontSize: 9, color: '#404040', textAlign: 'center' },
};

export default Minesweeper;
