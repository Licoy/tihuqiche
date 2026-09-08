import * as T from 'three';
import { nextTick } from 'vue';
import { LEVELS } from './levels.js';
import { createWorld, V } from './world.js';
import { createRider } from './rider.js';
import { createCourse } from './course.js';
import { createSound } from './sound.js';
import { writeSave, updateProgress } from './storage.js';
import { bindInput } from './input.js';
import { initialGameState, createPlayer, GAME_MODES, applyAction, useItem, advancePlayers, settlePlayers, makeResult } from './rules.js';
import { resolveCollisions } from './collisions.js';
import { createGameCamera } from './game-camera.js';
import { createHomePreview } from './home-preview.js';
export { initialGameState } from './rules.js';

export function createGame(canvas, app) {
 const game=initialGameState(),save=app.save,notify=app.notify;
 const world=createWorld(canvas),riders=app.appearance.players.map(config=>createRider(world,config));
 const rider=riders[0].rider,course=createCourse(world,game);
 const {scene,camera,renderer,finish,updateWorld}=world;
 const homePreview=createHomePreview(world);
 const sound=createSound({enabled:app.soundEnabled,settings:app.settings,notify}),tone=sound.tone;
 const cameraControl=createGameCamera(world,game,app),updateCamera=cameraControl.updateCamera;
 let previous=performance.now(),clockTime=0,menuDistance=0,frameId,hudTick=0,themeIndex=-1,previewSeat=0;
 let homePreviewCanvas=null,wardrobePreviewCanvas=null,previewDestination=null;
 let resolveReady,rejectReady,readySettled=false,disposed=false;
 const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject});
 function settleReady(error){
  if(readySettled)return;
  readySettled=true;if(error)rejectReady(error);else resolveReady();
  resolveReady=null;rejectReady=null;
 }
 const setTheme=index=>{themeIndex=index;world.setTheme(index,app.dark.value)};
 function updateHUD(){Object.assign(app.state,{...game,players:game.players.map(p=>({...p})),markers:game.markers.map(m=>({...m}))})}
 function setMode(mode){
  game.mode=mode;updateHUD();
  const target={paused:'resume',home:'start',won:'next',lost:'next',ended:'next'}[mode];
  if(target)nextTick(()=>document.getElementById(target)?.focus({preventScroll:true}));
 }
 function startRun({gameMode,levelIndex,seed}){
  if(app.error.value||app.helpOpen.value||app.wardrobeOpen.value||app.settingsOpen.value)return false;
  if(!GAME_MODES.includes(gameMode))return false;
  if(gameMode==='duo'&&app.isMobile.value){notify('mobileDuo');return false}
  if(!Number.isInteger(levelIndex)||levelIndex<0||levelIndex>=LEVELS.length)return false;
  if(gameMode!=='endless'&&levelIndex>=save.records[gameMode].unlocked)return false;
  if(seed!==undefined&&(!Number.isInteger(seed)||seed<0||seed>0xffffffff))return false;
  const runSeed=seed===undefined?crypto.getRandomValues(new Uint32Array(1))[0]:seed;
  Object.assign(game,initialGameState(),{gameMode,level:gameMode==='endless'?0:levelIndex,seed:runSeed,
   homePreviewPlayer:game.homePreviewPlayer,homePreviewAuto:game.homePreviewAuto,
   players:gameMode==='duo'?[createPlayer(0),createPlayer(1)]:[createPlayer(0)]});
  app.selectedMode.value=gameMode;app.selected.value=game.level;
  restoreRiders();setTheme(game.level);course.generateCourse(game.level);course.clearParticles();
  for(const model of riders){model.rider.position.set(0,0,0);model.rider.rotation.set(0,0,0);model.shieldBubble.visible=false}
  app.hitFlash.value=0;tone('move');setMode('playing');canvas.focus();
  if(gameMode!=='endless')notify('stageToast',{number:game.level+1,name:app.levelName(game.level)});
  return true;
 }
 function startLevel(index){return startRun({gameMode:game.mode==='home'?app.selectedMode.value:game.gameMode,levelIndex:index,seed:game.mode!=='home'&&index===game.level?game.seed:undefined})}
 function goHome(){
  course.clearCourse();course.clearParticles();finish.visible=false;
  game.result=null;game.markers=[];game.players.forEach(p=>{p.jumpY=0;p.duck=0});
  restoreRiders();setTheme(app.selected.value);app.clearToast();app.hitFlash.value=0;setMode('home');
 }
 function pauseGame(){if(game.mode==='playing'){setMode('paused');app.clearToast()}}
 function resumeGame(){if(game.mode==='paused'&&!app.error.value&&!app.helpOpen.value&&!app.wardrobeOpen.value&&!app.settingsOpen.value){setMode('playing');canvas.focus();previous=performance.now()}}
 function action({playerId,type}){
  if(game.mode!=='playing'||app.error.value||app.helpOpen.value||app.wardrobeOpen.value||app.settingsOpen.value)return false;
  if(!Number.isInteger(playerId)||!game.players[playerId])return false;
  const p=game.players[playerId];
  if(p.status!=='running')return false;
  if(type==='boost'&&!p.boosting&&p.fishBalance===0){notify('boostEmpty');return false}
  if(type==='item'&&game.gameMode==='items'&&!p.itemSlot){notify('itemEmpty');return false}
  if(type==='item'&&p.itemSlot==='shield'&&p.shield){notify('shieldActive');return false}
  const applied=type==='item'?game.gameMode==='items'&&useItem(p,course.entities):applyAction(p,type);
  if(applied){tone(type==='jump'?'jump':type==='duck'?'duck':type==='item'?'shield':'move');updateHUD()}
  return Boolean(applied);
 }
 function collisionEvent(kind,p,e){
  if(kind==='fish')tone('fish');else if(kind==='hit'){tone('hit');notify(p.hp>0?'hit':'exhausted',{hp:p.hp})}
  else{tone('shield');if(kind==='item')notify('itemPickup',{item:app.copy.value.items[p.itemSlot]});if(kind==='shield')notify('pickup');if(kind==='shieldHit')notify('shieldHit')}
  course.burst(V(p.x,e.height,game.distance-p.distance),kind==='hit'?'#f29262':kind==='fish'?'#ffc449':'#7cf5ce',kind==='fish'?4:12);
 }
 function collide(previousPlayers){
  if(game.mode!=='playing')return;
  resolveCollisions(game,course.entities,{previous:previousPlayers,onEvent:collisionEvent});
  const outcome=settlePlayers(game);if(outcome)finishRun(outcome);
 }
 function finishRun(outcome){
  if(game.result)return;
  const record=save.records[game.gameMode],bestScore=game.gameMode==='endless'?record.bestScore:record.best[game.level];
  game.result=makeResult(game,{outcome,appearances:app.appearance.players,bestScore});
  Object.assign(save,updateProgress(save,game.result));
  game.recordSaved=app.saveWritable.value?writeSave(save,notify):false;
  if(!app.saveWritable.value)notify('readError');
  if(outcome==='won'){tone('win');for(let i=0;i<5;i++)course.burst(V((i-2)*1.5,3,-2),['#ffcb58','#ef8765','#7ad9bd'][i%3],12)}
  app.clearToast();
  setMode(outcome);
 }
 function endRun(){
  if(game.mode!=='paused'||game.gameMode!=='endless')return false;
  game.players.forEach(p=>{if(p.status==='running'){p.status='retired';p.speed=0;p.boosting=false}});game.speed=0;
  finishRun('ended');return true;
 }
 function step(dt){
  if(game.mode!=='playing')return;
  if(!Number.isFinite(dt)||dt<0)throw new RangeError('Invalid timestep');
  let remaining=dt;
  while(remaining>0&&game.mode==='playing'){
   const h=Math.min(remaining,1/90),previousPlayers=game.players.map(p=>({...p}));
   course.streamCourse();advancePlayers(game,h);collide(previousPlayers);
   remaining-=h;
  }
  if(game.gameMode==='endless'){
   course.streamCourse();const nextTheme=Math.floor(game.distance/1000)%LEVELS.length;if(nextTheme!==themeIndex)setTheme(nextTheme);
  }
 }
 function applySettings(){world.setSettings(app.settings);course.setAssistMarkers(app.settings.assistMarkers)}
 function selectMode(mode){
  if(!GAME_MODES.includes(mode)||game.mode!=='home')return false;
  app.selectedMode.value=mode;game.gameMode=mode;app.selected.value=mode==='endless'?0:save.records[mode].unlocked-1;
  setTheme(app.selected.value);updateHUD();return true;
 }
 function selectLevel(index){
  if(game.mode!=='home'||app.selectedMode.value==='endless'||!Number.isInteger(index)||index<0||index>=save.records[app.selectedMode.value].unlocked)return false;
  app.selected.value=index;setTheme(index);return true;
 }
 function previewRider({playerId,config}){
  if(game.mode!=='home'||!Number.isInteger(playerId)||!riders[playerId])throw new Error('Rider preview is only available at home');
  previewSeat=playerId;riders[playerId].applyConfig(config);
 }
 function restoreRiders(){app.appearance.players.forEach((config,i)=>riders[i].applyConfig(config));previewSeat=0}
 function attachHomePreview(destination){homePreviewCanvas=destination}
 function attachWardrobePreview(destination){wardrobePreviewCanvas=destination}
 function setHomePreviewPlayer(playerId){
  if(playerId!==0&&playerId!==1)throw new RangeError('Unknown preview player');
  game.homePreviewPlayer=playerId;updateHUD();
 }
 function setHomePreviewAuto(enabled){
  if(typeof enabled!=='boolean')throw new TypeError('Preview auto rotation must be boolean');
  game.homePreviewAuto=enabled;updateHUD();
 }
 function rotateHomePreview(delta){homePreview.rotate(delta);game.homePreviewAuto=false;updateHUD()}
 function rotateWardrobePreview(delta){homePreview.rotate(delta);app.wardrobeAuto.value=false}
 function renderPlayers(dt,homePreviewVisible){
  if(game.mode==='paused')dt=0;
  const home=game.mode==='home',seat=app.wardrobeOpen.value?previewSeat:0;
  riders.forEach((model,i)=>{
   const p=game.players[i],visible=home?i===seat&&!homePreviewVisible:Boolean(p)&&p.status==='running';
   model.rider.visible=visible&&(home||p.invincible<=0||Math.floor(p.invincible*12)%2===0);
   model.shieldBubble.visible=!home&&Boolean(p?.shield);
   if(!visible)return;
   const other=game.players[1-i];
   const offset=!home&&other?.status==='running'&&p.lane===other.lane&&Math.abs(p.distance-other.distance)<3?(i===0?-.55:.55):0;
   model.rider.position.set(home?(innerWidth<701&&innerHeight>500&&(!app.wardrobeOpen.value||innerHeight>innerWidth)?0:app.wardrobeOpen.value?-1.1:1.1):p.x+offset,home?0:p.jumpY,home?0:game.distance-p.distance);
   model.rider.rotation.y=home?-.28:T.MathUtils.damp(model.rider.rotation.y,-((p.lane-1)*3.4-p.x)*.07,12,dt);
   model.rider.rotation.z=home?Math.sin(clockTime*1.1)*.025:T.MathUtils.damp(model.rider.rotation.z,-((p.lane-1)*3.4-p.x)*.1,12,dt);
   if(game.mode!=='paused')model.animateRider({dt,time:clockTime,moving:home||game.mode==='playing',jumpY:home?0:p.jumpY,duck:!home&&p.duck>0,speed:home?4:p.speed,boosting:!home&&p.boosting,steering:home?0:model.rider.rotation.y});
  });
 }
 function frame(now){
  if(disposed)return;
  if(app.error.value){settleReady(new Error(app.error.value.detail||app.error.value.title));api.dispose();return}
  try{renderFrame(now)}catch(error){
   app.error.value={title:'errorTitle',description:'errorHelp',detail:error.message};
   console.error('Game frame failed',error);settleReady(error);api.dispose();
  }
 }
 function renderFrame(now){
  const dt=Math.min((now-previous)/1000,.05);previous=now;
  if(game.mode==='playing'||game.mode==='home')clockTime+=dt;
  if(game.mode==='playing'){
   step(dt);updateWorld(game.distance,clockTime);course.updateEntities(clockTime);
   app.hitFlash.value=Math.max(...game.players.map(p=>p.invincible>1.5?(p.invincible-1.5)*.28:0));
  }else if(game.mode==='home'){menuDistance+=dt*4;updateWorld(menuDistance,clockTime)}
  const wardrobe=app.wardrobeOpen.value;
  const destination=game.mode!=='home'?null:wardrobe?(app.wardrobeScene.value?null:wardrobePreviewCanvas):homePreviewCanvas;
  if(destination!==previewDestination){homePreview.attach(destination);previewDestination=destination}
  const homePreviewVisible=homePreview.render({active:game.mode==='home',
   config:wardrobe?app.wardrobeDraft.value:app.appearance.players[game.homePreviewPlayer],
   auto:wardrobe?app.wardrobeAuto.value:game.homePreviewAuto,dt,time:clockTime,transparent:wardrobe});
  renderPlayers(dt,homePreviewVisible);if(game.mode!=='paused')course.updateParticles(dt);
  updateCamera(dt);game.markers=cameraControl.markers(riders);
  hudTick+=dt;if(hudTick>.09){updateHUD();hudTick=0}
  renderer.render(scene,camera);
  if(!destination||homePreviewVisible)settleReady();
  frameId=requestAnimationFrame(frame);
 }
 const api={whenReady:()=>ready,game,save,world,scene,camera,renderer,rider,riders,V,app,startRun,startLevel,goHome,pauseGame,resumeGame,endRun,action,step,collide,
  updateCamera,updateWorld,updateEntities:course.updateEntities,selectMode,selectLevel,previewRider,restoreRiders,
  attachHomePreview,attachWardrobePreview,rotateWardrobePreview,setHomePreviewPlayer,rotateHomePreview,setHomePreviewAuto,
  applySettings,previewSound:()=>sound.preview(),
  get entities(){return course.entities},get soundEnabled(){return app.soundEnabled.value},get audio(){return sound.audio},
  toggleSound(){app.setSetting('soundEnabled',!app.soundEnabled.value);if(app.soundEnabled.value)tone('fish');if(game.mode==='playing')canvas.focus()},
  setAppearance(){setTheme(game.mode==='home'?app.selected.value:themeIndex)},setLanguage(){world.setLanguage(app.locale.value)},
  dispose(){if(disposed)return;disposed=true;settleReady(new Error('Game disposed before first frame'));cancelAnimationFrame(frameId);unbind();course.dispose();homePreview.dispose();riders.forEach(model=>model.dispose());world.dispose();sound.dispose()?.catch(error=>console.warn('Audio cleanup failed',error))},
 };
 const unbind=bindInput(canvas,api);setTheme(app.selected.value);api.setLanguage();applySettings();updateHUD();updateCamera(10);frameId=requestAnimationFrame(frame);
 return api;
}
