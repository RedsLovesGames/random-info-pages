import React from 'react';
import {createRoot} from 'react-dom/client';
import {Editor} from 'ketcher-react';
import {StandaloneStructServiceProvider} from 'ketcher-standalone';
import 'ketcher-react/dist/index.css';
import './style.css';
const provider=new StandaloneStructServiceProvider();
function Shell(){
 return <div className="ketcher-shell"><Editor staticResourcesUrl="./ketcher-static/" structServiceProvider={provider} onInit={editor=>{window.ketcher=editor;window.parent.postMessage({eventType:'init',source:'stereolab-ketcher'},window.location.origin);}} /></div>;
}
window.addEventListener('error',e=>{window.parent.postMessage({eventType:'error',source:'stereolab-ketcher',message:String(e.message||'Editor script failure')},window.location.origin);});
createRoot(document.getElementById('root')).render(<Shell/>);
