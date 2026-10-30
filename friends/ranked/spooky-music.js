/* Original spooky arcade music for Rank Riot.
   No third-party recordings, copyrighted melodies, video players or external audio requests.
   Starts after a user gesture because browsers block audible autoplay.
*/
(function(root){
  'use strict';
  root.RankRiotSpookyMusic=function(){
    let context=null,master=null,loop=null,nextTime=0,step=0,enabled=true,volume=.32,phase='home';
    // This recording is streamed from Kahoot!'s own official public Halloween article.
    // It is never downloaded, mirrored, or embedded as a video by Rank Riot.
    const officialTrack='https://kahoot.com/files/2022/10/Lobby-Music-Halloween-Edition.mp3';
    let audio=null,remoteFailed=false,activeSource='pending';
    const bpm=124,beat=60/bpm,stepTime=beat/4;
    const note=(midi)=>440*Math.pow(2,(midi-69)/12);
    const melody=[76,null,79,78,76,73,75,null,76,83,81,null,79,78,75,73,
                  76,null,79,81,83,81,79,76,75,null,73,75,76,null,71,73];
    const bass=[45,45,45,45,43,43,43,43,41,41,41,41,40,40,40,40];
    const ghost=[69,72,76,72,67,72,76,72,65,69,72,69,64,68,71,68];
    function ctx(){
      if(!context){
        const AC=root.AudioContext||root.webkitAudioContext;if(!AC)return null;
        context=new AC();master=context.createGain();master.gain.value=0;
        const low=context.createBiquadFilter();low.type='lowpass';low.frequency.value=6500;
        master.connect(low);low.connect(context.destination);
      }
      return context;
    }
    function tone(hz,when,duration,level,type='triangle',detune=0){
      if(!context||!master)return;
      const osc=context.createOscillator(),g=context.createGain();
      osc.type=type;osc.frequency.setValueAtTime(hz,when);osc.detune.value=detune;
      g.gain.setValueAtTime(.0001,when);
      g.gain.exponentialRampToValueAtTime(Math.max(.0002,level),when+.013);
      g.gain.exponentialRampToValueAtTime(.0001,when+duration);
      osc.connect(g);g.connect(master);osc.start(when);osc.stop(when+duration+.012);
      osc.onended=()=>{osc.disconnect();g.disconnect()};
    }
    function percussion(when,strength=.14){
      if(!context||!master)return;
      const osc=context.createOscillator(),g=context.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(130,when);
      osc.frequency.exponentialRampToValueAtTime(42,when+.13);
      g.gain.setValueAtTime(Math.max(.0002,strength),when);
      g.gain.exponentialRampToValueAtTime(.0001,when+.17);
      osc.connect(g);g.connect(master);osc.start(when);osc.stop(when+.19);
      osc.onended=()=>{osc.disconnect();g.disconnect()};
    }
    function tick(when,i){
      const n=i%32,bar=Math.floor(i/16)%4,beat16=i%16;
      const energy=phase==='reveal'?.5:phase==='leaderboard'?.7:phase==='finished'?.78:phase==='question'?1:.9;
      if(beat16===0||beat16===8)percussion(when,.11*energy);
      if(beat16===4||beat16===12)tone(182,when,.065,.045*energy,'square');
      if(i%2===0)tone(1100+(i%4)*170,when,.03,.008*energy,'triangle');
      if(i%4===0){tone(note(bass[bar*4+Math.floor(beat16/4)]),when,.29,.125*energy,'sawtooth');}
      if(i%2===0){tone(note(ghost[(bar*4+Math.floor(beat16/4))%16]+12),when,.12,.018*energy,'sine');}
      if(melody[n]!==null){
        tone(note(melody[n]),when,.1+(i%4===0?.09:0),.043*energy,'triangle');
        if(i%8===0)tone(note(melody[n]-12),when,.17,.012*energy,'sine',7);
      }
    }
    function schedule(){
      if(!context||!enabled||context.state!=='running')return;
      if(nextTime<context.currentTime-.3)nextTime=context.currentTime+.04;
      while(nextTime<context.currentTime+.22){
        tick(nextTime,step);nextTime+=stepTime;step=(step+1)%64;
      }
    }
    function fade(level){
      if(!context||!master)return;
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(level,context.currentTime,.12);
    }
    function targetVolume(){return Math.min(1,volume)*(phase==='reveal'?.53:phase==='finished'?.68:phase==='leaderboard'?.74:1);}
    async function startGenerated(){
      if(!enabled)return false;
      try{
        const ac=ctx();if(!ac)return false;
        await ac.resume();
        if(!loop){nextTime=ac.currentTime+.06;loop=root.setInterval(schedule,70);}
        activeSource='original-fallback';fade(targetVolume());schedule();return ac.state==='running';
      }catch{return false}
    }
    async function start(){
      if(!enabled)return false;
      if(remoteFailed||typeof root.Audio!=='function')return startGenerated();
      try{
        if(!audio){
          audio=new root.Audio();
          audio.src=officialTrack;
          audio.loop=true;audio.preload='auto';
          audio.addEventListener('error',()=>{
            if(enabled){remoteFailed=true;activeSource='original-fallback';startGenerated();}
          });
        }
        audio.volume=targetVolume();
        await audio.play();
        activeSource='kahoot-official';fade(0);return true;
      }catch(e){
        // Some browsers block playback until a user gesture. Do not misidentify
        // this as a broken track and do not evade browser autoplay restrictions.
        if(e?.name==='NotAllowedError')return false;
        remoteFailed=true;return startGenerated();
      }
    }
    function stop(){
      enabled=false;
      if(audio)audio.pause();
      fade(0);activeSource='muted';
    }
    function enable(on){
      enabled=Boolean(on);
      if(enabled)start();else stop();
    }
    function setVolume(v){
      volume=Math.max(0,Math.min(1,Number(v)||0));
      if(audio)audio.volume=targetVolume();
      if(enabled&&loop&&activeSource!=='kahoot-official')fade(targetVolume());
    }
    function setPhase(next){
      phase=next||'home';
      if(audio)audio.volume=targetVolume();
      if(enabled&&context)fade(activeSource==='kahoot-official'?0:targetVolume());
    }
    function dispose(){
      if(loop){root.clearInterval(loop);loop=null}
      if(audio){audio.pause();audio.src='';audio=null}
      if(context){context.close().catch(()=>{});context=null;master=null}
    }
    return {start,enable,stop,setPhase,setVolume,dispose,get enabled(){return enabled},get volume(){return volume},get phase(){return phase},get source(){return activeSource}};
  };
})(window);
