import React, { useEffect, useState } from 'react';
import CoreAppFrame from './CoreAppFrame';
import { loadLocal, saveLocal } from './logic/storage';

type StickyNote = { id: string; text: string; color: string };

const STORAGE_KEY = 'rip.core.sticky-notes';
const COLORS = ['#fff28a', '#ffd1dc', '#ccecff', '#d9f7be', '#ead7ff'];
const DEFAULT_NOTES: StickyNote[] = [{ id: 'welcome', text: 'Random Info OS sticky note', color: COLORS[0] }];

const StickyNotes: React.FC<WindowAppProps> = (props) => {
    const [notes, setNotes] = useState<StickyNote[]>(() => loadLocal(STORAGE_KEY, DEFAULT_NOTES));

    useEffect(() => {
        saveLocal(STORAGE_KEY, notes);
    }, [notes]);

    const addNote = () => {
        const note: StickyNote = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            text: '',
            color: COLORS[notes.length % COLORS.length],
        };
        setNotes((current) => [...current, note]);
    };

    const updateNote = (id: string, text: string) => {
        setNotes((current) => current.map((note) => note.id === id ? { ...note, text } : note));
    };

    const removeNote = (id: string) => {
        setNotes((current) => current.filter((note) => note.id !== id));
    };

    return (
        <CoreAppFrame {...props} title="Sticky Notes" width={760} height={560} status={`${notes.length} notes • autosaved locally`}>
            <div style={styles.toolbar}>
                <button type="button" onClick={addNote} style={styles.button}>+ New note</button>
                <span style={styles.hint}>Notes stay in this browser.</span>
            </div>
            <div style={styles.board}>
                {notes.map((note) => (
                    <div key={note.id} style={Object.assign({}, styles.note, { backgroundColor: note.color })}>
                        <button type="button" aria-label="Delete sticky note" onClick={() => removeNote(note.id)} style={styles.delete}>×</button>
                        <textarea
                            aria-label="Sticky note"
                            value={note.text}
                            onChange={(event) => updateNote(note.id, event.target.value)}
                            placeholder="Write a note..."
                            style={styles.textarea}
                        />
                    </div>
                ))}
                {!notes.length && <div style={styles.empty}>No notes. Create one with “New note”.</div>}
            </div>
        </CoreAppFrame>
    );
};

const styles: StyleSheetCSS = {
    toolbar: { display: 'flex', alignItems: 'center', gap: 10, minHeight: 34, padding: '4px 7px', borderBottom: '1px solid #808080' },
    button: { padding: '4px 10px', backgroundColor: '#c0c0c0', borderTop: '2px solid #fff', borderLeft: '2px solid #fff', borderRight: '2px solid #404040', borderBottom: '2px solid #404040', fontFamily: 'MSSerif', cursor: 'pointer' },
    hint: { fontSize: 9, color: '#404040' },
    board: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, backgroundColor: '#6b7773' },
    note: { position: 'relative', minHeight: 150, padding: 8, boxSizing: 'border-box', border: '1px solid #766f35', boxShadow: '3px 3px 0 rgba(0,0,0,.25)' },
    delete: { position: 'absolute', right: 5, top: 4, width: 22, height: 20, padding: 0, border: '1px solid #766f35', backgroundColor: 'rgba(255,255,255,.45)', cursor: 'pointer' },
    textarea: { width: '100%', height: '100%', minHeight: 125, padding: '24px 3px 3px', resize: 'none', border: 0, outline: 0, boxSizing: 'border-box', backgroundColor: 'transparent', color: '#201d12', fontFamily: 'Arial, sans-serif', fontSize: 13, lineHeight: '18px' },
    empty: { padding: 20, color: '#fff', fontSize: 12 },
};

export default StickyNotes;
