import React from 'react';
import CoreAppFrame from './CoreAppFrame';

const WebampPlayer: React.FC<WindowAppProps> = (props) => (
    <CoreAppFrame {...props} title="Winamp" width={760} height={590} status="Webamp 2 • local files stay local">
        <iframe title="Webamp" src="apps/webamp/index.html" style={styles.iframe} />
    </CoreAppFrame>
);

const styles: StyleSheetCSS = {
    iframe: { flex: 1, width: '100%', minHeight: 0, border: 0, backgroundColor: '#111111' },
};

export default WebampPlayer;
