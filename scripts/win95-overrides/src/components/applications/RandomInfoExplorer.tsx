import React, { useMemo, useState } from 'react';
import useInitialWindowSize from '../../hooks/useInitialWindowSize';
import Window from '../os/Window';
import {
    RANDOM_INFO_APPS,
    RANDOM_INFO_FOLDERS,
    RandomInfoApp,
    RandomInfoFolder,
} from './RandomInfoCatalog';

export interface RandomInfoExplorerProps extends WindowAppProps {
    onLaunchApp: (app: RandomInfoApp) => void;
}

const RandomInfoExplorer: React.FC<RandomInfoExplorerProps> = (props) => {
    const { initWidth, initHeight } = useInitialWindowSize({ margin: 100 });
    const [folder, setFolder] = useState<RandomInfoFolder>('Tools');

    const apps = useMemo(
        () => RANDOM_INFO_APPS.filter((app) => app.folder === folder),
        [folder]
    );

    return (
        <Window
            top={24}
            left={56}
            width={initWidth}
            height={initHeight}
            windowTitle="Random Info Explorer"
            windowBarIcon="windowExplorerIcon"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            bottomLeftText={`${apps.length} item${apps.length === 1 ? '' : 's'} • ${folder}`}
        >
            <div style={styles.explorer}>
                <aside style={styles.sidebar}>
                    <div style={styles.sidebarTitle}>Folders</div>
                    {RANDOM_INFO_FOLDERS.map((item) => (
                        <button
                            type="button"
                            key={item}
                            onClick={() => setFolder(item)}
                            style={Object.assign(
                                {},
                                styles.folderButton,
                                folder === item && styles.folderButtonActive
                            )}
                        >
                            <span style={styles.folderIcon}>📁</span>
                            <span>{item}</span>
                        </button>
                    ))}
                    <div style={styles.sourceNote}>
                        Win95 shell adapted from the open-source
                        henryjeff/portfolio-inner-site project. Personal portfolio
                        content is not included.
                    </div>
                </aside>
                <main style={styles.main}>
                    <div style={styles.pathBar}>C:\RANDOM_INFO\{folder.toUpperCase()}</div>
                    <div style={styles.grid}>
                        {apps.map((app) => (
                            <button
                                type="button"
                                key={app.key}
                                onDoubleClick={() => props.onLaunchApp(app)}
                                onClick={() => props.onLaunchApp(app)}
                                style={styles.appCard}
                                title={`Open ${app.title}`}
                            >
                                <span style={styles.appIcon}>🗎</span>
                                <span style={styles.appCopy}>
                                    <strong style={styles.appTitle}>{app.title}</strong>
                                    <span style={styles.appDescription}>{app.description}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </main>
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    explorer: {
        display: 'flex',
        height: '100%',
        minHeight: 0,
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: 'MSSerif',
    },
    sidebar: {
        display: 'flex',
        flexDirection: 'column',
        width: 168,
        flexShrink: 0,
        padding: 6,
        boxSizing: 'border-box',
        backgroundColor: '#c0c0c0',
        borderRight: '2px inset #ffffff',
        overflowY: 'auto',
    },
    sidebarTitle: {
        padding: '3px 5px 6px',
        fontSize: 12,
        fontWeight: 700,
    },
    folderButton: {
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        gap: 6,
        padding: '5px 6px',
        border: 0,
        background: 'transparent',
        color: '#000000',
        textAlign: 'left',
        fontFamily: 'MSSerif',
        fontSize: 12,
        cursor: 'pointer',
    },
    folderButtonActive: {
        backgroundColor: '#000080',
        color: '#ffffff',
    },
    folderIcon: {
        fontSize: 16,
        lineHeight: '18px',
    },
    sourceNote: {
        marginTop: 'auto',
        padding: '8px 5px 2px',
        fontSize: 9,
        lineHeight: '12px',
        color: '#404040',
    },
    main: {
        display: 'flex',
        flex: 1,
        minWidth: 0,
        flexDirection: 'column',
    },
    pathBar: {
        padding: '5px 8px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #808080',
        fontSize: 11,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
        alignContent: 'start',
        gap: 8,
        padding: 10,
        overflowY: 'auto',
    },
    appCard: {
        display: 'flex',
        minHeight: 76,
        alignItems: 'flex-start',
        gap: 8,
        padding: 8,
        backgroundColor: '#ffffff',
        border: '1px solid transparent',
        color: '#000000',
        textAlign: 'left',
        fontFamily: 'MSSerif',
        cursor: 'pointer',
    },
    appIcon: {
        flexShrink: 0,
        fontSize: 28,
        lineHeight: '32px',
    },
    appCopy: {
        display: 'flex',
        minWidth: 0,
        flexDirection: 'column',
    },
    appTitle: {
        marginBottom: 4,
        fontSize: 12,
        lineHeight: '14px',
    },
    appDescription: {
        fontSize: 10,
        lineHeight: '13px',
        color: '#505050',
    },
};

export default RandomInfoExplorer;
