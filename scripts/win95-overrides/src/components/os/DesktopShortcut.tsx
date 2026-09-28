import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import getIconByName, { IconName } from '../../assets/icons';
import colors from '../../constants/colors';
import { Icon } from '../general';

export interface DesktopShortcutProps {
    icon: IconName;
    shortcutName: string;
    invertText?: boolean;
    onOpen: () => void;
}

const DesktopShortcut: React.FC<DesktopShortcutProps> = ({ icon, shortcutName, invertText, onOpen }) => {
    const [isSelected, setIsSelected] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const iconUrl = getIconByName(icon) as unknown as string;
    const shortcutId = useMemo(() => `desktop-shortcut-${shortcutName.replace(/\s/g, '')}`, [shortcutName]);

    const handleClickOutside = useCallback((event: MouseEvent) => {
        if (!containerRef.current?.contains(event.target as Node)) {
            setIsSelected(false);
        }
    }, []);

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleClickOutside]);

    const open = useCallback(() => {
        setIsSelected(false);
        onOpen();
    }, [onOpen]);

    const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
        }
    }, [open]);

    return (
        <div
            id={shortcutId}
            ref={containerRef}
            role="button"
            tabIndex={0}
            aria-label={shortcutName}
            data-shortcut-name={shortcutName}
            style={styles.appShortcut}
            onMouseDown={(event) => {
                event.stopPropagation();
                setIsSelected(true);
            }}
            onDoubleClick={open}
            onKeyDown={onKeyDown}
        >
            <div style={styles.iconContainer}>
                <div
                    aria-hidden="true"
                    className="desktop-shortcut-icon"
                    style={Object.assign({}, styles.iconOverlay, isSelected && styles.checkerboard, isSelected && {
                        WebkitMask: `url(${iconUrl}) center / contain no-repeat`,
                        mask: `url(${iconUrl}) center / contain no-repeat`,
                    })}
                />
                <Icon icon={icon} size={32} style={styles.icon} />
            </div>
            <div
                className={isSelected ? 'selected-shortcut-border' : ''}
                style={Object.assign({}, styles.labelContainer, isSelected && { backgroundColor: colors.blue })}
            >
                <p style={Object.assign({}, styles.shortcutText, invertText && !isSelected && { color: 'black' })}>
                    {shortcutName}
                </p>
            </div>
        </div>
    );
};

const styles: StyleSheetCSS = {
    appShortcut: {
        position: 'relative',
        width: 78,
        minHeight: 76,
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        flexDirection: 'column',
        textAlign: 'center',
        outline: 'none',
        cursor: 'default',
        userSelect: 'none',
    },
    shortcutText: {
        cursor: 'default',
        fontFamily: 'MSSerif',
        color: 'white',
        fontSize: 10,
        lineHeight: '12px',
        padding: '1px 3px',
        margin: 0,
        maxWidth: 76,
        overflowWrap: 'break-word',
        textShadow: '1px 1px #000000',
    },
    labelContainer: {
        display: 'inline-flex',
        maxWidth: 78,
        marginTop: 3,
        outline: '1px solid transparent',
    },
    iconContainer: {
        position: 'relative',
        width: 32,
        height: 32,
        cursor: 'default',
        flexShrink: 0,
    },
    icon: {
        width: 32,
        height: 32,
        display: 'block',
    },
    iconOverlay: {
        position: 'absolute',
        inset: 0,
        width: 32,
        height: 32,
        pointerEvents: 'none',
        zIndex: 2,
    },
    checkerboard: {
        backgroundImage: `linear-gradient(45deg, ${colors.blue} 25%, transparent 25%), linear-gradient(-45deg, ${colors.blue} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${colors.blue} 75%), linear-gradient(-45deg, transparent 75%, ${colors.blue} 75%)`,
        backgroundSize: '2px 2px',
        backgroundPosition: '0 0, 0 1px, 1px -1px, -1px 0px',
    },
};

export default DesktopShortcut;
