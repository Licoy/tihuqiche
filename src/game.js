import * as T from 'three';
import { nextTick } from 'vue';
import { LEVELS } from './levels.js';
import { createWorld, V } from './world.js';
import { createRider } from './rider.js';
import { createCourse } from './course.js';
import { createSound } from './sound.js';
import { writeSave } from './storage.js';
import { bindInput } from './input.js';

export const initialGameState = () => ({mode:'home',level:0,distance:0,speed:0,lane:1,x:0,jumpY:0,vy:0,duck:0,hp:3,fish:0,shield:false,invincible:0,elapsed:0});

// Keep the animation clock outside Vue; publish a small HUD snapshot at 10 Hz.
export function createGame(canvas, app) {
 const game=initialGameState(),save=app.save,notify=app.notify;
 const world=createWorld(canvas),riderModel=createRider(world),course=createCourse(world,game);
 const {scene,camera,renderer,finish,updateWorld}=world;
 const {rider,shieldBubble,animateRider}=riderModel;
 const {generateCourse,clearParticles,burst,updateEntities,updateParticles}=course;
 const sound=createSound({enabled:app.soundEnabled,notify}),tone=sound.tone;
 const setTheme=index=>world.setTheme(index,app.dark.value);
 let previous=performance.now(),clockTime=0,menuDistance=0,frameId;
 function setMode(mode){
  game.mode=mode;updateHUD();
  const target={paused:'resume',home:'start',won:'next',lost:'next'}[mode];
  if(target)nextTick(()=>document.getElementById(target)?.focus({preventScroll:true}));
 }
function startLevel(index){
 if(app.error.value)return;
 if(!Number.isInteger(index)||index<0||index>=save.unlocked)return;
 tone('move');
 Object.assign(game,{level:index,distance:0,speed:LEVELS[index].speed,lane:1,x:0,jumpY:0,vy:0,duck:0,hp:3,fish:0,shield:false,invincible:0,elapsed:0});
 app.selected.value=index;setTheme(index);generateCourse(index);clearParticles();rider.visible=true;rider.position.set(0,0,0);rider.rotation.set(0,0,0);
 shieldBubble.visible=false;app.hitFlash.value=0;setMode('playing');updateHUD();canvas.focus();
 notify('stageToast',{number:index+1,name:app.levelName(index)},index===0?'firstTip':'rideTip');
}
function goHome(){
 setMode('home');course.clearCourse();clearParticles();finish.visible=false;shieldBubble.visible=false;rider.visible=true;
 game.jumpY=0;game.duck=0;setTheme(app.selected.value);app.clearToast();app.hitFlash.value=0;
}
function pauseGame(){if(game.mode==='playing'){setMode('paused');app.clearToast()}}
function resumeGame(){if(game.mode==='paused'&&!app.error.value){setMode('playing');canvas.focus();previous=performance.now()}}
function action(type){
 if(game.mode!=='playing'||app.error.value)return;
 if(type==='left'||type==='right'){game.lane=T.MathUtils.clamp(game.lane+(type==='left'?-1:1),0,2);tone('move')}
 if(type==='jump'&&game.jumpY===0){game.vy=9.5;game.duck=0;tone('jump')}
 if(type==='duck'&&game.jumpY===0){game.duck=.95;tone('duck')}
}
function hit(){
 if(game.invincible>0)return;
 game.invincible=1.8;
 if(game.shield){game.shield=false;shieldBubble.visible=false;tone('shield');notify('shieldHit');burst(V(game.x,1.8,0),'#7cf5ce',15)}
 else{game.hp--;tone('hit');notify(game.hp>0?'hit':'exhausted',{hp:game.hp});burst(V(game.x,1.4,0),'#f29262',12);if(game.hp===0)finishLevel(false)}
}
function collide(){
 for(const e of course.entities){
  if(e.resolved||Math.abs(e.at-game.distance)>1.45)continue;
  if(Math.abs(game.x-(e.lane-1)*3.4)>1.08)continue;
  if(e.type==='fish'){
   if(Math.abs(game.jumpY+1.35-e.height)<1.0){e.resolved=true;e.mesh.visible=false;game.fish++;tone('fish');burst(V(game.x,e.height,.2),'#ffc449',4)}
  }else if(e.type==='shield'){
   e.resolved=true;e.mesh.visible=false;game.shield=true;shieldBubble.visible=true;tone('shield');notify('pickup');
  }else if(e.at-game.distance<.65){
   e.resolved=true;
   const safe=e.type==='hurdle'?game.jumpY>1.18:e.type==='gate'?game.duck>0&&game.jumpY<.1:false;
   if(!safe)hit();
   if(game.mode!=='playing')return;
  }
 }
}
function updateHUD(){Object.assign(app.state,game)}
function finishLevel(won){
 const score=Math.floor(game.distance)+game.fish*25+(won?game.hp*150:0),stars=won?1+(game.hp===3?1:0)+(game.fish>=25?1:0):0;
 if(won){save.unlocked=Math.min(LEVELS.length,Math.max(save.unlocked,game.level+2));save.stars[game.level]=Math.max(save.stars[game.level],stars);tone('win')}
 save.best[game.level]=Math.max(save.best[game.level],score);writeSave(save,notify);setMode(won?'won':'lost');
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
 if(app.error.value)return;
 const dt=Math.min((now-previous)/1000,.05);previous=now;
 if(game.mode!=='paused')clockTime+=dt;
 if(game.mode==='playing'){
  let remaining=dt;while(remaining>0){const h=Math.min(remaining,1/90);step(h);remaining-=h}
  updateWorld(game.distance,clockTime);updateEntities(clockTime);
  rider.position.x=game.x;rider.rotation.z=T.MathUtils.damp(rider.rotation.z,-((game.lane-1)*3.4-game.x)*.1,12,dt);
  rider.rotation.y=T.MathUtils.damp(rider.rotation.y,-((game.lane-1)*3.4-game.x)*.07,12,dt);
  rider.visible=game.invincible<=0||Math.floor(game.invincible*12)%2===0;
  app.hitFlash.value=game.invincible>1.5?((game.invincible-1.5)*.28):0;
  hudTick+=dt;if(hudTick>.09){updateHUD();hudTick=0}
 }else if(game.mode==='home'){
  menuDistance+=dt*4;updateWorld(menuDistance,clockTime);rider.position.x=innerWidth<701&&innerHeight>500?0:1.1;rider.rotation.y=-.28;rider.rotation.z=Math.sin(clockTime*1.1)*.025;
 }
 if(game.mode!=='paused'){
  animateRider(dt,clockTime,game.mode==='playing'||game.mode==='home',game.mode==='home'?0:game.jumpY,game.duck>0);
  updateParticles(dt);
 }
 updateCamera(dt);renderer.render(scene,camera);frameId=requestAnimationFrame(frame);
}

 const api={game,save,world,scene,camera,renderer,rider,V,startLevel,goHome,pauseGame,resumeGame,action,step,collide,updateCamera,updateWorld,updateEntities,
  get entities(){return course.entities},get soundEnabled(){return app.soundEnabled.value},get audio(){return sound.audio},app,
  selectLevel(index){if(!Number.isInteger(index)||index<0||index>=save.unlocked)return;app.selected.value=index;setTheme(index)},
  toggleSound(){app.soundEnabled.value=!app.soundEnabled.value;if(app.soundEnabled.value)tone('fish');if(game.mode==='playing')canvas.focus()},
  setAppearance(){setTheme(game.mode==='home'?app.selected.value:game.level)},
  setLanguage(){world.setLanguage(app.locale.value)},
  dispose(){cancelAnimationFrame(frameId);unbind();course.dispose();world.dispose();sound.dispose()?.catch(error=>console.warn('Audio cleanup failed',error))},
 };
 const unbind=bindInput(canvas,api);
 setTheme(app.selected.value);api.setLanguage();updateCamera(10);frameId=requestAnimationFrame(frame);
 return api;
}
