import React, { useEffect, useState } from 'react';
import CoreAppFrame from './CoreAppFrame';
import { countWords } from './logic/text';
import { loadLocal, saveLocal } from './logic/storage';

const STORAGE_KEY = 'rip.core.notepad';

const Notepad: React.FC<WindowAppProps> = (props) => {
    const [text, setText] = useState(() => loadLocal(STORAGE_KEY, ''));

    useEffect(() => {
        saveLocal(STORAGE_KEY, text);
    }, [text]);

    const words = countWords(text);
    const characters = text.length;

    return (
        <CoreAppFrame
            {...props}
            title="Notepad"
            width={650}
            height={500}
            status={`${words} words • ${characters} characters`}
        >
            <div style={styles.menu}>
                <button type="button" onClick={() => setText('')} style={styles.menuButton}>New</button>
                <span style={styles.saved}>Autosaves on this device</span>
            </div>
            <textarea
                aria-label="Notepad text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                spellCheck={false}
                style={styles.textarea}
                placeholder="Type anything here..."
            />
        </CoreAppFrame>
    );
};

const styles: StyleSheetCSS = {
    menu: {
        display: 'flex', alignItems: 'center', gap: 10, minHeight: 32, padding: '4px 6px', boxSizing: 'border-box',
        borderBottom: '1px solid #808080', backgroundColor: '#c0c0c0',
    },
    menuButton: {
        padding: '3px 10px', borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #404040', borderBottom: '2px solid #404040',
        backgroundColor: '#c0c0c0', fontFamily: 'MSSerif', cursor: 'pointer',
    },
    saved: { fontSize: 9, color: '#404040' },
    textarea: {
        flex: 1, width: '100%', minHeight: 0, padding: 8, boxSizing: 'border-box', border: 0, outline: 'none', resize: 'none',
        backgroundColor: '#ffffff', color: '#000000', fontFamily: 'monospace', fontSize: 13, lineHeight: '18px',
    },
};

export default Notepad;
