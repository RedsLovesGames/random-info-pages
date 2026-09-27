import React, { useEffect, useRef, useState } from 'react';
import CoreAppFrame from './CoreAppFrame';
import { createPixelGrid, setPixel } from './logic/pixel';
import { loadLocal, saveLocal } from './logic/storage';

const SIZE = 16;
const STORAGE_KEY = 'rip.core.pixel-editor';
const PALETTE = ['#000000', '#ffffff', '#e54848', '#4b78d1', '#49a75a', '#f2c84b', '#e55db2', '#52c7c7', '#f58b3b', '#777777'];

const PixelEditor: React.FC<WindowAppProps> = (props) => {
    const [pixels, setPixels] = useState<string[]>(() => {
        const stored = loadLocal(STORAGE_KEY, createPixelGrid(SIZE));
        return Array.isArray(stored) && stored.length === SIZE * SIZE ? stored : createPixelGrid(SIZE);
    });
    const [color, setColor] = useState('#000000');
    const painting = useRef(false);

    useEffect(() => saveLocal(STORAGE_KEY, pixels), [pixels]);
    useEffect(() => {
        const stop = () => { painting.current = false; };
        window.addEventListener('pointerup', stop);
        return () => window.removeEventListener('pointerup', stop);
    }, []);

    const paint = (index: number) => setPixels((current) => setPixel(current, index, color));

    const exportPng = () => {
        const canvas = document.createElement('canvas');
        const scale = 16;
        canvas.width = SIZE * scale;
        canvas.height = SIZE * scale;
        const context = canvas.getContext('2d');
        if (!context) return;
        pixels.forEach((pixel, index) => {
            context.fillStyle = pixel;
            context.fillRect((index % SIZE) * scale, Math.floor(index / SIZE) * scale, scale, scale);
        });
        const anchor = document.createElement('a');
        anchor.download = 'random-info-pixel-art.png';
        anchor.href = canvas.toDataURL('image/png');
        anchor.click();
    };

    return (
        <CoreAppFrame {...props} title="Pixel Editor" width={690} height={650} status="16×16 • autosaved locally">
            <div style={styles.toolbar}>
                {PALETTE.map((swatch) => (
                    <button key={swatch} type="button" aria-label={`Use ${swatch}`} onClick={() => setColor(swatch)} style={Object.assign({}, styles.swatch, { backgroundColor: swatch }, color === swatch && styles.selected)} />
                ))}
                <input aria-label="Custom pixel color" type="color" value={color} onChange={(event) => setColor(event.target.value)} style={styles.colorInput} />
                <button type="button" onClick={() => setPixels(createPixelGrid(SIZE))} style={styles.button}>Clear</button>
                <button type="button" onClick={exportPng} style={styles.button}>Export PNG</button>
            </div>
            <div style={styles.stage}>
                <div style={styles.grid} aria-label="Pixel editor grid">
                    {pixels.map((pixel, index) => (
                        <button
                            type="button"
                            aria-label={`Pixel ${index + 1}`}
                            key={index}
                            onPointerDown={(event) => { event.preventDefault(); painting.current = true; paint(index); }}
                            onPointerEnter={() => { if (painting.current) paint(index); }}
                            style={Object.assign({}, styles.pixel, { backgroundColor: pixel })}
                        />
                    ))}
                </div>
            </div>
        </CoreAppFrame>
    );
};

const styles: StyleSheetCSS = {
    toolbar: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, padding: 7, borderBottom: '1px solid #808080' },
    swatch: { width: 24, height: 24, padding: 0, border: '2px outset #fff', cursor: 'pointer' },
    selected: { outline: '2px solid #000080', outlineOffset: 1 },
    colorInput: { width: 31, height: 27, padding: 0, border: 0, background: 'transparent' },
    button: { padding: '4px 8px', borderTop: '2px solid #fff', borderLeft: '2px solid #fff', borderRight: '2px solid #404040', borderBottom: '2px solid #404040', backgroundColor: '#c0c0c0', fontFamily: 'MSSerif', cursor: 'pointer' },
    stage: { display: 'flex', flex: 1, minHeight: 0, justifyContent: 'center', alignItems: 'center', overflow: 'auto', padding: 12, backgroundColor: '#666' },
    grid: { display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 26px)`, gridTemplateRows: `repeat(${SIZE}, 26px)`, border: '3px inset #fff', backgroundColor: '#fff' },
    pixel: { width: 26, height: 26, padding: 0, margin: 0, border: '1px solid rgba(0,0,0,.16)', cursor: 'crosshair', touchAction: 'none' },
};

export default PixelEditor;
