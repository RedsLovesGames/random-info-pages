import {buildSegments} from './geometry.js';
const PALETTES={
  auto:['#24b7e9','#6ee15a','#8b75ef','#ffc34d','#ec66c1','#53dfc2','#f27963','#6d9ef7','#efdf57','#a77cf1','#4bd0ef','#ff7db7'],
  pastel:['#9dd9f3','#a9e5bb','#c9b7f5','#f8d796','#f2b5d4','#9ee0d8','#f1b29e','#b8caf4'],
  cool:['#2ab7ca','#4f7cff','#7a6ff0','#27c2a5','#53a7e8','#886be7','#37ced7'],
  warm:['#ffb84d','#ff835c','#ef5fa7','#ffd45e','#f36f56','#d86ca8','#f29c47'],
  mono:['#f3f3f5','#d7d7db','#bcbcc3','#a0a1a9','#858690','#6e707a']
};
const imageCache=new Map();
function luminance(hex){const h=String(hex).replace('#','');if(!/^[0-9a-f]{6}$/i.test(h))return .5;const rgb=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]}
function fitCanvas(canvas,ctx){const dpr=Math.min(3,globalThis.devicePixelRatio||1),rect=canvas.getBoundingClientRect(),w=Math.max(1,Math.floor(rect.width*dpr)),h=Math.max(1,Math.floor(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}ctx.setTransform(dpr,0,0,dpr,0,0);return{w:rect.width,h:rect.height}}
function trimText(ctx,text,max){let s=String(text);if(ctx.measureText(s).width<=max)return s;while(s.length>1&&ctx.measureText(s+'…').width>max)s=s.slice(0,-1);return s+'…'}
function cachedImage(src,onLoad){if(!src)return null;if(imageCache.has(src))return imageCache.get(src);const img=new Image();imageCache.set(src,img);img.onload=()=>onLoad?.();img.src=src;return img}
export function drawWheel(ctx,canvas,wheel,rotation=0,options={}){
  const {w,h}=fitCanvas(canvas,ctx);ctx.clearRect(0,0,w,h);const cx=w/2,cy=h/2,r=Math.max(30,Math.min(w,h)*.435);
  const entries=(wheel?.entries||[]).filter(e=>String(e.label||'').trim()&&Number(e.weight)>0);const segments=buildSegments(entries);const palette=PALETTES[options.palette]||PALETTES.auto;
  ctx.save();ctx.translate(cx,cy);ctx.rotate(rotation);
  segments.forEach((s,i)=>{
    const color=s.entry.color||palette[i%palette.length];ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r,s.startAngle,s.endAngle);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='rgba(255,255,255,.34)';ctx.lineWidth=1;ctx.stroke();
    const arc=s.endAngle-s.startAngle;if(segments.length<=120&&arc>.018){ctx.save();ctx.rotate(s.centerAngle);const fontSize=Math.max(11,Math.min(31,r*.073,arc*r*.31));ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillStyle=luminance(color)>.49?'#15171b':'#fff';ctx.font=`600 ${fontSize}px system-ui`;const image=cachedImage(s.entry.image,options.onImageLoad);const hasImage=Boolean(image?.complete&&image.naturalWidth);if(hasImage){ctx.save();const ir=Math.min(24,r*.058);ctx.beginPath();ctx.arc(r*.76,0,ir,0,Math.PI*2);ctx.clip();ctx.drawImage(image,r*.76-ir,-ir,ir*2,ir*2);ctx.restore()}ctx.fillText(trimText(ctx,s.entry.label,r*(hasImage?.1:.64)),r*(hasImage?.68:.86),0);ctx.restore()}
  });ctx.restore();
  ctx.beginPath();ctx.arc(cx,cy,Math.max(18,r*.092),0,Math.PI*2);ctx.fillStyle=options.hubColor||'#f0f0ee';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.88)';ctx.stroke();
  ctx.save();ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(cx+r-2,cy);ctx.lineTo(cx+r+30,cy-18);ctx.lineTo(cx+r+30,cy+18);ctx.closePath();ctx.fillStyle=options.pointerColor||'#9ef0c8';ctx.fill();ctx.restore();
  return segments;
}
