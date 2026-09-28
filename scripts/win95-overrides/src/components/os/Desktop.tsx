import React, { useCallback, useMemo, useState } from 'react';
import Colors from '../../constants/colors';
import Calculator from '../applications/core/Calculator';
import Game2048 from '../applications/core/Game2048';
import JsPaint from '../applications/core/JsPaint';
import Minesweeper from '../applications/core/Minesweeper';
import Notepad from '../applications/core/Notepad';
import PixelEditor from '../applications/core/PixelEditor';
import ReactionTest from '../applications/core/ReactionTest';
import SandSimulator from '../applications/core/SandSimulator';
import Snake from '../applications/core/Snake';
import StickyNotes from '../applications/core/StickyNotes';
import TimerApp from '../applications/core/TimerApp';
import WebampPlayer from '../applications/core/WebampPlayer';
import {
    CORE_APPS,
    LEGACY_GAMES,
    CoreAppDefinition,
    CoreAppKey,
    LegacyGameKey,
    getCoreApp,
} from '../applications/CoreAppCatalog';
import CoreAppsExplorer from '../applications/CoreAppsExplorer';
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
import Toolbar, { StartMenuItem } from './Toolbar';

export interface DesktopProps {}

type FolderKey = 'explorer' | 'accessories' | 'games';

type FolderDefinition = {
    key: FolderKey;
    name: string;
    icon: IconName;
};

type ShortcutEntry = DesktopShortcutProps & {
    layoutKey: string;
};

const WINDOW_LAYER_BASE = 100;

const DESKTOP_LAYOUT: Record<string, { left: number; top: number }> = {
    explorer: { left: 18, top: 16 },
    calculator: { left: 150, top: 42 },
    notepad: { left: 305, top: 18 },
    paint: { left: 468, top: 72 },
    winamp: { left: 660, top: 28 },
    sticky: { left: 850, top: 82 },
    timer: { left: 1040, top: 30 },
    pixel: { left: 150, top: 200 },
    minesweeper: { left: 345, top: 250 },
    snake: { left: 550, top: 190 },
    '2048': { left: 750, top: 255 },
    reaction: { left: 945, top: 195 },
    sand: { left: 1090, top: 275 },
    doom: { left: 38, top: 390 },
    trail: { left: 250, top: 430 },
    scrabble: { left: 505, top: 385 },
    wordle: { left: 775, top: 445 },
};

const FOLDERS: FolderDefinition[] = [
    { key: 'explorer', name: 'Random Info Explorer', icon: 'showcaseIcon' },
    { key: 'accessories', name: 'Accessories', icon: 'folderAccessories' },
    { key: 'games', name: 'Games', icon: 'folderGames' },
];

const CORE_COMPONENTS: Record<CoreAppKey, React.ComponentType<WindowAppProps>> = {
    calculator: Calculator,
    notepad: Notepad,
    paint: JsPaint,
    winamp: WebampPlayer,
    sticky: StickyNotes,
    timer: TimerApp,
    pixel: PixelEditor,
    minesweeper: Minesweeper,
    snake: Snake,
    '2048': Game2048,
    reaction: ReactionTest,
    sand: SandSimulator,
};

const highestZIndex = (windows: DesktopWindows): number =>
    Object.keys(windows).reduce((highest, key) => Math.max(highest, windows[key]?.zIndex || 0), 0);

