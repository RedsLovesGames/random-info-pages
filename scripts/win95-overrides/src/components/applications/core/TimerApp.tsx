import React, { useEffect, useRef, useState } from 'react';
import CoreAppFrame from './CoreAppFrame';
import { formatDuration } from './logic/timer';

const TimerApp: React.FC<WindowAppProps> = (props) => {
    const [mode, setMode] = useState<'stopwatch' | 'timer'>('stopwatch');
    const [running, setRunning] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [minutes, setMinutes] = useState(5);
    const [seconds, setSeconds] = useState(0);
    const [remaining, setRemaining] = useState(300000);
    const anchorRef = useRef(0);

    const configured = Math.max(0, minutes * 60 + seconds) * 1000;

    useEffect(() => {
        if (!running && mode === 'timer') setRemaining(configured);
    }, [configured, mode, running]);

    useEffect(() => {
        if (!running) return;
        const tick = () => {
            if (mode === 'stopwatch') {
                setElapsed(Date.now() - anchorRef.current);
            } else {
                const next = Math.max(0, anchorRef.current - Date.now());
                setRemaining(next);
                if (next <= 0) setRunning(false);
            }
        };
        tick();
        const interval = window.setInterval(tick, 100);
        return () => window.clearInterval(interval);
    }, [mode, running]);

    const startPause = () => {
        if (running) {
            setRunning(false);
            return;
        }
        if (mode === 'stopwatch') anchorRef.current = Date.now() - elapsed;
        else {
            const base = remaining > 0 ? remaining : configured;
            if (base <= 0) return;
            setRemaining(base);
            anchorRef.current = Date.now() + base;
        }
        setRunning(true);
    };

    const reset = () => {
        setRunning(false);
        if (mode === 'stopwatch') setElapsed(0);
        else setRemaining(configured);
    };

    const switchMode = (next: 'stopwatch' | 'timer') => {
        setRunning(false);
        setMode(next);
        if (next === 'stopwatch') setElapsed(0);
        else setRemaining(configured);
    };

    const display = mode === 'stopwatch' ? formatDuration(elapsed) : formatDuration(remaining);

    return (
        <CoreAppFrame {...props} title="Timer / Stopwatch" width={460} height={410} status={running ? 'Running' : 'Paused'}>
            <div style={styles.tabs}>
                <button type="button" onClick={() => switchMode('stopwatch')} style={Object.assign({}, styles.tab, mode === 'stopwatch' && styles.activeTab)}>Stopwatch</button>
                <button type="button" onClick={() => switchMode('timer')} style={Object.assign({}, styles.tab, mode === 'timer' && styles.activeTab)}>Timer</button>
            </div>
            <div style={styles.body}>
                {mode === 'timer' && (
                    <div style={styles.inputs}>
                        <label>Minutes <input aria-label="Timer minutes" type="number" min="0" max="999" value={minutes} disabled={running} onChange={(event) => setMinutes(Math.max(0, Number(event.target.value) || 0))} style={styles.input} /></label>
                        <label>Seconds <input aria-label="Timer seconds" type="number" min="0" max="59" value={seconds} disabled={running} onChange={(event) => setSeconds(Math.min(59, Math.max(0, Number(event.target.value) || 0)))} style={styles.input} /></label>
                    </div>
                )}
                <output aria-label="Timer display" style={styles.display}>{display}</output>
                <div style={styles.controls}>
                    <button type="button" onClick={startPause} style={styles.button}>{running ? 'Pause' : 'Start'}</button>
                    <button type="button" onClick={reset} style={styles.button}>Reset</button>
                </div>
            </div>
        </CoreAppFrame>
    );
};

const styles: StyleSheetCSS = {
    tabs: { display: 'flex', gap: 3, padding: '6px 7px 0' },
    tab: { padding: '5px 10px', borderTop: '2px solid #fff', borderLeft: '2px solid #fff', borderRight: '2px solid #404040', borderBottom: '2px solid #404040', backgroundColor: '#b7b7b7', fontFamily: 'MSSerif', cursor: 'pointer' },
    activeTab: { backgroundColor: '#e0e0e0', fontWeight: 'bold' },
    body: { display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 16 },
    inputs: { display: 'flex', gap: 14, fontSize: 11 },
    input: { width: 58, marginLeft: 5, padding: 3, borderTop: '2px solid #404040', borderLeft: '2px solid #404040', borderRight: '2px solid #fff', borderBottom: '2px solid #fff' },
    display: { minWidth: 285, padding: '14px 18px', boxSizing: 'border-box', backgroundColor: '#101810', color: '#5cff64', borderTop: '3px solid #404040', borderLeft: '3px solid #404040', borderRight: '3px solid #fff', borderBottom: '3px solid #fff', fontFamily: 'monospace', fontSize: 36, textAlign: 'center', letterSpacing: 2 },
    controls: { display: 'flex', gap: 10 },
    button: { minWidth: 90, padding: '7px 12px', borderTop: '2px solid #fff', borderLeft: '2px solid #fff', borderRight: '2px solid #404040', borderBottom: '2px solid #404040', backgroundColor: '#c0c0c0', fontFamily: 'MSSerif', cursor: 'pointer' },
};

export default TimerApp;
