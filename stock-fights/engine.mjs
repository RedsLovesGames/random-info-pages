import {byId, modes} from './roster.mjs';
export const WIDTH = 760, HEIGHT = 620;
export const ARENA = Object.freeze({left:48,right:712,top:42,bottom:572});
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
export class Battle {
  constructor(options={}) {
    const {mode='duel',left=['boxing'],right=['chef'],seed=1,shrink=false}=options;
    if(!modes.includes(mode)) throw new RangeError('Unknown battle mode');
    this.mode=mode;
    this.seed=(Number(seed)>>>0)||1;
    this.randomState=this.seed;
    this.shrink=Boolean(shrink);
    this.bounds={...ARENA};
    this.time=0;this.ticks=0;this.done=false;this.winner=null;this.reason='';
    this.damageDone={left:0,right:0};this.defeated=0;this.spawned=0;this.nextId=1;
    this.projectiles=[];this.effects=[];this.items=[];this.events=[];
    this.queue={left:[],right:[]};this.actors=[];
    const valid = list => (Array.isArray(list)?list:[]).filter(id=>byId[id]);
    const a=valid(left), b=valid(right);
    this.queue.left=(mode==='teams'?a.slice(0,3):a.slice(0,1)).length ? (mode==='teams'?a.slice(0,3):a.slice(0,1)):['boxing'];
    this.queue.right=mode==='challenge'||mode==='endless'?[]:(mode==='teams'?b.slice(0,3):b.slice(0,1));
    if(!this.queue.right.length && mode!=='challenge' && mode!=='endless')this.queue.right=['chef'];
    this.total={left:this.queue.left.length,right:this.queue.right.length};
    this.spawn('left',this.queue.left.shift());
    if(mode==='challenge'||mode==='endless')this.refillHenchmen();
    else this.spawn('right',this.queue.right.shift());
    this.log('Fight!', 'start');
  }
  rand(){let s=this.randomState;s^=s<<13;s^=s>>>17;s^=s<<5;this.randomState=s>>>0;return (this.randomState>>>0)/4294967296;}
  between(a,b){return a+(b-a)*this.rand();}
  log(message,kind='event'){this.events.unshift({time:+this.time.toFixed(1),message,kind});this.events.length=Math.min(60,this.events.length);}
  spawn(side,id) {
    const f=byId[id];if(!f)return null;
    const count=this.actors.filter(a=>a.side===side&&a.hp>0).length;
    const x=side==='left'?this.bounds.left+92+count*36:this.bounds.right-92-count*36;
    const a={uid:this.nextId++,id,side,name:f.name,icon:f.icon,ability:f.ability,
      x,y:this.between(this.bounds.top+110,this.bounds.bottom-100),
      vx:(side==='left'?1:-1)*f.speed*.64,vy:this.between(-f.speed*.6,f.speed*.6),
      hp:id==='henchman'?100:1000,maxHp:id==='henchman'?100:1000,
      cooldown:this.between(.2,.8),status:0,statusType:'',phase:0,armor:id==='knight'?2:0,
      reflectCooldown:0,level:0,combo:0,fuse:-1,ammo:2,damage:0,attackCount:0,shield:0,
      direction:side==='left'?1:-1};
    this.actors.push(a);this.log(f.name+' enters the box.', 'spawn');return a;
  }
  refillHenchmen(){
    const limit=this.mode==='challenge'?30:Infinity;
    while(this.actors.filter(a=>a.side==='right'&&a.hp>0).length<3 && this.spawned<limit){
      this.spawn('right','henchman');this.spawned++;
    }
  }
  targets(a){return this.actors.filter(b=>b.hp>0&&b.side!==a.side);}
  target(a){const t=this.targets(a);return t.length?t.reduce((best,b)=>dist(a,b)<dist(a,best)?b:best):null;}
  boundsAt(t){
    if(!this.shrink)return this.bounds;
    const amount=clamp((t-14)*1.7,0,96);
    return {left:ARENA.left+amount,right:ARENA.right-amount,top:ARENA.top+amount*.55,bottom:ARENA.bottom-amount*.55};
  }
  hit(target,raw,from=null,source='hit',stun=0){
    if(!target||target.hp<=0||raw<=0)return 0;
    if(target.phase>0 && source!=='melee' && source!=='explosion')return 0;
    if(target.shield>0 && source!=='explosion')return 0;
    if(target.armor>0 && source!=='explosion'){
      target.armor--;this.effect(target.x,target.y,'BLOCK','#8696a0');return 0;
    }
    const actual=Math.min(target.hp,Math.round(raw*10)/10);
    target.hp=Math.max(0,target.hp-actual);
    if(from&&from.side!==target.side)this.damageDone[from.side]+=actual;
    if(from&&from.side!==target.side)from.damage+=actual;
    if(stun>0 && target.hp>0 && target.ability!=='blind'){target.status=Math.max(target.status,stun);target.statusType='stunned';}
    this.effect(target.x,target.y,'-'+Math.ceil(actual),target.side==='left'?'#de6354':'#346bda');
    if(target.ability==='explode' && target.fuse<0 && target.hp>0){target.fuse=10;this.log('Exploding Guy starts a 10 second fuse!','special');}
    if(target.ability==='megaphone' && target.hp>0 && source!=='sound'){
      const enemy=this.target(target);
      if(enemy){for(let i=0;i<5;i++)this.shot(target,enemy,Math.max(12,actual*.3),'sound',{angle:(i-2)*.31,speed:230,life:1.8,source:'sound'});}
    }
    return actual;
  }
  effect(x,y,text,color='#172238'){this.effects.push({x,y,text,color,life:.75});}
  shot(a,b,damage,type,opts={}){
    const {angle=0,speed=400,life=3,bounce=0,radius=11,stun=0,source='projectile',spread=0,pierce=0, friendly=false}=opts;
    const aim=Math.atan2(b.y-a.y,b.x-a.x)+angle+(this.rand()-.5)*spread;
    const v={x:Math.cos(aim)*speed,y:Math.sin(aim)*speed};
    this.projectiles.push({uid:this.nextId++,side:a.side,owner:a.uid,x:a.x+v.x/speed*35,y:a.y+v.y/speed*35,
      vx:v.x,vy:v.y,damage,type,life,bounce,radius,stun,source,pierce,friendly,hit:new Set(),
      originX:a.x,originY:a.y});
  }
  melee(a,b,range,damage,stun=0){
    if(dist(a,b)<range){this.hit(b,damage,a,'melee',stun);b.vx+=(b.x>=a.x?1:-1)*25;b.vy+=(b.y>=a.y?1:-1)*17;return true;}return false;
  }
  attack(a,b){
    if(!b||a.hp<=0)return;
    const cfg=byId[a.id],n=cfg.damage,ab=a.ability,d=dist(a,b);
    a.attackCount++;
    const fire=(damage=n,type='bullet',opts={})=>this.shot(a,b,damage,type,opts);
    if(ab==='hench'){this.melee(a,b,80,n);return;}
    if(ab==='ghost'){this.melee(a,b,74,15);a.phase=d<80?.14:0;return;}
    if(ab==='boxing'){if(!this.melee(a,b,102,d<82&&this.rand()<.26?125:45,d<76?.07:0))a.cooldown=.1;else if(this.rand()<.17)this.effect(a.x,a.y,'UPPERCUT','#e18e41');return;}
    if(ab==='jackhammer'){if(!this.melee(a,b,90,n))a.cooldown=.08;return;}
    if(ab==='knight'){if(!this.melee(a,b,112,n))a.cooldown=.14;return;}
    if(ab==='blind'){if(!this.melee(a,b,105,n))a.cooldown=.1;return;}
    if(ab==='pirate'){if(!this.melee(a,b,98,115))fire(95,'bullet',{speed:480});return;}
    if(ab==='reflect'){if(!this.melee(a,b,100,n))a.cooldown=.3;return;}
    if(ab==='charge'){a.vx=(b.x>a.x?1:-1)*295;a.vy=(b.y>a.y?1:-1)*110;this.melee(a,b,125,n);return;}
    if(ab==='bowling'){a.combo++;a.vx=(b.x>a.x?1:-1)*235;a.vy=(b.y>a.y?1:-1)*115;this.melee(a,b,108,n+Math.min(200,a.combo*15));return;}
    if(ab==='explode')return;
    if(ab==='megaphone'){fire(55,'sound',{speed:270,radius:19});return;}
    if(ab==='spikes'){for(let i=-1;i<=1;i++)fire(n,'spike',{angle:i*.18,speed:385,bounce:0,life:3.5});return;}
    if(ab==='angry'){fire(Math.round(n+(1000-a.hp)*.12),'emoji',{speed:390});return;}
    if(ab==='sleep'){fire(n,'sleep',{speed:305,stun:1.45,radius:16});return;}
    if(ab==='boomerang'){fire(n,'glasses',{speed:340,life:2.3,bounce:1,pierce:1});return;}
    if(ab==='briefcase'){fire(n,'briefcase',{speed:345,life:3.5});return;}
    if(ab==='cleaver'){
      if(a.ammo<=0){a.cooldown=.2;return;}
      a.ammo--;fire(n,'cleaver',{speed:470,life:9,pierce:1});return;
    }
    if(ab==='nail'){fire(n,'nail',{speed:390});return;}
    if(ab==='cards'){
      const roll=this.rand(),mult=roll<.04?10:roll<.13?4:roll<.4?1.8:.65;
      for(let i=0;i<5;i++)fire(Math.ceil(n*mult/3),'card',{speed:330,angle:(i-2)*.11});
      this.effect(a.x,a.y,mult>=4?'ROYAL FLUSH!':'DEAL!','#f4c153');return;
    }
    if(ab==='bottle'){fire(this.rand()<.13?200:n,'bottle',{speed:390,spread:1.3});return;}
    if(ab==='magic'){
      if(this.rand()<.34){a.x=clamp(b.x+(this.rand()<.5?-1:1)*this.between(85,200),this.bounds.left+38,this.bounds.right-38);a.y=clamp(b.y+this.between(-130,130),this.bounds.top+45,this.bounds.bottom-45);this.effect(a.x,a.y,'POOF!','#b37be3');}
      fire(n,'rabbit',{speed:345,angle:this.between(-.3,.3)});return;
    }
    if(ab==='gravity'){
      for(let i=0;i<2;i++)fire(n,'gravity',{speed:280,angle:(i-.5)*.4,bounce:2,life:4});return;
    }
    if(ab==='pong'){
      if(!this.projectiles.some(p=>p.owner===a.uid&&p.type==='pong'))
        fire(n,'pong',{speed:510,life:120,bounce:999,radius:11,pierce:999});return;
    }
    if(ab==='watermark'){fire(Math.min(1024,Math.pow(2,Math.min(10,a.level++))),'watermark',{speed:340});return;}
    if(ab==='time'){fire(n,'clock',{speed:390});if(a.attackCount%3===0){fire(n,'clock',{speed:405,angle:.25});this.effect(a.x,a.y,'FUTURE SELF','#9db6ff');}return;}
    if(ab==='revolver'){for(let i=-1;i<=1;i++)fire(n,'bullet',{speed:540,angle:i*.09,life:2});return;}
    if(ab==='finger'){fire(n,'finger',{speed:510,radius:7});return;}
    if(ab==='traffic'){
      const up=this.rand()<.5;
      this.projectiles.push({uid:this.nextId++,side:a.side,owner:a.uid,x:b.x+this.between(-45,45),
        y:up?this.bounds.bottom-4:this.bounds.top+4,vx:this.between(-40,40),vy:up?-360:360,
        damage:n,type:'car',life:2.6,bounce:0,radius:27,stun:.15,source:'car',pierce:1,friendly:true,hit:new Set()});return;
    }
    if(ab==='lightning'){
      const victim=a.y<b.y&&this.rand()<.3?a:b;
      this.hit(victim,n,a,'lightning',.35);this.effect(victim.x,victim.y-33,'⚡','#e2b942');return;
    }
    if(ab==='chess'){const pieces=['pawn','bishop','rook','queen','knightpiece'];const piece=pieces[Math.floor(this.rand()*pieces.length)];
      const dmg=piece==='queen'?145:piece==='rook'?90:piece==='pawn'?40:70;
      for(let i=0;i<(piece==='pawn'?4:2);i++)fire(dmg,piece,{speed:piece==='pawn'?270:365,angle:(i-1.5)*.27,bounce:piece==='knightpiece'?1:0});return;
    }
    if(ab==='skeleton'){for(let i=0;i<2;i++)fire(n,'skeleton',{speed:175,angle:(i-.5)*.55,life:5,radius:17});return;}
    if(ab==='forge'){a.level++;this.effect(a.x,a.y,'+10','#c7904b');this.melee(a,b,125,n+(a.level-1)*10);if(d>125)fire(n+a.level*10,'hammer',{speed:290});return;}
    if(ab==='tape'){
      this.projectiles.push({uid:this.nextId++,side:a.side,owner:a.uid,x:b.x,y:b.y,vx:0,vy:0,
        damage:n,type:'tape',life:3.5,bounce:0,radius:15,stun:.1,source:'tape',pierce:99,friendly:false,hit:new Set()});return;
    }
    if(ab==='shotgun'){for(let i=-2.5;i<=2.5;i++)fire(n,'pellet',{speed:495,angle:i*.11,radius:8,life:1.6});return;}
    if(ab==='boss'){
      if(a.attackCount%3===0){for(let i=-1;i<=1;i++)fire(55,'skeleton',{speed:210,angle:i*.3,life:4});}
      else if(!this.melee(a,b,108,90))fire(n,'rocket',{speed:325,radius:18});return;
    }
    if(ab==='fireworks'){for(let i=-1;i<=1;i++)fire(n,'firework',{speed:310,angle:i*.24,bounce:1,life:2.5});return;}
    if(ab==='doctor'){
      if(a.hp<620 && a.attackCount%3===0){a.hp=Math.min(a.maxHp,a.hp+160);this.effect(a.x,a.y,'+160','#329b68');}
      if(a.attackCount%3===1)this.items.push({x:a.x,y:a.y,heal:115,side:a.side,life:45});
      if(!this.melee(a,b,100,n))fire(n,'syringe',{speed:420});return;
    }
    if(ab==='guitar'){for(let i=-1;i<=1;i++)fire(n,'note',{speed:340,angle:i*.3,bounce:1});return;}
    if(ab==='camera'){this.hit(b,n,a,'flash',.55);this.effect(b.x,b.y,'FLASH','#f5d055');return;}
    if(ab==='rc'){fire(n,'car',{speed:350,radius:24,bounce:3,life:4});return;}
    if(ab==='weather'){
      const type=['hail','lightning','wind','rain','heat'][a.attackCount%5];
      if(type==='lightning'||type==='heat'){this.hit(b,type==='lightning'?223:90,a,type,type==='lightning'?.3:0);this.effect(b.x,b.y,type.toUpperCase(),'#95bceb');}
      else for(let i=-1;i<=1;i++)fire(type==='hail'?68:45,type,{speed:type==='wind'?520:295,angle:i*.24,bounce:type==='hail'?2:0});return;
    }
    if(ab==='mouse'){a.shield=this.rand()<.24?.4:0;fire(n,'cursor',{speed:510,radius:13});return;}
    fire(n);
  }
  updateProjectiles(dt) {
    const keep=[];
    for(const p of this.projectiles){
      p.life-=dt;if(p.life<=0)continue;
      const owner=this.actors.find(a=>a.uid===p.owner);
      if(p.type==='skeleton'){
        const nearest=this.actors.filter(a=>a.hp>0&&a.side!==p.side).sort((a,b)=>dist(a,p)-dist(b,p))[0];
        if(nearest){const v=Math.atan2(nearest.y-p.y,nearest.x-p.x);
          p.vx=p.vx*.96+Math.cos(v)*12;p.vy=p.vy*.96+Math.sin(v)*12;
          const s=Math.hypot(p.vx,p.vy);if(s>250){p.vx*=250/s;p.vy*=250/s;}
        }
      }
      if(p.type==='gravity'&&owner?.hp>0){const a=Math.atan2(owner.y-p.y,owner.x-p.x);p.vx+=Math.cos(a)*75*dt;p.vy+=Math.sin(a)*75*dt;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      let bounced=false;
      if(p.x-p.radius<this.bounds.left || p.x+p.radius>this.bounds.right){p.x=clamp(p.x,this.bounds.left+p.radius,this.bounds.right-p.radius);bounced=true;p.vx*=-1;}
      if(p.y-p.radius<this.bounds.top || p.y+p.radius>this.bounds.bottom){p.y=clamp(p.y,this.bounds.top+p.radius,this.bounds.bottom-p.radius);bounced=true;p.vy*=-1;}
      if(bounced){
        if(p.type==='briefcase'&&owner){for(let i=0;i<10;i++)this.shot(owner,{x:owner.x+Math.cos(i*Math.PI/5)*200,y:owner.y+Math.sin(i*Math.PI/5)*200},20,'paper',{angle:i*Math.PI/5,speed:235,life:1.7});p.life=0;}
        else if(p.type==='cleaver'){p.vx=p.vy=0;p.life=20;p.type='stuck-knife';}
        else if(p.type==='glasses'){p.type='burst';p.radius=54;p.vx=p.vy=0;p.damage+=55;p.life=.28;p.pierce=99;}
        else if(p.type==='firework'){p.type='burst';p.vx=p.vy=0;p.radius=62;p.life=.36;p.pierce=99;}
        else if(p.bounce>0){p.bounce--;if(p.type==='pong')p.damage=Math.min(100,p.damage+1);}
        else p.life=0;
      }
      if(p.life<=0)continue;
      if(p.type==='stuck-knife'){
        if(owner?.hp>0&&dist(p,owner)<65){owner.ammo=Math.min(2,owner.ammo+1);p.life=0;}
        // Persist across team members, damaging anyone that touches the embedded cleaver.
      }
      for(const target of this.actors){
        if(target.hp<=0||(!p.friendly&&target.side===p.side)||p.hit.has(target.uid))continue;
        if(dist(p,target)>(p.radius+(target.id==='henchman'?23:35)))continue;
        if(target.ability==='reflect'&&target.reflectCooldown<=0&&p.type!=='burst'&&p.type!=='tape'){
          p.side=target.side;p.owner=target.uid;p.vx*=-1;p.vy*=-1;p.hit.clear();target.reflectCooldown=2;this.effect(target.x,target.y,'RETURN!','#558fb9');break;
        }
        if(target.ability==='jackhammer'&&p.vy<0 && p.y<target.y-10 && p.type!=='burst'){
          p.side=target.side;p.owner=target.uid;p.vy*=-1;p.hit.clear();break;
        }
        if(target.ability==='boxing'&&p.type!=='burst'&&this.rand()<.2){
          target.x=clamp(target.x+(this.rand()<.5?-55:55),this.bounds.left+35,this.bounds.right-35);this.effect(target.x,target.y,'DODGE','#617fcb');continue;
        }
        const attacker=this.actors.find(a=>a.uid===p.owner);
        this.hit(target,p.damage,attacker,p.source,p.stun);
        p.hit.add(target.uid);
        if(p.pierce>0){p.pierce--;if(p.type==='tape'||p.type==='pong')p.hit.delete(target.uid);}
        else{p.life=0;break;}
      }
      if(p.life>0)keep.push(p);
    }
    this.projectiles=keep;
  }
  updateActors(dt) {
    for(const a of this.actors){
      if(a.hp<=0)continue;
      a.cooldown-=dt;a.reflectCooldown=Math.max(0,a.reflectCooldown-dt);
      a.phase=Math.max(0,a.phase-dt);a.shield=Math.max(0,a.shield-dt);
      a.status=Math.max(0,a.status-dt);
      if(a.fuse>=0){a.fuse-=dt;
        if(a.fuse<=0){
          a.fuse=-1;this.log('BOOM! Exploding Guy detonates.','special');
          this.effect(a.x,a.y,'BOOM!','#e67635');
          for(const t of this.actors.filter(x=>x.hp>0))this.hit(t,1000,a,'explosion');
        }
      }
      const b=this.target(a);
      if(a.status<=0){
        if(a.ability==='boxing'&&b){const vx=(b.x-a.x),vy=(b.y-a.y),length=Math.hypot(vx,vy)||1;
          a.vx=a.vx*.87+vx/length*byId[a.id].speed*.13;a.vy=a.vy*.87+vy/length*byId[a.id].speed*.13;
        }
        if(a.ability==='drunk'){a.vx+=this.between(-15,15)*dt*9;a.vy+=this.between(-15,15)*dt*9;}
        if(this.ticks%180===0){a.vx+=this.between(-40,40);a.vy+=this.between(-38,38);}
        const maxSpeed=byId[a.id].speed*(a.ability==='charge'||a.ability==='bowling'?2.35:1.15);
        const s=Math.hypot(a.vx,a.vy);
        if(s>maxSpeed){a.vx*=maxSpeed/s;a.vy*=maxSpeed/s;}
        a.x+=a.vx*dt;a.y+=a.vy*dt;
      }
      const r=a.id==='henchman'?22:37;
      if(a.x-r<this.bounds.left){a.x=this.bounds.left+r;a.vx=Math.abs(a.vx);}
      if(a.x+r>this.bounds.right){a.x=this.bounds.right-r;a.vx=-Math.abs(a.vx);}
      if(a.y-r<this.bounds.top){a.y=this.bounds.top+r;a.vy=Math.abs(a.vy);}
      if(a.y+r>this.bounds.bottom){a.y=this.bounds.bottom-r;a.vy=-Math.abs(a.vy);}
      if(a.cooldown<=0&&a.status<=0&&b){
        a.cooldown=byId[a.id].cooldown*this.between(.82,1.18);this.attack(a,b);
      }
      for(const item of this.items)if(item.side===a.side&&item.life>0&&dist(a,item)<36){
        a.hp=Math.min(a.maxHp,a.hp+item.heal);item.life=0;this.effect(a.x,a.y,'+'+item.heal,'#429f67');
      }
    }
    for(let i=0;i<this.actors.length;i++)for(let j=i+1;j<this.actors.length;j++){
      const a=this.actors[i],b=this.actors[j];
      if(a.hp<=0||b.hp<=0||a.side===b.side)continue;
      const d=dist(a,b);
      if(d<63&&d>0){
        const nx=(b.x-a.x)/d,ny=(b.y-a.y)/d;
        if(a.ability!=='ghost'&&b.ability!=='ghost'){const push=(63-d)*.5;a.x-=nx*push;b.x+=nx*push;a.vx-=nx*25;b.vx+=nx*25;}
        if(a.ability==='ghost')this.hit(b,15,a,'melee');
        if(b.ability==='ghost')this.hit(a,15,b,'melee');
        if(a.ability==='football'||a.ability==='bowling')this.hit(b,a.ability==='football'?155:85+Math.min(a.combo*15,150),a,'melee');
        if(b.ability==='football'||b.ability==='bowling')this.hit(a,b.ability==='football'?155:85+Math.min(b.combo*15,150),b,'melee');
      }
    }
  }
  processDeaths(){
    const dead=this.actors.filter(a=>a.hp<=0&&!a.dead);
    for(const a of dead){
      a.dead=true;this.log(a.name+' was defeated.','death');
      if((this.mode==='challenge'||this.mode==='endless')&&a.side==='right')this.defeated++;
    }
    if(this.mode==='challenge'||this.mode==='endless'){
      const aliveLeft=this.actors.some(a=>a.hp>0&&a.side==='left');
      if(!aliveLeft){this.finish('right','Fighter defeated after '+this.defeated+' henchmen');return;}
      if(this.mode==='challenge'&&this.defeated>=30){this.finish('left','All 30 henchmen defeated');return;}
      if(dead.length)this.refillHenchmen();
    }else if(this.mode==='teams'){
      for(const side of ['left','right'])if(!this.actors.some(a=>a.hp>0&&a.side===side)&&this.queue[side].length)
        this.spawn(side,this.queue[side].shift());
      const l=this.actors.some(a=>a.hp>0&&a.side==='left');
      const r=this.actors.some(a=>a.hp>0&&a.side==='right');
      if(!l||!r)this.finish(l?'left':r?'right':'draw','Team eliminated');
    }else {
      const l=this.actors.some(a=>a.hp>0&&a.side==='left');
      const r=this.actors.some(a=>a.hp>0&&a.side==='right');
      if(!l||!r)this.finish(l?'left':r?'right':'draw','Knockout');
    }
  }
  finish(side,reason){
    if(this.done)return;
    this.done=true;this.winner=side;this.reason=reason;
    this.log((side==='draw'?'DRAW!':side==='left'?'LEFT SIDE WINS!':'RIGHT SIDE WINS!')+' '+reason,'result');
  }
  step(dt=1/60){
    if(this.done)return this;
    dt=clamp(Number(dt)||1/60,.0001,1/20);
    this.time+=dt;this.ticks++;this.bounds=this.boundsAt(this.time);
    for(const fx of this.effects)fx.life-=dt;this.effects=this.effects.filter(fx=>fx.life>0).slice(-90);
    for(const it of this.items)it.life-=dt;this.items=this.items.filter(it=>it.life>0);
    this.updateActors(dt);this.updateProjectiles(dt);this.processDeaths();
    const cap=this.mode==='time'?20:this.mode==='teams'?105:this.mode==='endless'?180:this.mode==='challenge'?150:70;
    if(!this.done&&this.time>=cap){
      if(this.mode==='challenge'||this.mode==='endless')this.finish('right','Time limit: '+this.defeated+' henchmen');
      else {
        const l=this.actors.filter(a=>a.side==='left'&&a.hp>0).reduce((v,a)=>v+a.hp,0);
        const r=this.actors.filter(a=>a.side==='right'&&a.hp>0).reduce((v,a)=>v+a.hp,0);
        const diff=this.mode==='time'?this.damageDone.left-this.damageDone.right:l-r;
        this.finish(Math.abs(diff)<.001?'draw':diff>0?'left':'right',this.mode==='time'?'20 seconds elapsed':'Time limit');
      }
    }
    return this;
  }
  snapshot(){return {seed:this.seed,mode:this.mode,time:+this.time.toFixed(2),done:this.done,winner:this.winner,reason:this.reason,
    defeated:this.defeated,damageDone:{...this.damageDone},actors:this.actors.filter(a=>a.hp>0).map(a=>({id:a.id,side:a.side,hp:+a.hp.toFixed(1),x:+a.x.toFixed(1),y:+a.y.toFixed(1)}))};}
}