const Desktop: React.FC<DesktopProps> = () => {
    const [windows, setWindows] = useState<DesktopWindows>({});
    const [shutdown, setShutdown] = useState(false);
    const [numShutdowns, setNumShutdowns] = useState(1);
    const desktopWidth = window.visualViewport?.width || window.innerWidth;
    const adaptiveDesktop = desktopWidth < 1180;
    const adaptiveColumns = Math.max(1, Math.floor(Math.max(desktopWidth - 16, 90) / 90));

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
        setWindows((previous) => previous[key] ? { ...previous, [key]: { ...previous[key], minimized: true } } : previous);
    }, []);

    const onWindowInteract = useCallback((key: string) => {
        setWindows((previous) => previous[key] ? {
            ...previous,
            [key]: { ...previous[key], minimized: false, zIndex: highestZIndex(previous) + 1 },
        } : previous);
    }, []);

    const toggleMinimize = useCallback((key: string) => {
        setWindows((previous) => {
            if (!previous[key]) return previous;
            const highest = highestZIndex(previous);
            const current = previous[key];
            const shouldToggle = current.minimized || current.zIndex === highest;
            return { ...previous, [key]: { ...current, minimized: shouldToggle ? !current.minimized : false, zIndex: highest + 1 } };
        });
    }, []);

    const addWindow = useCallback((key: string, name: string, icon: IconName, component: React.ReactElement) => {
        setWindows((previous) => ({
            ...previous,
            [key]: { zIndex: highestZIndex(previous) + 1, minimized: false, component, name, icon },
        }));
    }, []);

    const openRandomInfoApp = useCallback((app: RandomInfoApp) => {
        const key = `rip:${app.key}`;
        addWindow(key, app.title, 'windowExplorerIcon', <EmbeddedSite key={key} app={app} onInteract={() => onWindowInteract(key)} onMinimize={() => minimizeWindow(key)} onClose={() => removeWindow(key)} />);
    }, [addWindow, minimizeWindow, onWindowInteract, removeWindow]);

    const openCoreApp = useCallback((app: CoreAppDefinition) => {
        const key = `core:${app.key}`;
        const Component = CORE_COMPONENTS[app.key];
        addWindow(key, app.title, app.icon, <Component key={key} onInteract={() => onWindowInteract(key)} onMinimize={() => minimizeWindow(key)} onClose={() => removeWindow(key)} />);
    }, [addWindow, minimizeWindow, onWindowInteract, removeWindow]);

    const openLegacyGame = useCallback((gameKey: LegacyGameKey) => {
        const game = LEGACY_GAMES.find((candidate) => candidate.key === gameKey);
        if (!game) return;
        const key = `legacy:${game.key}`;
        const lifecycle = { onInteract: () => onWindowInteract(key), onMinimize: () => minimizeWindow(key), onClose: () => removeWindow(key) };
        let component: React.ReactElement;
        switch (game.key) {
            case 'doom': component = <Doom key={key} {...lifecycle} />; break;
            case 'trail': component = <OregonTrail key={key} {...lifecycle} />; break;
            case 'scrabble': component = <Scrabble key={key} {...lifecycle} />; break;
            case 'wordle': component = <Henordle key={key} {...lifecycle} />; break;
            default: return;
        }
        addWindow(key, game.title, game.icon, component);
    }, [addWindow, minimizeWindow, onWindowInteract, removeWindow]);

    const openFolder = useCallback((folderKey: FolderKey) => {
        const folder = FOLDERS.find((candidate) => candidate.key === folderKey);
        if (!folder) return;
        const key = `folder:${folder.key}`;
        const lifecycle = { onInteract: () => onWindowInteract(key), onMinimize: () => minimizeWindow(key), onClose: () => removeWindow(key) };
        let component: React.ReactElement;
        if (folder.key === 'explorer') {
            component = <RandomInfoExplorer key={key} {...lifecycle} onLaunchApp={openRandomInfoApp} />;
        } else {
            component = (
                <CoreAppsExplorer
                    key={key}
                    {...lifecycle}
                    category={folder.key === 'games' ? 'Games' : 'Accessories'}
                    onLaunchApp={openCoreApp}
                    onLaunchLegacyGame={openLegacyGame}
                />
            );
        }
        addWindow(key, folder.name, folder.icon, component);
    }, [addWindow, minimizeWindow, onWindowInteract, openCoreApp, openLegacyGame, openRandomInfoApp, removeWindow]);

    const shortcuts = useMemo<ShortcutEntry[]>(() => [
        {
            layoutKey: 'explorer',
            shortcutName: 'Random Info Explorer',
            icon: 'showcaseIcon',
            onOpen: () => openFolder('explorer'),
        },
        ...CORE_APPS.map((app) => ({
            layoutKey: app.key,
            shortcutName: app.title,
            icon: app.icon,
            onOpen: () => openCoreApp(app),
        })),
        ...LEGACY_GAMES.map((game) => ({
            layoutKey: game.key,
            shortcutName: game.title,
            icon: game.icon,
            onOpen: () => openLegacyGame(game.key),
        })),
    ], [openCoreApp, openFolder, openLegacyGame]);

    const startItems = useMemo<StartMenuItem[]>(() => {
        const launchCore = (key: CoreAppKey) => {
            const app = getCoreApp(key);
            if (app) openCoreApp(app);
        };
        return [
            { label: 'Accessories', icon: 'folderAccessories', onOpen: () => openFolder('accessories') },
            { label: 'Games', icon: 'folderGames', onOpen: () => openFolder('games') },
            { label: 'Paint', icon: 'paintIcon', onOpen: () => launchCore('paint') },
            { label: 'Winamp', icon: 'winampIcon', onOpen: () => launchCore('winamp') },
            { label: 'Notepad', icon: 'notepadIcon', onOpen: () => launchCore('notepad') },
            { label: 'Sticky Notes', icon: 'stickyIcon', onOpen: () => launchCore('sticky') },
            { label: 'Timer / Stopwatch', icon: 'timerIcon', onOpen: () => launchCore('timer') },
            { label: 'Doom', icon: 'doomIcon', onOpen: () => openLegacyGame('doom') },
        ];
    }, [openCoreApp, openFolder, openLegacyGame]);

    const startShutdown = useCallback(() => {
        setTimeout(() => {
            setWindows({});
            setShutdown(true);
            setNumShutdowns((value) => value + 1);
        }, 600);
    }, []);

    if (shutdown) return <ShutdownSequence setShutdown={setShutdown} numShutdowns={numShutdowns} />;

    return (
        <div style={styles.desktop}>
            <div style={styles.shortcuts} aria-label="Desktop programs">
                {shortcuts.map((shortcut, index) => {
                    const position = adaptiveDesktop
                        ? { left: 8 + (index % adaptiveColumns) * 90, top: 12 + Math.floor(index / adaptiveColumns) * 92 }
                        : (DESKTOP_LAYOUT[shortcut.layoutKey] || { left: 12, top: 12 });
                    const { layoutKey, ...shortcutProps } = shortcut;
                    return (
                        <div style={Object.assign({}, styles.shortcutContainer, position)} key={layoutKey}>
                            <DesktopShortcut {...shortcutProps} />
                        </div>
                    );
                })}
            </div>
            {Object.keys(windows).map((key) => {
                const element = windows[key].component;
                if (!element) return null;
                return (
                    <div
                        key={`win-${key}`}
                        data-rip-window-layer={key}
                        style={Object.assign(
                            {},
                            { position: 'relative' as const, zIndex: WINDOW_LAYER_BASE + windows[key].zIndex },
                            windows[key].minimized && styles.minimized
                        )}
                    >
                        {React.cloneElement(element, { onInteract: () => onWindowInteract(key), onMinimize: () => minimizeWindow(key), onClose: () => removeWindow(key) })}
                    </div>
                );
            })}
            <Toolbar windows={windows} toggleMinimize={toggleMinimize} shutdown={startShutdown} startItems={startItems} />
        </div>
    );
};

const styles: StyleSheetCSS = {
    desktop: { position: 'relative', minHeight: '100%', flex: 1, backgroundColor: Colors.turquoise, overflow: 'hidden' },
    shortcutContainer: { position: 'absolute' },
    shortcuts: { position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' },
    minimized: { pointerEvents: 'none', opacity: 0 },
};

export default Desktop;
