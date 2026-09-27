import React from 'react';
import { CORE_APPS, CoreAppDefinition } from './CoreAppCatalog';
import CoreAppFrame from './core/CoreAppFrame';

export interface CoreAppsExplorerProps extends WindowAppProps {
    onLaunchApp: (app: CoreAppDefinition) => void;
}

const CoreAppsExplorer: React.FC<CoreAppsExplorerProps> = (props) => (
    <CoreAppFrame
        {...props}
        title="Core Apps"
        width={720}
        height={510}
        status={`${CORE_APPS.length} applications`}
    >
        <div style={styles.header}>
            <strong>Core Apps</strong>
            <span>Small programs that run entirely inside Random Info OS.</span>
        </div>
        <div style={styles.grid}>
            {CORE_APPS.map((app) => (
                <button
                    type="button"
                    key={app.key}
                    aria-label={`Open ${app.title}`}
                    onClick={() => props.onLaunchApp(app)}
                    style={styles.card}
                >
                    <span style={styles.glyph}>{app.glyph}</span>
                    <span style={styles.copy}>
                        <strong style={styles.title}>{app.title}</strong>
                        <span style={styles.description}>{app.description}</span>
                    </span>
                </button>
            ))}
        </div>
    </CoreAppFrame>
);

const styles: StyleSheetCSS = {
    header: {
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        padding: 10,
        borderBottom: '1px solid #808080',
        backgroundColor: '#c0c0c0',
        fontSize: 12,
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 8,
        padding: 10,
        overflowY: 'auto',
        backgroundColor: '#ffffff',
    },
    card: {
        display: 'flex',
        minHeight: 82,
        alignItems: 'flex-start',
        gap: 9,
        padding: 9,
        borderTop: '2px solid #ffffff',
        borderLeft: '2px solid #ffffff',
        borderRight: '2px solid #404040',
        borderBottom: '2px solid #404040',
        backgroundColor: '#c0c0c0',
        color: '#000000',
        textAlign: 'left',
        fontFamily: 'MSSerif',
        cursor: 'pointer',
    },
    glyph: {
        flexShrink: 0,
        fontSize: 27,
        lineHeight: '30px',
    },
    copy: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: 0,
    },
    title: {
        fontSize: 12,
    },
    description: {
        fontSize: 10,
        lineHeight: '13px',
        color: '#303030',
    },
};

export default CoreAppsExplorer;
