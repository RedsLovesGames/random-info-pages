import React, { useEffect, useRef, useState } from 'react';
import useInitialWindowSize from '../../hooks/useInitialWindowSize';
import Window from '../os/Window';
import { RandomInfoApp } from './RandomInfoCatalog';

export interface EmbeddedSiteProps extends WindowAppProps {
    app: RandomInfoApp;
}

const DESKTOP_VIEWPORT_WIDTH = 1440;
const MIN_SCALE = 0.1;

const getRepoBase = (): string => {
    if (typeof window === 'undefined') return '';
    return window.location.pathname.startsWith('/random-info-pages/')
        ? '/random-info-pages'
        : '';
};

const EmbeddedSite: React.FC<EmbeddedSiteProps> = (props) => {
    const { initWidth, initHeight } = useInitialWindowSize({ margin: 90 });
    const src = `${getRepoBase()}${props.app.path}`;
    const viewportRef = useRef<HTMLDivElement>(null);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        const measure = () => {
            const rect = viewport.getBoundingClientRect();
            setViewportSize((previous) => {
                const width = Math.max(0, rect.width);
                const height = Math.max(0, rect.height);
                if (previous.width === width && previous.height === height) {
                    return previous;
                }
                return { width, height };
            });
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(viewport);
        return () => observer.disconnect();
    }, []);

    const scale = viewportSize.width
        ? Math.max(MIN_SCALE, viewportSize.width / DESKTOP_VIEWPORT_WIDTH)
        : 1;
    const logicalHeight = viewportSize.height
        ? Math.max(1, viewportSize.height / scale)
        : initHeight;

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
                <div ref={viewportRef} style={styles.viewport}>
                    <iframe
                        title={props.app.title}
                        src={src}
                        style={Object.assign({}, styles.iframe, {
                            width: DESKTOP_VIEWPORT_WIDTH,
                            height: logicalHeight,
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                        })}
                        loading="eager"
                    />
                </div>
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    shell: {
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minHeight: 0,
        minWidth: 0,
        boxSizing: 'border-box',
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
    viewport: {
        position: 'relative',
        display: 'block',
        flex: 1,
        width: '100%',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
    },
    iframe: {
        display: 'block',
        position: 'absolute',
        top: 0,
        left: 0,
        minHeight: 0,
        border: 0,
        backgroundColor: '#ffffff',
    },
};

export default EmbeddedSite;
