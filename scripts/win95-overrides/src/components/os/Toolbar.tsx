import React, { useEffect, useState } from 'react';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import { IconName } from '../../assets/icons';

export interface StartMenuItem {
    label: string;
    icon: IconName;
    onOpen: () => void;
}

export interface ToolbarProps {
    windows: DesktopWindows;
    toggleMinimize: (key: string) => void;
    shutdown: () => void;
    startItems?: StartMenuItem[];
}

const getTime = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const Toolbar: React.FC<ToolbarProps> = ({ windows, toggleMinimize, shutdown, startItems = [] }) => {
    const [startWindowOpen, setStartWindowOpen] = useState(false);
    const [lastActive, setLastActive] = useState('');
    const [time, setTime] = useState(getTime());

    useEffect(() => {
        let max = 0;
        let key = '';
        Object.keys(windows).forEach((candidate) => {
            if (windows[candidate].zIndex >= max) {
                max = windows[candidate].zIndex;
                key = candidate;
            }
        });
        setLastActive(key);
    }, [windows]);

    useEffect(() => {
        const interval = window.setInterval(() => setTime(getTime()), 5000);
        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        const close = () => setStartWindowOpen(false);
        window.addEventListener('mousedown', close);
        return () => window.removeEventListener('mousedown', close);
    }, []);

    const launch = (item: StartMenuItem) => {
        item.onOpen();
        setStartWindowOpen(false);
    };

    return (
        <div style={styles.toolbarOuter}>
            {startWindowOpen && (
                <div onMouseDown={(event) => event.stopPropagation()} style={styles.startWindow}>
                    <div style={styles.startWindowInner}>
                        <div style={styles.verticalStartContainer}><p style={styles.verticalText}>Random Info OS</p></div>
                        <div style={styles.startWindowContent}>
                            <div style={styles.programList}>
                                {startItems.map((item) => (
                                    <button type="button" key={item.label} aria-label={`Open ${item.label}`} className="start-menu-option" style={styles.startMenuOption} onMouseDown={(event) => { event.stopPropagation(); launch(item); }}>
                                        <Icon style={styles.startMenuIcon} icon={item.icon} />
                                        <span style={styles.startMenuText}>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                            <div style={styles.startMenuLine} />
                            <button type="button" className="start-menu-option" style={styles.startMenuOption} onMouseDown={(event) => { event.stopPropagation(); shutdown(); setStartWindowOpen(false); }}>
                                <Icon style={styles.startMenuIcon} icon="computerBig" />
                                <span style={styles.startMenuText}>Sh<u>u</u>t down...</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div style={styles.toolbarInner}>
                <div style={styles.toolbar}>
                    <div id="random-info-start-button" data-rip-role="start-button" style={Object.assign({}, styles.startContainerOuter, startWindowOpen && styles.activeTabOuter)} onMouseDown={(event) => { event.stopPropagation(); setStartWindowOpen((value) => !value); }}>
                        <div style={Object.assign({}, styles.startContainer, startWindowOpen && styles.activeTabInner)}>
                            <Icon size={18} icon="windowsStartIcon" style={styles.startIcon} />
                            <p className="toolbar-text">Start</p>
                        </div>
                    </div>
                    <div style={styles.toolbarTabsContainer}>
                        {Object.keys(windows).map((key) => (
                            <div key={key} style={Object.assign({}, styles.tabContainerOuter, lastActive === key && !windows[key].minimized && styles.activeTabOuter)} onMouseDown={() => toggleMinimize(key)}>
                                <div style={Object.assign({}, styles.tabContainer, lastActive === key && !windows[key].minimized && styles.activeTabInner)}>
                                    <Icon size={18} icon={windows[key].icon} style={styles.tabIcon} />
                                    <p style={styles.tabText}>{windows[key].name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={styles.time}><Icon style={styles.volumeIcon} icon="volumeOn" /><p style={styles.timeText}>{time}</p></div>
            </div>
        </div>
    );
};

const styles: StyleSheetCSS = {
    toolbarOuter: { boxSizing: 'border-box', position: 'absolute', bottom: 0, width: '100%', height: 32, background: Colors.lightGray, borderTop: `1px solid ${Colors.lightGray}`, zIndex: 100000 },
    toolbarInner: { display: 'flex', borderTop: `1px solid ${Colors.white}`, alignItems: 'center', height: '100%' },
    toolbar: { display: 'flex', flexGrow: 1, width: '100%', minWidth: 0 },
    startWindow: { position: 'absolute', bottom: 28, display: 'flex', width: 282, maxHeight: 'calc(100vh - 42px)', left: 4, boxSizing: 'border-box', border: `1px solid ${Colors.white}`, borderBottomColor: Colors.black, borderRightColor: Colors.black, background: Colors.lightGray, overflow: 'hidden' },
    startWindowInner: { display: 'flex', border: `1px solid ${Colors.lightGray}`, borderBottomColor: Colors.darkGray, borderRightColor: Colors.darkGray, flex: 1, minHeight: 0 },
    verticalStartContainer: { display: 'flex', background: Colors.darkGray, alignItems: 'flex-end' },
    verticalText: { fontFamily: 'Terminal', fontSize: 25, padding: 5, paddingBottom: 10, letterSpacing: 1, color: Colors.lightGray, transform: 'scale(-1)', writingMode: 'tb-rl' as any },
    startWindowContent: { display: 'flex', flex: 1, minWidth: 0, flexDirection: 'column', justifyContent: 'flex-end' },
    programList: { display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '3px 0' },
    startMenuOption: { display: 'flex', flexShrink: 0, width: '100%', alignItems: 'center', gap: 8, minHeight: 42, padding: '5px 10px', border: 0, background: Colors.lightGray, color: Colors.black, fontFamily: 'MSSerif', textAlign: 'left', cursor: 'pointer' },
    startMenuIcon: { width: 30, height: 30, flexShrink: 0 },
    startMenuText: { fontSize: 13 },
    startMenuLine: { height: 1, flexShrink: 0, background: Colors.white, borderTop: `1px solid ${Colors.darkGray}` },
    activeTabOuter: { border: `1px solid ${Colors.black}`, borderBottomColor: Colors.white, borderRightColor: Colors.white },
    activeTabInner: { border: `1px solid ${Colors.darkGray}`, borderBottomColor: Colors.lightGray, borderRightColor: Colors.lightGray, backgroundImage: 'linear-gradient(45deg, white 25%, transparent 25%), linear-gradient(-45deg, white 25%, transparent 25%), linear-gradient(45deg, transparent 75%, white 75%), linear-gradient(-45deg, transparent 75%, white 75%)', backgroundSize: '4px 4px', backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px', pointerEvents: 'none' },
    startContainerOuter: { marginLeft: 3, boxSizing: 'border-box', cursor: 'pointer', border: `1px solid ${Colors.white}`, borderBottomColor: Colors.black, borderRightColor: Colors.black },
    startContainer: { display: 'flex', alignItems: 'center', border: `1px solid ${Colors.lightGray}`, borderBottomColor: Colors.darkGray, borderRightColor: Colors.darkGray, padding: 1, paddingLeft: 5, paddingRight: 5 },
    startIcon: { marginRight: 4 },
    toolbarTabsContainer: { display: 'flex', flex: 1, minWidth: 0, marginLeft: 4, marginRight: 4 },
    tabContainerOuter: { display: 'flex', flex: 1, maxWidth: 300, minWidth: 0, marginRight: 4, boxSizing: 'border-box', cursor: 'pointer', border: `1px solid ${Colors.white}`, borderBottomColor: Colors.black, borderRightColor: Colors.black },
    tabContainer: { display: 'flex', minWidth: 0, border: `1px solid ${Colors.lightGray}`, borderBottomColor: Colors.darkGray, borderRightColor: Colors.darkGray, alignItems: 'center', paddingLeft: 4, flex: 1 },
    tabIcon: { marginRight: 6, flexShrink: 0 },
    tabText: { fontSize: 14, fontFamily: 'MSSerif', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
    time: { display: 'flex', flexShrink: 0, width: 92, height: 24, boxSizing: 'border-box', marginRight: 4, paddingLeft: 4, paddingRight: 4, border: `1px solid ${Colors.white}`, borderTopColor: Colors.darkGray, justifyContent: 'space-between', alignItems: 'center', borderLeftColor: Colors.darkGray },
    volumeIcon: { cursor: 'pointer', height: 18 },
    timeText: { fontSize: 12, fontFamily: 'MSSerif' },
};

export default Toolbar;
