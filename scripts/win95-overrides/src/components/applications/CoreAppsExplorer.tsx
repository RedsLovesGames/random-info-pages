import React from 'react';
import { Icon } from '../general';
import {
    CORE_APPS,
    LEGACY_GAMES,
    CoreAppCategory,
    CoreAppDefinition,
    LegacyGameKey,
} from './CoreAppCatalog';
import CoreAppFrame from './core/CoreAppFrame';

export interface CoreAppsExplorerProps extends WindowAppProps {
    category?: CoreAppCategory;
    onLaunchApp: (app: CoreAppDefinition) => void;
    onLaunchLegacyGame?: (key: LegacyGameKey) => void;
}

const CoreAppsExplorer: React.FC<CoreAppsExplorerProps> = (props) => {
    const apps = props.category
        ? CORE_APPS.filter((app) => app.category === props.category)
        : CORE_APPS;
    const legacy = props.category === 'Games' ? LEGACY_GAMES : [];
    const title = props.category || 'Programs';

    return (
        <CoreAppFrame
            {...props}
            title={title}
            width={760}
            height={540}
            status={`${apps.length + legacy.length} programs`}
        >
            <div style={styles.header}>
                <strong>{title}</strong>
                <span>
                    {props.category === 'Games'
                        ? 'Games that run directly inside Random Info OS.'
                        : 'Useful desktop programs and creative tools.'}
                </span>
            </div>
            <div style={styles.grid}>
                {apps.map((app) => (
                    <button
                        type="button"
                        key={app.key}
                        aria-label={`Open ${app.title}`}
                        onClick={() => props.onLaunchApp(app)}
                        style={styles.card}
                    >
                        <Icon icon={app.icon} size={34} style={styles.icon} />
                        <span style={styles.copy}>
                            <strong style={styles.title}>{app.title}</strong>
                            <span style={styles.description}>{app.description}</span>
                        </span>
                    </button>
                ))}
                {legacy.map((game) => (
                    <button
                        type="button"
                        key={`legacy:${game.key}`}
                        aria-label={`Open ${game.title}`}
                        onClick={() => props.onLaunchLegacyGame?.(game.key)}
                        style={styles.card}
                    >
                        <Icon icon={game.icon} size={34} style={styles.icon} />
                        <span style={styles.copy}>
                            <strong style={styles.title}>{game.title}</strong>
                            <span style={styles.description}>{game.description}</span>
                        </span>
                    </button>
                ))}
            </div>
        </CoreAppFrame>
    );
};

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
        gridTemplateColumns: 'repeat(auto-fit, minmax(205px, 1fr))',
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
    icon: { flexShrink: 0 },
    copy: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
    title: { fontSize: 12 },
    description: { fontSize: 10, lineHeight: '13px', color: '#303030' },
};

export default CoreAppsExplorer;
