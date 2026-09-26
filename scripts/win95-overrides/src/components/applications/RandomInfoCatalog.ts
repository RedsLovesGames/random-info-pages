export type RandomInfoFolder =
    | 'Tools'
    | 'School'
    | 'Friends'
    | 'Games'
    | 'Data'
    | 'Experiments';

export interface RandomInfoApp {
    key: string;
    title: string;
    path: string;
    folder: RandomInfoFolder;
    description: string;
}

export const RANDOM_INFO_FOLDERS: RandomInfoFolder[] = [
    'Tools',
    'School',
    'Friends',
    'Games',
    'Data',
    'Experiments',
];

export const RANDOM_INFO_APPS: RandomInfoApp[] = [
    {
        key: 'toolbox',
        title: 'Toolbox',
        path: '/tools/',
        folder: 'Tools',
        description: 'The main collection of browser-native utilities and deep tools.',
    },
    {
        key: 'whenwemeet',
        title: 'When We Meet',
        path: '/whenwemeet/',
        folder: 'Tools',
        description: 'Cross-device group availability planning.',
    },
    {
        key: 'school-schedule',
        title: 'School Schedule',
        path: '/school-schedule/',
        folder: 'School',
        description: 'Fall schedule, classes, activities, and due-date views.',
    },
    {
        key: 'friends',
        title: 'Friend Group Hub',
        path: '/friends/',
        folder: 'Friends',
        description: 'Friend-group pages, quotes, forms, and shared projects.',
    },
    {
        key: 'wheel',
        title: 'Wheel',
        path: '/wheel/',
        folder: 'Games',
        description: 'Random Info Pages spin wheel inspired by Wheel of Names.',
    },
    {
        key: 'tideborne',
        title: 'Tideborne',
        path: '/tideborne/',
        folder: 'Games',
        description: 'Tideborne reference and development pages.',
    },
    {
        key: 'vct-scout',
        title: 'VCT Scout',
        path: '/vct-scout/',
        folder: 'Data',
        description: 'Valorant scouting, map geometry, and tactical analysis.',
    },
    {
        key: 'heatmap',
        title: 'Heatmap',
        path: '/heatmap/',
        folder: 'Data',
        description: 'Interactive heatmap and data visualization work.',
    },
    {
        key: 'tide2',
        title: 'Tide 2',
        path: '/tide2/',
        folder: 'Data',
        description: 'FishScore and Tideborne system data views.',
    },
    {
        key: 'wanuiv2',
        title: 'WAN UI v2',
        path: '/wanuiv2/',
        folder: 'Experiments',
        description: 'Interface and visual experimentation.',
    },
    {
        key: 'nerdcore-prompts',
        title: 'Nerdcore Prompts',
        path: '/nerdcore-prompts/',
        folder: 'Experiments',
        description: 'Prompt and music-writing experiments.',
    },
];
