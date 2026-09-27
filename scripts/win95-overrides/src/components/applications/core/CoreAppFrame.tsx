import React from 'react';
import useInitialWindowSize from '../../../hooks/useInitialWindowSize';
import Window from '../../os/Window';

export interface CoreAppFrameProps extends WindowAppProps {
    title: string;
    width?: number;
    height?: number;
    status?: string;
    onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
    onBlur?: React.FocusEventHandler<HTMLDivElement>;
}

const CoreAppFrame: React.FC<CoreAppFrameProps> = ({
    title,
    width = 620,
    height = 500,
    status,
    onKeyDown,
    onBlur,
    children,
    ...lifecycle
}) => {
    const { initWidth, initHeight } = useInitialWindowSize({ margin: 40 });
    const visibleWidth = window.visualViewport?.width || window.innerWidth;
    const narrow = visibleWidth <= 600;

    const focusFrame = (event: React.MouseEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement;
        if (!['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A'].includes(target.tagName)) {
            event.currentTarget.focus();
        }
    };

    return (
        <Window
            top={narrow ? 0 : 44}
            left={narrow ? 0 : 76}
            width={Math.min(width, initWidth)}
            height={Math.min(height, initHeight)}
            windowTitle={title}
            windowBarIcon="windowExplorerIcon"
            closeWindow={lifecycle.onClose}
            onInteract={lifecycle.onInteract}
            minimizeWindow={lifecycle.onMinimize}
            bottomLeftText={status || title}
        >
            <div
                tabIndex={0}
                onMouseDown={focusFrame}
                onKeyDown={onKeyDown}
                onBlur={onBlur}
                style={styles.frame}
            >
                {children}
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    frame: {
        display: 'flex',
        flex: 1,
        width: '100%',
        height: '100%',
        minHeight: 0,
        minWidth: 0,
        flexDirection: 'column',
        boxSizing: 'border-box',
        backgroundColor: '#c0c0c0',
        color: '#000000',
        fontFamily: 'MSSerif',
        outline: 'none',
        overflow: 'hidden',
    },
};

export default CoreAppFrame;
