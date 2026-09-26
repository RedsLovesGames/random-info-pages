import React, { useCallback, useMemo, useState } from 'react';
import Colors from '../../constants/colors';
import Doom from '../applications/Doom';
import EmbeddedSite from '../applications/EmbeddedSite';
import Henordle from '../applications/Henordle';
import OregonTrail from '../applications/OregonTrail';
import RandomInfoExplorer from '../applications/RandomInfoExplorer';
import { RandomInfoApp } from '../applications/RandomInfoCatalog';
import Scrabble from '../applications/Scrabble';
import { IconName } from '../../assets/icons';
import DesktopShortcut, { DesktopShortcutProps } from './DesktopShortcut';
import ShutdownSequence from './ShutdownSequence';
import Toolbar from './Toolbar';

export interface DesktopProps {}

type StaticAppKey = 'explorer' | 'trail' | 'doom' | 'scrabble' | 'wordle';

type StaticApp = {
    key: StaticAppKey;
    name: string;
    shortcutIcon: IconName;
};

const STATIC_APPS: StaticApp[] = [
    {
        key: 'explorer',
        name: 'Random Info Explorer',
        shortcutIcon: 'showcaseIcon',
    },
    {
        key: 'trail',
        name: 'The Oregon Trail',
        shortcutIcon: 'trailIcon',
    },
    {
        key: 'doom',
        name: 'Doom',
        shortcutIcon: 'doomIcon',
    },
    {
        key: 'scrabble',
        name: 'Scrabble',
        shortcutIcon: 'scrabbleIcon',
    },
    {
        key: 'wordle',
        name: 'RIP Wordle',
        shortcutIcon: 'henordleIcon',
    },
];

const highestZIndex = (windows: DesktopWindows): number =>
    Object.keys(windows).reduce(
        (highest, key) => Math.max(highest, windows[key]?.zIndex || 0),
        0
    );

