import React from 'react';
import CoreAppFrame from './CoreAppFrame';

const PAINT_URL = 'https://jspaint.app/';

const JsPaint: React.FC<WindowAppProps> = (props) => (
    <CoreAppFrame {...props} title="Paint" width={980} height={720} status="JS Paint • embedded web app">
        <div style={styles.toolbar}>
            <span>JS Paint</span>
            <a href={PAINT_URL} target="_blank" rel="noreferrer" style={styles.link}>Open standalone</a>
        </div>
        <iframe
            title="JS Paint"
            src={PAINT_URL}
            allow="clipboard-read; clipboard-write"
            style={styles.iframe}
        />
    </CoreAppFrame>
);

const styles: StyleSheetCSS = {
    toolbar: {
        minHeight: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '3px 8px',
        borderBottom: '1px solid #808080',
        backgroundColor: '#c0c0c0',
        fontSize: 10,
    },
    link: { color: '#000080', fontSize: 10 },
    iframe: { flex: 1, width: '100%', minHeight: 0, border: 0, backgroundColor: '#c0c0c0' },
};

export default JsPaint;
