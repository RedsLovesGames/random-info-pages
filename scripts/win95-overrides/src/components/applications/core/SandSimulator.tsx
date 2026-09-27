import React, { useEffect, useRef, useState } from 'react';
import CoreAppFrame from './CoreAppFrame';
import { createSandGrid, stepSand } from './logic/sand';

const GRID_WIDTH = 80;
const GRID_HEIGHT = 58;

const SandSimulator: React.FC<WindowAppProps> = (props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gridRef = useRef(createSandGrid(GRID_WIDTH, GRID_HEIGHT));
    const [running, setRunning] = useState(true);
    const [brush, setBrush] = useState(2);

    const render = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        context.fillStyle = '#172126';
        context.fillRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
        context.fillStyle = '#e4bd51';
        gridRef.current.forEach((row, y) => row.forEach((cell, x) => {
            if (cell === 1) context.fillRect(x, y, 1, 1);
        }));
    };

    useEffect(() => {
        render();
        if (!running) return;
        const interval = window.setInterval(() => {
            gridRef.current = stepSand(gridRef.current);
            render();
        }, 35);
        return () => window.clearInterval(interval);
    }, [running]);

    const addSand = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (event.buttons === 0 && event.type !== 'pointerdown') return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = Math.floor(((event.clientX - rect.left) / rect.width) * GRID_WIDTH);
        const y = Math.floor(((event.clientY - rect.top) / rect.height) * GRID_HEIGHT);
        for (let dy = -brush; dy <= brush; dy += 1) {
            for (let dx = -brush; dx <= brush; dx += 1) {
                if (dx * dx + dy * dy > brush * brush) continue;
                const px = x + dx;
                const py = y + dy;
                if (py >= 0 && py < GRID_HEIGHT && px >= 0 && px < GRID_WIDTH) gridRef.current[py][px] = 1;
            }
        }
        render();
    };

    const clear = () => {
        gridRef.current = createSandGrid(GRID_WIDTH, GRID_HEIGHT);
        render();
    };

    return (
        <CoreAppFrame {...props} title="Sand Simulator" width={760} height={610} status="Draw sand with the mouse or touch">
            <div style={styles.toolbar}>
                <button type="button" onClick={() => setRunning((value) => !value)} style={styles.button}>{running ? 'Pause' : 'Run'}</button>
                <button type="button" onClick={clear} style={styles.button}>Clear</button>
                <label style={styles.label}>Brush <input aria-label="Sand brush size" type="range" min="1" max="5" value={brush} onChange={(event) => setBrush(Number(event.target.value))} /></label>
            </div>
            <div style={styles.stage}>
                <canvas
                    ref={canvasRef}
                    aria-label="Sand simulation canvas"
                    width={GRID_WIDTH}
                    height={GRID_HEIGHT}
                    onPointerDown={addSand}
                    onPointerMove={addSand}
                    style={styles.canvas}
                />
            </div>
        </CoreAppFrame>
    );
};

const styles: StyleSheetCSS = {
    toolbar: { minHeight: 36, display: 'flex', alignItems: 'center', gap: 8, padding: '4px 7px', borderBottom: '1px solid #808080' },
    button: { padding: '4px 10px', borderTop: '2px solid #fff', borderLeft: '2px solid #fff', borderRight: '2px solid #404040', borderBottom: '2px solid #404040', backgroundColor: '#c0c0c0', fontFamily: 'MSSerif', cursor: 'pointer' },
    label: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 10 },
    stage: { display: 'flex', flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: '#303b3e' },
    canvas: { width: '100%', height: '100%', maxWidth: 690, maxHeight: 500, imageRendering: 'pixelated', borderTop: '3px solid #202020', borderLeft: '3px solid #202020', borderRight: '3px solid #efefef', borderBottom: '3px solid #efefef', touchAction: 'none', cursor: 'crosshair' },
};

export default SandSimulator;
