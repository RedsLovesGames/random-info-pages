import React, { useEffect, useRef, useState } from 'react';
import CoreAppFrame from './CoreAppFrame';
import { recordReaction } from './logic/reaction';
import { loadLocal, saveLocal } from './logic/storage';

type Phase = 'idle' | 'waiting' | 'ready' | 'result' | 'false-start';
const STORAGE_KEY = 'rip.core.reaction.history';

const ReactionTest: React.FC<WindowAppProps> = (props) => {
    const [phase, setPhase] = useState<Phase>('idle');
    const [history, setHistory] = useState<number[]>(() => loadLocal(STORAGE_KEY, []));
    const [last, setLast] = useState<number | null>(null);
    const readyAt = useRef(0);
    const timer = useRef<number | null>(null);

    useEffect(() => () => {
        if (timer.current !== null) window.clearTimeout(timer.current);
    }, []);

    useEffect(() => {
        saveLocal(STORAGE_KEY, history);
    }, [history]);

    const start = () => {
        if (timer.current !== null) window.clearTimeout(timer.current);
        setLast(null);
        setPhase('waiting');
        const delay = 900 + Math.floor(Math.random() * 2100);
        timer.current = window.setTimeout(() => {
            readyAt.current = performance.now();
            setPhase('ready');
            timer.current = null;
        }, delay);
    };

    const react = () => {
        if (phase === 'waiting') {
            if (timer.current !== null) window.clearTimeout(timer.current);
            timer.current = null;
            setPhase('false-start');
            return;
        }
        if (phase !== 'ready') return;
        const value = Math.max(1, Math.round(performance.now() - readyAt.current));
        const next = recordReaction(history, value, 5);
        setHistory(next);
        setLast(value);
        setPhase('result');
    };

    const best = history.length ? Math.min(...history) : null;
    const prompt = phase === 'waiting'
        ? 'Wait for green...'
        : phase === 'ready'
        ? 'CLICK NOW!'
        : phase === 'false-start'
        ? 'Too soon.'
        : phase === 'result' && last !== null
        ? `${last} ms`
        : 'Test reaction speed';

    return (
        <CoreAppFrame {...props} title="Reaction Test" width={560} height={450} status={best ? `Best: ${best} ms` : 'No attempts yet'}>
            <div style={styles.body}>
                <button
                    type="button"
                    onClick={react}
                    disabled={phase === 'idle' || phase === 'result' || phase === 'false-start'}
                    style={Object.assign({}, styles.testArea, phase === 'ready' && styles.ready, phase === 'waiting' && styles.waiting)}
                >
                    <strong style={styles.prompt}>{prompt}</strong>
                    <span>{phase === 'waiting' ? 'Clicking now is a false start.' : phase === 'ready' ? 'React as fast as possible.' : 'Press Start when ready.'}</span>
                </button>
                <div style={styles.controls}>
                    <button type="button" onClick={start} style={styles.button}>{phase === 'idle' ? 'Start' : 'Try Again'}</button>
                    <span>Best: {best === null ? '—' : `${best} ms`}</span>
                </div>
                <div style={styles.history}>
                    <strong>Recent:</strong> {history.length ? history.map((value) => `${value} ms`).join(' • ') : 'none'}
                </div>
            </div>
        </CoreAppFrame>
    );
};

const styles: StyleSheetCSS = {
    body: { display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column', gap: 8, padding: 10 },
    testArea: {
        display: 'flex', flex: 1, minHeight: 180, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
        borderTop: '2px solid #404040', borderLeft: '2px solid #404040', borderRight: '2px solid #ffffff', borderBottom: '2px solid #ffffff',
        backgroundColor: '#d7d7d7', color: '#000000', fontFamily: 'MSSerif', cursor: 'pointer',
    },
    waiting: { backgroundColor: '#b54b4b', color: '#ffffff' },
    ready: { backgroundColor: '#28a745', color: '#ffffff' },
    prompt: { fontSize: 28 },
    controls: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 11 },
    button: {
        padding: '5px 14px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #404040', borderBottom: '2px solid #404040',
        backgroundColor: '#c0c0c0', fontFamily: 'MSSerif', cursor: 'pointer',
    },
    history: { padding: 6, backgroundColor: '#ffffff', border: '1px inset #808080', fontSize: 10, lineHeight: '14px' },
};

export default ReactionTest;
