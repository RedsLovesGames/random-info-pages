import {LANES,lowerBound,noteName} from './music.mjs';

const colors = ['#ff9b75','#f7c976','#f3e598','#bcdfb1','#89dccb','#8fc8ff','#b1aafa','#eaa6db'];
const flight = .88;
const impact = .28;
const palette = {panel:'#192330', rim:'#3c4a5a', metal:'#9f8051', highlight:'#f9dfa7', bottom:'#111822'};

function laneFor(hit) {
  if (hit.lane !== undefined) return hit.lane;
  if (hit.channel === 9) return hit.note < 37 ? 0 : hit.note < 42 ? 1 : 2;
  return 3 + (hit.note % 12) % 5;
}

export function makeMachine(canvas) {
  const context = canvas.getContext('2d');
  const background = document.createElement('canvas');
  const staticCtx = background.getContext('2d');
  let width=1, height=1, scale=1, lanes=[], model=null;
  const pulses = [];

  function layout(song) {
    const box = canvas.getBoundingClientRect();
    if (box.width < 32 || box.height < 32) {
      lanes = [];
      return;
    }
    width = box.width;
    height = box.height;
    scale = Math.min(1.75, devicePixelRatio || 1);
    canvas.width = background.width = Math.round(width * scale);
    canvas.height = background.height = Math.round(height * scale);
    context.setTransform(scale,0,0,scale,0,0);
    staticCtx.setTransform(scale,0,0,scale,0,0);
    model = song;
    const side = Math.max(14,width*.095);
    const spacing = (width - side * 2) / LANES.length;
    const swing = Math.min(19,spacing*.28);
    lanes = LANES.map((lane,i) => ({
      x:side + spacing * (i+.5), radius:Math.min(8.5,spacing*.16), spacing,
      side:i%2 ? 1 : -1, swing, color:colors[i],
      shape:song?.rails?.[i] || 0,
      label:song?.kind === 'pattern' ? (lane.channel === 9 ? lane.label : noteName(song.tuning?.[i] ?? lane.note))
        : String(i+1).padStart(2,'0'),
    }));
    drawBoard();
  }

  function position(lane, progress) {
    const p = Math.max(0,Math.min(1,progress));
    const wave = Math.sin(p * Math.PI * 3);
    const curve = lane.shape === 2 ? 0 : lane.shape === 1 ? Math.asin(wave) / (Math.PI / 2) : wave;
    return {
      x:lane.x + curve * lane.swing * lane.side,
      y:height * (.195 + p * .595),
    };
  }

  function line(ctx,x1,y1,x2,y2,color,lineWidth=1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
  }

  function plate(ctx,x,y,w,h,r,color) {
    ctx.fillStyle=color;
    ctx.beginPath();
    ctx.roundRect(x,y,w,h,r);
    ctx.fill();
  }

  function drawBoard() {
    const ctx = staticCtx;
    const panel = ctx.createLinearGradient(0,0,0,height);
    panel.addColorStop(0,'#263546');
    panel.addColorStop(.58,palette.panel);
    panel.addColorStop(1,palette.bottom);
    ctx.fillStyle=panel;
    ctx.fillRect(0,0,width,height);
    const pitch = Math.max(16,Math.min(28,width/25));
    ctx.fillStyle='#aac0da26';
    for (let y=11; y<height; y+=pitch) {
      for (let x=pitch*.5; x<width; x+=pitch) {
        ctx.beginPath(); ctx.arc(x,y,.85,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.strokeStyle=palette.rim;
    ctx.lineWidth=1;
    ctx.strokeRect(8.5,8.5,width-17,height-17);
    const metal=ctx.createLinearGradient(0,height*.103,0,height*.16);
    metal.addColorStop(0,'#e6c689');
    metal.addColorStop(.45,'#a98250');
    metal.addColorStop(1,'#795733');
    plate(ctx,width*.1,height*.105,width*.8,height*.052,4,metal);
    line(ctx,width*.11,height*.12,width*.89,height*.12,'#ebd49a88');
    plate(ctx,width*.095,height*.813,width*.81,height*.08,5,'#090e18b0');
    line(ctx,width*.11,height*.901,width*.89,height*.901,palette.rim);
    ctx.lineCap='round';
    for (const lane of lanes) {
      plate(ctx,lane.x-lane.radius-2,height*.14,lane.radius*2+4,height*.065,3,'#0b1321');
      plate(ctx,lane.x-lane.radius,height*.144,lane.radius*2,height*.039,2,'#a48152');
      for (const delta of [-lane.radius*.85,lane.radius*.85]) {
        ctx.beginPath();
        for (let i=0; i<=40; i++) {
          const p=position(lane,i/40);
          if(i===0) ctx.moveTo(p.x+delta,p.y);
          else ctx.lineTo(p.x+delta,p.y);
        }
        ctx.strokeStyle='#090e17b8'; ctx.lineWidth=4.7; ctx.stroke();
        ctx.strokeStyle=palette.metal; ctx.lineWidth=2.1; ctx.stroke();
        ctx.strokeStyle='#f4cf865e'; ctx.lineWidth=.65; ctx.stroke();
      }
      for (const t of [.13,.33,.57,.82]) {
        const p=position(lane,t);
        line(ctx,p.x-lane.radius*1.3,p.y,p.x+lane.radius*1.3,p.y,'#ba9c655e',1);
      }
      const keyWidth = Math.min(58,lane.spacing*.76);
      plate(ctx,lane.x-keyWidth*.5,height*.79,keyWidth,height*.049,3,'#090c1299');
      plate(ctx,lane.x-keyWidth*.5,height*.78,keyWidth,height*.041,3,lane.color+'a6');
      line(ctx,lane.x-keyWidth*.36,height*.787,lane.x+keyWidth*.36,height*.787,lane.color,1.25);
      ctx.fillStyle='#c2cbd8';
      ctx.font='500 '+(width<490?9:11)+'px ui-monospace, monospace';
      ctx.textAlign='center';
      ctx.fillText(lane.label,lane.x,height*.88);
    }
  }

  function marble(ctx,lane,x,y,opacity,radius=lane.radius) {
    ctx.save();
    ctx.globalAlpha=opacity;
    const pearl=ctx.createRadialGradient(x-radius*.37,y-radius*.45,Math.max(0,radius*.04),x,y,radius);
    pearl.addColorStop(0,'#fffffff2');
    pearl.addColorStop(.22,lane.color);
    pearl.addColorStop(.7,lane.color);
    pearl.addColorStop(1,'#292335');
    ctx.fillStyle='#0b102388';
    ctx.beginPath();ctx.ellipse(x+2.8,y+4,radius*1.05,radius*.85,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=pearl;
    ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  function draw(song,time,running,clock) {
    if (model !== song || !lanes.length) layout(song);
    if (!lanes.length) return;
    context.drawImage(background,0,0,width,height);
    const events = song.events;
    const flashes = new Float32Array(lanes.length);
    if (running || time > 0) {
      const first = lowerBound(events,time-impact);
      const last = lowerBound(events,time+flight);
      for (let index = first; index < last && index-first<320; index++) {
        const hit=events[index], lane=lanes[laneFor(hit)], until=hit.time-time;
        if (until > 0) {
          const p = position(lane,1-until/flight);
          marble(context,lane,p.x,p.y,Math.min(1,(flight-until)*6+.25));
        } else {
          const elapsed=-until;
          const bounce = Math.sin(Math.PI*Math.min(1,elapsed/impact));
          marble(context,lane,lane.x+elapsed*50*lane.side,height*(.782-.13*bounce),
            1-elapsed/impact,lane.radius*(1-elapsed*.9));
          const laneIndex=laneFor(hit);
          flashes[laneIndex]=Math.max(flashes[laneIndex],(1-elapsed/impact)*hit.velocity);
        }
      }
    } else {
      for (const lane of lanes) marble(context,lane,lane.x,height*.18,1);
    }
    for (let i=pulses.length-1; i>=0; i--) {
      const pulse=pulses[i], age=(clock-pulse.time)/1000;
      if(age > .8) { pulses.splice(i,1); continue; }
      const lane=lanes[pulse.lane], positionNow=position(lane,Math.min(1,age/.57));
      marble(context,lane,positionNow.x,positionNow.y,Math.min(1,(.8-age)*9));
      if(age>.57) flashes[pulse.lane]=Math.max(flashes[pulse.lane],1-(age-.57)/.23);
    }
    for (let i=0;i<flashes.length;i++) {
      if(!flashes[i]) continue;
      const lane=lanes[i];
      const x=lane.x,y=height*.795,r=Math.max(12,lane.spacing*.63);
      const glow=context.createRadialGradient(x,y,1,x,y,r);
      glow.addColorStop(0,lane.color);
      glow.addColorStop(1,lane.color+'00');
      context.save();context.globalAlpha=flashes[i]*.6;
      context.fillStyle=glow;context.fillRect(x-r,y-r,r*2,r*2);context.restore();
    }
  }

  return {
    draw, resize:() => layout(model),
    testDrop:(lane,time) => pulses.push({lane,time}),
    get idle() { return pulses.length === 0; },
  };
}
