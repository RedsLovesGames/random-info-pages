import React from 'react';

import windowResize from './windowResize.png';
import maximize from './maximize.png';
import minimize from './minimize.png';
import computerBig from './computerBig.png';
import computerSmall from './computerSmall.png';
import myComputer from './myComputer.png';
import showcaseIcon from './showcaseIcon.png';
import doomIcon from './doomIcon.png';
import henordleIcon from './henordleIcon.png';
import credits from './credits.png';
import volumeOn from './volumeOn.png';
import volumeOff from './volumeOff.png';
import trailIcon from './trailIcon.png';
import windowGameIcon from './windowGameIcon.png';
import windowExplorerIcon from './windowExplorerIcon.png';
import windowsStartIcon from './windowsStartIcon.png';
import scrabbleIcon from './scrabbleIcon.png';
import close from './close.png';
import folderAccessories from './folderAccessories.svg';
import folderGames from './folderGames.svg';
import paintIcon from './paintIcon.svg';
import winampIcon from './winampIcon.svg';
import stickyIcon from './stickyIcon.svg';
import timerIcon from './timerIcon.svg';
import sandIcon from './sandIcon.svg';
import pixelIcon from './pixelIcon.svg';

const icons = {
    windowResize,
    maximize,
    minimize,
    computerBig,
    computerSmall,
    myComputer,
    showcaseIcon,
    doomIcon,
    volumeOn,
    volumeOff,
    credits,
    scrabbleIcon,
    henordleIcon,
    close,
    windowGameIcon,
    windowExplorerIcon,
    windowsStartIcon,
    trailIcon,
    folderAccessories,
    folderGames,
    paintIcon,
    winampIcon,
    stickyIcon,
    timerIcon,
    sandIcon,
    pixelIcon,
};

export type IconName = keyof typeof icons;

const getIconByName = (
    iconName: IconName
    // @ts-ignore
): React.FC<React.SVGAttributes<SVGElement>> => icons[iconName];

export default getIconByName;
