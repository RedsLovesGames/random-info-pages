/* Silent, local canvas recording for visual projects.
 * Requires MediaRecorder; never requests microphone/camera or uploads content. */
export const MAX_RECORD_SECONDS=45;
export const MAX_RECORD_BYTES=120*1024*1024;
const formats=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'];
export function mediaType(isSupported){
 return formats.find(type=>typeof isSupported==='function'&&isSupported(type))||'';
}
export function pickCanvas(doc=document){
 const style=element=>getComputedStyle(element);
 const matches=[...doc.querySelectorAll('canvas')].filter(canvas=>{
  if(canvas.hidden||canvas.closest('[hidden]')||!canvas.width||!canvas.height)return false;
  const rect=canvas.getBoundingClientRect(),computed=style(canvas);
  return rect.width>32&&rect.height>32&&computed.display!=='none'&&computed.visibility!=='hidden'&&
   Number(computed.opacity)!==0;
 });
 return matches.sort((a,b)=>{
  const aSize=a.getBoundingClientRect(),bSize=b.getBoundingClientRect();
  const screenDiff=bSize.width*bSize.height-aSize.width*aSize.height;
  return screenDiff||b.width*b.height-a.width*a.height;
 })[0]||null;
}
export function canRecord(){return typeof MediaRecorder!=='undefined'&&
 typeof HTMLCanvasElement!=='undefined'&&
 typeof HTMLCanvasElement.prototype.captureStream==='function'}
export function startCanvasRecording(canvas,{onDone=()=>{},onError=()=>{},onProgress=()=>{},
  fps=30,maxSeconds=MAX_RECORD_SECONDS}={}){
 if(!canRecord())throw new Error('Video recording is unavailable in this browser');
 if(!(canvas instanceof HTMLCanvasElement)||!canvas.width||!canvas.height)
  throw new Error('Choose a visible, non-empty canvas to record');
 const format=mediaType(MediaRecorder.isTypeSupported?.bind(MediaRecorder));
 if(!format)throw new Error('No supported WebM or MP4 recording format was found');
 if(!Number.isFinite(fps)||fps<1||fps>60)throw new RangeError('Invalid frame rate');
 const limit=Math.max(1,Math.min(MAX_RECORD_SECONDS,Number(maxSeconds)||MAX_RECORD_SECONDS));
 const stream=canvas.captureStream(fps);
 if(!stream.getVideoTracks().length){stream.getTracks().forEach(track=>track.stop());throw new Error('Canvas capture did not provide video')}
 const chunks=[];
 let bytes=0,ended=false,overflow=false;
 let timer=null,deadline=null;
 const start=Date.now();
 const recorder=new MediaRecorder(stream,{mimeType:format,videoBitsPerSecond:8_000_000});
 const cleanup=()=>{
  if(timer!==null)clearInterval(timer);
  if(deadline!==null)clearTimeout(deadline);
  stream.getTracks().forEach(track=>track.stop());
 };
 const stop=()=>{if(recorder.state!=='inactive')recorder.stop()};
 recorder.ondataavailable=event=>{
  if(!event.data?.size)return;
  bytes+=event.data.size;
  if(bytes>MAX_RECORD_BYTES){overflow=true;stop();return}
  chunks.push(event.data);
 };
 recorder.onerror=event=>{
  if(ended)return;
  ended=true;cleanup();onError(event.error||new Error('Video recording failed'));
 };
 recorder.onstop=()=>{
  if(ended)return;
  ended=true;cleanup();
  if(overflow)return onError(new Error('Recording reached the 120 MB safety limit'));
  const blob=new Blob(chunks,{type:recorder.mimeType||format});
  if(!blob.size)return onError(new Error('No video frames were recorded'));
  const extension=blob.type.startsWith('video/mp4')?'mp4':'webm';
  onDone(blob,extension);
 };
 try{
  recorder.start(1000);
  timer=setInterval(()=>onProgress(Math.min(limit,Math.floor((Date.now()-start)/1000)),limit),1000);
  deadline=setTimeout(stop,limit*1000);
 }catch(error){
  ended=true;cleanup();throw error;
 }
 return {stop,get active(){return recorder.state!=='inactive'},format,canvas};
}
