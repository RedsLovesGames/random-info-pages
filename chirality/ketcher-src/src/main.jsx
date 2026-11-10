import React from 'react';
import {createRoot} from 'react-dom/client';
import {Editor} from 'ketcher-react';
import {StandaloneStructServiceProvider} from 'ketcher-standalone';
import 'ketcher-react/dist/index.css';
import './style.css';
const provider=new StandaloneStructServiceProvider();
const boot=(msg)=>{const el=document.getElementById('bootstatus');if(el){el.textContent=msg;el.style.color='#a13434';}};
function Shell(){
 return <div className="ketcher-shell"><Editor staticResourcesUrl="./" structServiceProvider={provider} errorHandler={msg=>boot('Ketcher error: '+String(msg))} onInit={editor=>{window.ketcher=editor;document.getElementById('bootstatus')?.remove();window.parent.postMessage({eventType:'init',source:'stereolab-ketcher'},window.location.origin);}} /></div>;
}
window.addEventListener('error',e=>{window.parent.postMessage({eventType:'error',source:'stereolab-ketcher',message:String(e.message||'Editor script failure')},window.location.origin);});
class Boundary extends React.Component{constructor(props){super(props);this.state={error:null}}static getDerivedStateFromError(error){return {error}}componentDidCatch(error){boot('Ketcher React error: '+String(error?.message||error))}render(){return this.state.error?null:this.props.children}}
try{createRoot(document.getElementById('root')).render(<Boundary><Shell/></Boundary>);}catch(e){boot('Ketcher mount error: '+e.message);throw e;}
