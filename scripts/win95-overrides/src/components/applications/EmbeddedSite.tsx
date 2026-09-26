import React from 'react';
import useInitialWindowSize from '../../hooks/useInitialWindowSize';
import Window from '../os/Window';
import { RandomInfoApp } from './RandomInfoCatalog';

export interface EmbeddedSiteProps extends WindowAppProps {
    app: RandomInfoApp;
}

const getRepoBase = (): string => {
    if (typeof window === 'undefined') return '';
    return window.location.pathname.startsWith('/random-info-pages/')
        ? '/random-info-pages'
        : '';
};

const EmbeddedSite: React.FC<EmbeddedSiteProps> = (props) => {
    const { initWidth, initHeight } = useInitialWindowSize({ margin: 90 });
    const src = `${getRepoBase()}${props.app.path}`;

    return (
        <Window
            top={28}
            left={72}
            width={initWidth}
            height={initHeight}
            windowTitle={props.app.title}
            windowBarIcon="windowExplorerIcon"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            bottomLeftText={`${props.app.folder} • ${props.app.path}`}
        >
            <div style={styles.shell}>
                <div style={styles.addressBar}>
                    <div style={styles.addressCopy}>
                        <strong style={styles.title}>{props.app.title}</strong>
                        <span style={styles.description}>{props.app.description}</span>
                    </div>
                    <a
                        href={src}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.externalLink}
                    >
                        Open outside OS
                    </a>
                </div>
                <iframe
                    title={props.app.title}
                    src={src}
                    style={styles.iframe}
                    loading="eager"
                />
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    shell: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        backgroundColor: '#c0c0c0',
    },
    addressBar: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minHeight: 38,
        padding: '5px 7px',
        boxSizing: 'border-box',
        backgroundColor: '#c0c0c0',
        borderBottom: '1px solid #808080',
        fontFamily: 'MSSerif',
    },
    addressCopy: {
        display: 'flex',
        minWidth: 0,
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
    },
    title: {
        fontSize: 12,
        lineHeight: '14px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    description: {
        fontSize: 10,
        lineHeight: '12px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    externalLink: {
        flexShrink: 0,
        padding: '4px 7px',
        color: '#000080',
        backgroundColor: '#c0c0c0',
        borderTop: '2px solid #ffffff',
        borderLeft: '2px solid #ffffff',
        borderRight: '2px solid #000000',
        borderBottom: '2px solid #000000',
        fontFamily: 'MSSerif',
        fontSize: 11,
        textDecoration: 'none',
    },
    iframe: {
        display: 'block',
        flex: 1,
        width: '100%',
        minHeight: 0,
        border: 0,
        backgroundColor: '#ffffff',
    },
};

export default EmbeddedSite;
