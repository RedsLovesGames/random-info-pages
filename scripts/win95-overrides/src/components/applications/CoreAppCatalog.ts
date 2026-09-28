import { IconName } from '../../assets/icons';

export type CoreAppCategory = 'Accessories' | 'Games';

export type CoreAppKey =
    | 'calculator'
    | 'notepad'
    | 'paint'
    | 'winamp'
    | 'sticky'
    | 'timer'
    | 'pixel'
    | 'minesweeper'
    | 'snake'
    | '2048'
    | 'reaction'
    | 'sand';

export interface CoreAppDefinition {
    key: CoreAppKey;
    title: string;
    description: string;
    icon: IconName;
    category: CoreAppCategory;
}

export type LegacyGameKey = 'trail' | 'doom' | 'scrabble' | 'wordle';

export interface LegacyGameDefinition {
    key: LegacyGameKey;
    title: string;
    description: string;
    icon: IconName;
}

export const CORE_APPS: CoreAppDefinition[] = [
    { key: 'calculator', title: 'Calculator', description: 'Four-function calculator with keyboard support.', icon: 'calculatorIcon', category: 'Accessories' },
    { key: 'notepad', title: 'Notepad', description: 'Plain-text notes with local autosave.', icon: 'notepadIcon', category: 'Accessories' },
    { key: 'paint', title: 'Paint', description: 'Full JS Paint running inside the desktop.', icon: 'paintIcon', category: 'Accessories' },
    { key: 'winamp', title: 'Winamp', description: 'Webamp music player with local audio loading.', icon: 'winampIcon', category: 'Accessories' },
    { key: 'sticky', title: 'Sticky Notes', description: 'Persistent little notes stored on this device.', icon: 'stickyIcon', category: 'Accessories' },
    { key: 'timer', title: 'Timer / Stopwatch', description: 'Stopwatch and countdown timer in one window.', icon: 'timerIcon', category: 'Accessories' },
    { key: 'pixel', title: 'Pixel Editor', description: 'A tiny 16×16 pixel-art editor with PNG export.', icon: 'pixelIcon', category: 'Accessories' },
    { key: 'minesweeper', title: 'Minesweeper', description: 'Classic 9×9 beginner Minesweeper.', icon: 'minesweeperIcon', category: 'Games' },
    { key: 'snake', title: 'Snake', description: 'Keyboard-controlled grid Snake with a local high score.', icon: 'snakeIcon', category: 'Games' },
    { key: '2048', title: '2048', description: 'Merge tiles to reach 2048.', icon: 'game2048Icon', category: 'Games' },
    { key: 'reaction', title: 'Reaction Test', description: 'Measure reaction time and keep a local best.', icon: 'reactionIcon', category: 'Games' },
    { key: 'sand', title: 'Sand Simulator', description: 'Draw falling sand and watch it settle.', icon: 'sandIcon', category: 'Games' },
];

export const LEGACY_GAMES: LegacyGameDefinition[] = [
    { key: 'doom', title: 'Doom', description: 'The existing DOS Doom installation.', icon: 'doomIcon' },
    { key: 'trail', title: 'The Oregon Trail', description: 'The existing DOS Oregon Trail installation.', icon: 'trailIcon' },
    { key: 'scrabble', title: 'Scrabble', description: 'The existing desktop Scrabble game.', icon: 'scrabbleIcon' },
    { key: 'wordle', title: 'RIP Wordle', description: 'The existing five-letter word game.', icon: 'henordleIcon' },
];

export const getCoreApp = (key: CoreAppKey): CoreAppDefinition | undefined =>
    CORE_APPS.find((app) => app.key === key);
