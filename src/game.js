const game={mode:'home',level:0,distance:0,speed:0,lane:1,x:0,jumpY:0,vy:0,duck:0,hp:3,fish:0,shield:false,invincible:0,elapsed:0};
let save={unlocked:1,best:[0,0,0],stars:[0,0,0]},soundEnabled=true,audio=null,toastTimer=null,selected=0,previous=performance.now(),clockTime=0,menuDistance=0;
function toast(message,duration=2400){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),duration)}
function readSave(){
 try{
  const raw=localStorage.getItem('pelican-pedal-run-v1');if(!raw)return;
  const v=JSON.parse(raw);
  if(!v||!Number.isInteger(v.unlocked)||v.unlocked<1||v.unlocked>3||!Array.isArray(v.best)||v.best.length!==3||!v.best.every(n=>Number.isInteger(n)&&n>=0)||!Array.isArray(v.stars)||v.stars.length!==3||!v.stars.every(n=>Number.isInteger(n)&&n>=0&&n<=3))throw new Error('存档格式不正确');
  save=v;selected=Math.min(save.unlocked-1,2);
 }catch(error){console.warn('无法读取骑行存档',error);toast('无法读取存档，本次将从海岸出发',4500)}
}
function writeSave(){try{localStorage.setItem('pelican-pedal-run-v1',JSON.stringify(save))}catch(error){console.warn('无法保存骑行进度',error);toast('浏览器未允许保存进度，本次游玩不受影响',4500)}}
function tone(kind){
 if(!soundEnabled)return;
 if(!audio){try{audio=new(window.AudioContext||window.webkitAudioContext)()}catch(error){console.warn('音效初始化失败',error);soundEnabled=false;updateSound();toast('浏览器无法启用音效');return}}
 if(audio.state==='suspended')audio.resume().catch(error=>{console.warn('音效播放失败',error);toast('音效未能启动，请再次点击音效按钮')});
 const notes={fish:[740,1100,.09],jump:[280,650,.15],duck:[350,150,.12],hit:[140,45,.25],shield:[580,1300,.3],win:[520,1040,.55],move:[210,280,.04]};
 const [a,b,len]=notes[kind],o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;
 o.type=kind==='hit'?'sawtooth':'sine';o.frequency.setValueAtTime(a,t);o.frequency.exponentialRampToValueAtTime(b,t+len);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.095,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+len);
 o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+len+.02);
}
function updateSound(){$('sound').textContent='音效：'+(soundEnabled?'开':'关');$('sound').setAttribute('aria-pressed',String(soundEnabled))}
function renderRoutes(){
 $('routes').replaceChildren();
 LEVELS.forEach((l,i)=>{
  const b=document.createElement('button');b.className='route'+(selected===i?' active':'');b.disabled=i>=save.unlocked;
  b.setAttribute('aria-label',l.name+(b.disabled?'，通关前一关解锁':''));b.setAttribute('aria-pressed',String(selected===i));
  b.innerHTML='<span class="route-number">0'+(i+1)+'</span><span class="route-name">'+l.name+'</span><span class="route-state">'+(b.disabled?'尚未解锁':save.stars[i]?'★'.repeat(save.stars[i]):'等待出发')+'</span>';
  b.onclick=()=>{selected=i;setTheme(i);renderRoutes()};$('routes').append(b);
 });
 $('scene-caption').innerHTML='<b>0'+(selected+1)+' / '+LEVELS[selected].en+'</b><span>'+LEVELS[selected].name+' · '+LEVELS[selected].tag+'</span>';
 $('best').textContent=save.best[selected]?'本关最佳 '+save.best[selected]+' 分':'三段旅程 · 一路顺风';
}
function setMode(mode){
 game.mode=mode;const running=mode==='playing',inRun=['playing','paused'].includes(mode);
 document.body.classList.toggle('playing',mode!=='home');
 for(const id of ['home','edition','scene-caption','github'])$(id).hidden=mode!=='home';
 for(const id of ['hud','controls','touch'])$(id).hidden=!inRun;
 $('pause').hidden=!running;$('pause-screen').hidden=mode!=='paused';$('result').hidden=!['won','lost'].includes(mode);
 $('shield').hidden=!inRun||!game.shield;
 if(mode==='paused')$('resume').focus();
 if(mode==='home')$('start').focus({preventScroll:true});
}
function startLevel(index){
 if(index<0||index>=save.unlocked)return;
 tone('move');
 Object.assign(game,{level:index,distance:0,speed:LEVELS[index].speed,lane:1,x:0,jumpY:0,vy:0,duck:0,hp:3,fish:0,shield:false,invincible:0,elapsed:0});
 selected=index;setTheme(index);generateCourse(index);clearParticles();rider.visible=true;rider.position.set(0,0,0);rider.rotation.set(0,0,0);
 shieldBubble.visible=false;$('hitflash').style.opacity=0;setMode('playing');updateHUD();$('scene').focus();
 toast('第 '+(index+1)+' 关 · '+LEVELS[index].name+'\n'+(index===0?'← → 变道 · ↑ 跳跃 · ↓ 低头':'保持节奏，向终点出发'),3500);
}
function goHome(){
 setMode('home');obstacleRoot.clear();entities=[];clearParticles();finish.visible=false;shieldBubble.visible=false;rider.visible=true;
 game.jumpY=0;game.duck=0;setTheme(selected);renderRoutes();$('toast').classList.remove('show');$('hitflash').style.opacity=0;
}
function pauseGame(){if(game.mode==='playing'){setMode('paused');$('toast').classList.remove('show')}}
function resumeGame(){if(game.mode==='paused'){setMode('playing');$('scene').focus();previous=performance.now()}}
function action(type){
 if(game.mode!=='playing')return;
 if(type==='left'||type==='right'){game.lane=T.MathUtils.clamp(game.lane+(type==='left'?-1:1),0,2);tone('move')}
 if(type==='jump'&&game.jumpY===0){game.vy=9.5;game.duck=0;tone('jump')}
 if(type==='duck'&&game.jumpY===0){game.duck=.95;tone('duck')}
}
function hit(){
 if(game.invincible>0)return;
 game.invincible=1.8;
 if(game.shield){game.shield=false;shieldBubble.visible=false;tone('shield');toast('护盾挡住了碰撞');burst(V(game.x,1.8,0),'#7cf5ce',15)}
 else{game.hp--;tone('hit');toast(game.hp>0?'哎哟！还剩 '+game.hp+' 点体力':'单车需要休息一下');burst(V(game.x,1.4,0),'#f29262',12);if(game.hp===0)finishLevel(false)}
}
function collide(){
 for(const e of entities){
  if(e.resolved||Math.abs(e.at-game.distance)>1.45)continue;
  if(Math.abs(game.x-(e.lane-1)*3.4)>1.08)continue;
  if(e.type==='fish'){
   if(Math.abs(game.jumpY+1.35-e.height)<1.0){e.resolved=true;e.mesh.visible=false;game.fish++;tone('fish');burst(V(game.x,e.height,.2),'#ffc449',4)}
  }else if(e.type==='shield'){
   e.resolved=true;e.mesh.visible=false;game.shield=true;shieldBubble.visible=true;tone('shield');toast('获得护盾 · 抵挡一次碰撞');
  }else if(e.at-game.distance<.65){
   e.resolved=true;
   const safe=e.type==='hurdle'?game.jumpY>1.18:e.type==='gate'?game.duck>0&&game.jumpY<.1:false;
   if(!safe)hit();
   if(game.mode!=='playing')return;
  }
 }
}
function updateHUD(){
 const l=LEVELS[game.level];$('level-name').textContent='0'+(game.level+1)+' '+l.name;$('stage-count').textContent=(game.level+1)+' / 3';
 $('progress').style.width=Math.min(100,game.distance/l.length*100)+'%';$('distance').textContent=Math.floor(game.distance)+' m';$('destination').textContent=l.length+' m';
 $('fish').textContent=game.fish;$('hearts').textContent='♥ '.repeat(game.hp)+'♡ '.repeat(3-game.hp);$('hearts').setAttribute('aria-label','剩余 '+game.hp+' 点体力');
 $('speed').textContent=Math.round(game.speed*3.6)+' KM/H';$('shield').hidden=!game.shield;
}
function finishLevel(won){
 const score=Math.floor(game.distance)+game.fish*25+(won?game.hp*150:0),stars=won?1+(game.hp===3?1:0)+(game.fish>=25?1:0):0;
 if(won){save.unlocked=Math.min(3,Math.max(save.unlocked,game.level+2));save.stars[game.level]=Math.max(save.stars[game.level],stars);tone('win')}
 save.best[game.level]=Math.max(save.best[game.level],score);writeSave();updateHUD();setMode(won?'won':'lost');
 const all=won&&game.level===2;$('stars').textContent=won?'★'.repeat(stars)+'☆'.repeat(3-stars):'↺';
 $('result-eyebrow').textContent=all?'THE ISLAND IS YOURS':won?'STAGE COMPLETE':'ONE MORE RIDE';
 $('result-title').textContent=all?'整座海岛，都骑过啦':won?'这一站，漂亮抵达':'拍拍翅膀，再来一次';
 $('result-desc').textContent=all?'从珊瑚海岸到落日神庙，你完成了整段旅程；回到地图，还可以挑战每一关的三星纪录':won?'已解锁下一站「'+LEVELS[game.level+1].name+'」，小鱼和好风景还在前面等你':'高木箱要变道，矮木栏要跳跃，蓝色横杆下记得低头；每次重试都从本关开始';
 $('result-distance').textContent=Math.floor(game.distance);$('result-fish').textContent=game.fish;$('result-score').textContent=score;
 $('next-label').textContent=all?'再游海岛':won?'下一站，继续冒险':'再骑一次';$('next').focus();
 if(won)for(let i=0;i<5;i++)burst(V((i-2)*1.5,3,-2),['#ffcb58','#ef8765','#7ad9bd'][i%3],12);
}
function step(dt){
 if(game.mode!=='playing')return;
 const l=LEVELS[game.level];game.elapsed+=dt;game.speed=l.speed+(l.maxSpeed-l.speed)*Math.min(1,game.distance/l.length);
 game.distance=Math.min(l.length,game.distance+game.speed*dt);
 game.x=T.MathUtils.damp(game.x,(game.lane-1)*3.4,14,dt);
 if(game.vy!==0||game.jumpY>0){game.jumpY+=game.vy*dt-11*dt*dt;game.vy-=22*dt;if(game.jumpY<=0){game.jumpY=0;game.vy=0}}
 game.duck=Math.max(0,game.duck-dt);game.invincible=Math.max(0,game.invincible-dt);
 collide();if(game.mode==='playing'&&game.distance>=l.length)finishLevel(true);
}
const cameraTarget=V(),desiredCamera=V(),lookAt=V();
function updateCamera(dt){
 const home=game.mode==='home',mobile=innerWidth<701,stackedHome=mobile&&innerHeight>500;
 if(home){
  desiredCamera.set(stackedHome?8:7.5,5.8,stackedHome?10:8.6);
  lookAt.set(stackedHome?0:-3.7,stackedHome?-.35:1.35,stackedHome?0:-.6);
 }else{desiredCamera.set(game.x*(mobile?.55:.22),mobile?7:6.5,mobile?14:11.8);lookAt.set(game.x*(mobile?.45:.13),1.0,mobile?-10:-12)}
 camera.position.lerp(desiredCamera,1-Math.exp(-dt*4));cameraTarget.lerp(lookAt,1-Math.exp(-dt*4));camera.lookAt(cameraTarget);
 camera.fov=T.MathUtils.damp(camera.fov,home?(stackedHome?50:45):(mobile?60:52),5,dt);camera.updateProjectionMatrix();
}
let hudTick=0;
function frame(now){
 const dt=Math.min((now-previous)/1000,.05);previous=now;
 if(game.mode!=='paused')clockTime+=dt;
 if(game.mode==='playing'){
  let remaining=dt;while(remaining>0){const h=Math.min(remaining,1/90);step(h);remaining-=h}
  updateWorld(game.distance,clockTime);updateEntities(clockTime);
  rider.position.x=game.x;rider.rotation.z=T.MathUtils.damp(rider.rotation.z,-((game.lane-1)*3.4-game.x)*.1,12,dt);
  rider.rotation.y=T.MathUtils.damp(rider.rotation.y,-((game.lane-1)*3.4-game.x)*.07,12,dt);
  rider.visible=game.invincible<=0||Math.floor(game.invincible*12)%2===0;
  $('hitflash').style.opacity=game.invincible>1.5?((game.invincible-1.5)*.28):0;
  hudTick+=dt;if(hudTick>.09){updateHUD();hudTick=0}
 }else if(game.mode==='home'){
  menuDistance+=dt*4;updateWorld(menuDistance,clockTime);rider.position.x=innerWidth<701&&innerHeight>500?0:1.1;rider.rotation.y=-.28;rider.rotation.z=Math.sin(clockTime*1.1)*.025;
 }
 if(game.mode!=='paused'){
  animateRider(dt,clockTime,game.mode==='playing'||game.mode==='home',game.mode==='home'?0:game.jumpY,game.duck>0);
  updateParticles(dt);
 }
 updateCamera(dt);renderer.render(scene,camera);requestAnimationFrame(frame);
}
