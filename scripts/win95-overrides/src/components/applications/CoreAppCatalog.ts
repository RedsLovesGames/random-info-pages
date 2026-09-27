export type CoreAppKey =
    | 'calculator'
    | 'notepad'
    | 'minesweeper'
    | 'snake'
    | '2048'
    | 'reaction';

export interface CoreAppDefinition {
    key: CoreAppKey;
    title: string;
    description: string;
    glyph: string;
}

export const CORE_APPS: CoreAppDefinition[] = [
    {
        key: 'calculator',
        title: 'Calculator',
        description: 'A compact four-function desktop calculator.',
        glyph: '🧮',
    },
    {
        key: 'notepad',
        title: 'Notepad',
        description: 'Plain-text notes with local autosave.',
        glyph: '📝',
    },
    {
        key: 'minesweeper',
        title: 'Minesweeper',
        description: 'Classic 9×9 beginner Minesweeper.',
        glyph: '💣',
    },
    {
        key: 'snake',
        title: 'Snake',
        description: 'Keyboard-controlled grid Snake with a local high score.',
        glyph: '🐍',
    },
    {
        key: '2048',
        title: '2048',
        description: 'Merge tiles to reach 2048.',
        glyph: '🔢',
    },
    {
        key: 'reaction',
        title: 'Reaction Test',
        description: 'Measure reaction time and keep a local best.',
        glyph: '⚡',
    },
];