const Desktop: React.FC<DesktopProps> = () => {
    const [windows, setWindows] = useState<DesktopWindows>({});
    const [shutdown, setShutdown] = useState(false);
    const [numShutdowns, setNumShutdowns] = useState(1);

    const removeWindow = useCallback((key: string) => {
        setTimeout(() => {
            setWindows((previous) => {
                if (!previous[key]) return previous;
                const next = { ...previous };
                delete next[key];
                return next;
            });
        }, 100);
    }, []);

    const minimizeWindow = useCallback((key: string) => {
        setWindows((previous) => {
            if (!previous[key]) return previous;
            return {
                ...previous,
                [key]: {
                    ...previous[key],
                    minimized: true,
                },
            };
        });
    }, []);

    const onWindowInteract = useCallback((key: string) => {
        setWindows((previous) => {
            if (!previous[key]) return previous;
            return {
                ...previous,
                [key]: {
                    ...previous[key],
                    minimized: false,
                    zIndex: highestZIndex(previous) + 1,
                },
            };
        });
    }, []);

    const toggleMinimize = useCallback((key: string) => {
        setWindows((previous) => {
            if (!previous[key]) return previous;
            const highest = highestZIndex(previous);
            const current = previous[key];
            const shouldToggle = current.minimized || current.zIndex === highest;
            return {
                ...previous,
                [key]: {
                    ...current,
                    minimized: shouldToggle ? !current.minimized : false,
                    zIndex: highest + 1,
                },
            };
        });
    }, []);

    const addWindow = useCallback(
        (
            key: string,
            name: string,
            icon: IconName,
            component: React.ReactElement
        ) => {
            setWindows((previous) => ({
                ...previous,
                [key]: {
                    zIndex: highestZIndex(previous) + 1,
                    minimized: false,
                    component,
                    name,
                    icon,
                },
            }));
        },
        []
    );

    const openRandomInfoApp = useCallback(
        (app: RandomInfoApp) => {
            const key = `rip:${app.key}`;
            addWindow(
                key,
                app.title,
                'windowExplorerIcon',
                <EmbeddedSite
                    key={key}
                    app={app}
                    onInteract={() => onWindowInteract(key)}
                    onMinimize={() => minimizeWindow(key)}
                    onClose={() => removeWindow(key)}
                />
            );
        },
        [addWindow, minimizeWindow, onWindowInteract, removeWindow]
    );

    const openStaticApp = useCallback(
        (appKey: StaticAppKey) => {
            const app = STATIC_APPS.find((candidate) => candidate.key === appKey);
            if (!app) return;

            const lifecycle = {
                onInteract: () => onWindowInteract(app.key),
                onMinimize: () => minimizeWindow(app.key),
                onClose: () => removeWindow(app.key),
            };

            let component: React.ReactElement;
            switch (app.key) {
                case 'explorer':
                    component = (
                        <RandomInfoExplorer
                            key={app.key}
                            {...lifecycle}
                            onLaunchApp={openRandomInfoApp}
                        />
                    );
                    break;
                case 'trail':
                    component = <OregonTrail key={app.key} {...lifecycle} />;
                    break;
                case 'doom':
                    component = <Doom key={app.key} {...lifecycle} />;
                    break;
                case 'scrabble':
                    component = <Scrabble key={app.key} {...lifecycle} />;
                    break;
                case 'wordle':
                    component = <Henordle key={app.key} {...lifecycle} />;
                    break;
                default:
                    return;
            }

            addWindow(app.key, app.name, app.shortcutIcon, component);
        },
        [
            addWindow,
            minimizeWindow,
            onWindowInteract,
            openRandomInfoApp,
            removeWindow,
        ]
    );

    const shortcuts = useMemo<DesktopShortcutProps[]>(
        () =>
            STATIC_APPS.map((app) => ({
                shortcutName: app.name,
                icon: app.shortcutIcon,
                onOpen: () => openStaticApp(app.key),
            })),
        [openStaticApp]
    );

    React.useEffect(() => {
        openStaticApp('explorer');
    }, [openStaticApp]);

    const startShutdown = useCallback(() => {
        setTimeout(() => {
            setWindows({});
            setShutdown(true);
            setNumShutdowns((value) => value + 1);
        }, 600);
    }, []);

    if (shutdown) {
        return (
            <ShutdownSequence
                setShutdown={setShutdown}
                numShutdowns={numShutdowns}
            />
        );
    }

    return (
        <div style={styles.desktop}>
            {Object.keys(windows).map((key) => {
                const element = windows[key].component;
                if (!element) return null;
                return (
                    <div
                        key={`win-${key}`}
                        style={Object.assign(
                            {},
                            { zIndex: windows[key].zIndex },
                            windows[key].minimized && styles.minimized
                        )}
                    >
                        {React.cloneElement(element, {
                            onInteract: () => onWindowInteract(key),
                            onMinimize: () => minimizeWindow(key),
                            onClose: () => removeWindow(key),
                        })}
                    </div>
                );
            })}

            <div style={styles.shortcuts}>
                {shortcuts.map((shortcut, index) => (
                    <div
                        style={Object.assign({}, styles.shortcutContainer, {
                            top: index * 104,
                        })}
                        key={shortcut.shortcutName}
                    >
                        <DesktopShortcut {...shortcut} />
                    </div>
                ))}
            </div>

            <Toolbar
                windows={windows}
                toggleMinimize={toggleMinimize}
                shutdown={startShutdown}
            />
        </div>
    );
};

const styles: StyleSheetCSS = {
    desktop: {
        minHeight: '100%',
        flex: 1,
        backgroundColor: Colors.turquoise,
        overflow: 'hidden',
    },
    shortcutContainer: {
        position: 'absolute',
    },
    shortcuts: {
        position: 'absolute',
        top: 16,
        left: 6,
    },
    minimized: {
        pointerEvents: 'none',
        opacity: 0,
    },
};

export default Desktop;
