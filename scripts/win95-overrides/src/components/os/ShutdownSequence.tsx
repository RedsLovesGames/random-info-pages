import React, { useEffect, useState } from 'react';

export interface ShutdownSequenceProps {
    numShutdowns: number;
    setShutdown: React.Dispatch<React.SetStateAction<boolean>>;
}

const ShutdownSequence: React.FC<ShutdownSequenceProps> = ({ setShutdown }) => {
    const [phase, setPhase] = useState<'shutdown' | 'reboot'>('shutdown');

    useEffect(() => {
        const rebootTimer = window.setTimeout(() => setPhase('reboot'), 900);
        const returnTimer = window.setTimeout(() => setShutdown(false), 1800);
        return () => {
            window.clearTimeout(rebootTimer);
            window.clearTimeout(returnTimer);
        };
    }, [setShutdown]);

    return (
        <div style={styles.screen} role="status" aria-live="polite">
            <div style={styles.content}>
                <div style={styles.logo}>Random Info OS</div>
                <div style={styles.message}>
                    {phase === 'shutdown'
                        ? 'Closing open programs and saving desktop state...'
                        : 'Restarting Random Info OS...'}
                </div>
                <div className="blinking-cursor" />
            </div>
        </div>
    );
};

const styles: StyleSheetCSS = {
    screen: {
        minHeight: '100%',
        display: 'flex',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000080',
        color: '#ffffff',
        fontFamily: 'MSSerif, serif',
    },
    content: {
        width: 'min(520px, 82vw)',
        padding: 24,
        textAlign: 'center',
    },
    logo: {
        marginBottom: 20,
        fontSize: 28,
        fontWeight: 700,
    },
    message: {
        marginBottom: 16,
        fontSize: 14,
        lineHeight: '20px',
    },
};

export default ShutdownSequence;
