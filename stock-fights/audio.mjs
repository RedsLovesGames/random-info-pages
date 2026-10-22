// Purpose-built synthesized effects. Source samples can be supplied per fighter locally;
// no original Spenn sound recordings are represented as included here.
export function createCombatAudio() {
  let ctx=null,enabled=false,master=null,volume=.42,delayUntil=0;
  const samples=new Map();
  const Ctx=()=>window.AudioContext||window.webkitAudioContext;
  function unlock(){
    if(!ctx){const AudioCtx=Ctx();if(!AudioCtx)return false;ctx=new AudioCtx();master=ctx.createGain();master.gain.value=volume;master.connect(ctx.destination);}
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    return true;
  }
  const now=()=>ctx.currentTime;
  function osc(type,from,to,duration,gain=.08,offset=0){
    const start=now()+offset,o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(Math.max(20,from),start);
    if(to!==from)o.frequency.exponentialRampToValueAtTime(Math.max(20,to),start+duration);
    g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(gain,start+.008);
    g.gain.exponentialRampToValueAtTime(.0001,start+duration);
    o.connect(g);g.connect(master);o.start(start);o.stop(start+duration+.02);
  }
  function noise(duration=.12,filter=1700,gain=.13,offset=0){
    const sampleRate=ctx.sampleRate,buffer=ctx.createBuffer(1,Math.ceil(sampleRate*duration),sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*4.8);
    const source=ctx.createBufferSource(),biq=ctx.createBiquadFilter(),g=ctx.createGain(),start=now()+offset;
    source.buffer=buffer;biq.type='lowpass';biq.frequency.value=filter;
    g.gain.setValueAtTime(Math.max(.001,gain),start);g.gain.exponentialRampToValueAtTime(.0001,start+duration);
    source.connect(biq);biq.connect(g);g.connect(master);source.start(start);source.stop(start+duration+.015);
  }
  function sfx(kind,strength=1){
    strength=Math.min(2,Math.max(.2,strength));
    switch(kind){
      case 'punch':osc('sine',120,42,.095,.17*strength);noise(.095,560,.25*strength);break;
      case 'impact':osc('triangle',210,70,.11,.12*strength);noise(.12,1100,.16*strength);break;
      case 'knife':noise(.22,4200,.13);osc('sawtooth',1000,180,.15,.028);break;
      case 'gun':noise(.16,2300,.2);osc('square',100,55,.11,.11);break;
      case 'firework':noise(.38,1500,.22);osc('sawtooth',340,85,.36,.12);break;
      case 'blast':osc('sawtooth',180,30,.67,.19*strength);noise(.72,680,.22*strength);break;
      case 'clock':osc('sine',1450,750,.065,.065);osc('sine',950,620,.07,.055,.082);break;
      case 'sleep':osc('sine',580,310,.38,.048);osc('sine',390,210,.39,.03,.11);break;
      case 'magic':osc('sine',460,1300,.31,.055);osc('sine',680,1700,.36,.035,.065);break;
      case 'bounce':osc('sine',250,110,.085,.065);break;
      case 'heal':osc('sine',470,880,.21,.035);osc('sine',650,1120,.22,.03,.12);break;
      case 'block':noise(.06,2700,.065);osc('triangle',850,340,.11,.10);break;
      case 'victory':for(let i=0;i<4;i++)osc('triangle',[392,494,587,784][i],[392,494,587,784][i],.25,.055,i*.15);break;
      default:osc('triangle',420,170,.13,.045);break;
    }
  }
  const soundByProjectile={
    pellet:'gun',bullet:'gun',rocket:'gun',finger:'gun',cleaver:'knife','stuck-knife':'knife',
    clock:'clock',magic:'magic',rabbit:'magic',gravity:'magic',glasses:'magic',
    sleep:'sleep',skeleton:'magic',firework:'firework',car:'gun',syringe:'knife',
    bottle:'impact',note:'magic',card:'impact',paper:'impact',watermark:'bounce',
    pong:'bounce',spike:'impact',nail:'impact',hammer:'impact',rain:'bounce',hail:'impact'
  };
  return {
    get enabled(){return enabled;},
    setEnabled(flag){enabled=Boolean(flag);if(enabled)unlock();},
    setVolume(n){volume=Math.max(0,Math.min(1,n));if(master)master.gain.value=volume;},
    setSample(id,url){if(url)samples.set(id,url);else samples.delete(id);},
    play(kind='impact',strength=1,id=null){
      if(!enabled||!unlock())return;
      const t=performance.now();
      if(t<delayUntil)return;
      delayUntil=t+(kind==='impact'||kind==='punch'?72:115);
      const sample=id&&samples.get(id);
      if(sample){
        try{const audio=new Audio(sample);audio.volume=Math.min(1,volume*.85);audio.play().catch(()=>{});return;}catch{}
      }
      sfx(kind,strength);
    },
    attack(type,id){this.play(soundByProjectile[type]||'impact',1,id);},
    cueStart(){if(!enabled||!unlock())return;osc('square',280,280,.07,.05);osc('square',420,420,.1,.05,.11);osc('square',610,610,.12,.08,.25);},
    cueEnd(){this.play('victory');}
  };
}
