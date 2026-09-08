import test from 'node:test';
import assert from 'node:assert/strict';
import { reactive } from 'vue';
import { LEVELS } from '../src/levels.js';
import { createPlayer, initialGameState, applyAction, useItem, collectFish, advancePlayers, settlePlayers, makeResult, endlessSpeed, endlessGap, catchupBonus } from '../src/rules.js';
import { resolveCollisions } from '../src/collisions.js';
import { campaignLayout, createEndlessLayout } from '../src/course-layout.js';
import { keyboardAction, isMobileDevice } from '../src/input.js';
const run=(mode='campaign')=>({...initialGameState(),mode:'playing',gameMode:mode,players:mode==='duo'?[createPlayer(0),createPlayer(1)]:[createPlayer(0)]});
const result=(game,outcome='won')=>makeResult(game,{outcome,appearances:reactive([{identity:'gg',vehicle:'bicycle'},{identity:'mm',vehicle:'scooter'}])});
const entity=(type,at=0,id=0,lane=1)=>({id,type,at,lane,height:1.35,resolved:false,resolvedBy:[]});
function tick(game,entities,dt=1/90){const previous=game.players.map(p=>({...p}));advancePlayers(game,dt);resolveCollisions(game,entities,{previous});return settlePlayers(game)}

test('boost burns fish one by one, can stop and resume, and freezes while paused',()=>{
 const game=run(),p=game.players[0];
 assert.equal(applyAction(p,'boost'),false);collectFish(p);
 assert.equal(applyAction(p,'boost'),true);assert.equal(p.fishBalance,1);
 advancePlayers(game,.125);assert.equal(p.fishBalance,1);assert.equal(p.speed,22.5);
 assert.equal(applyAction(p,'boost'),true);assert.equal(p.boosting,false);
 advancePlayers(game,1);assert.equal(p.fishBalance,1);assert.equal(p.boostElapsed,.125);
 assert.equal(applyAction(p,'boost'),true);
 p.magnetRemaining=p.doubleRemaining=8;game.mode='paused';
 const before=JSON.stringify(p);advancePlayers(game,1);assert.equal(JSON.stringify(p),before);
 game.mode='playing';advancePlayers(game,.125);
 assert.equal(p.fishBalance,0);assert.equal(p.boosting,false);assert.equal(p.boostElapsed,0);
 assert.equal(applyAction(p,'boost'),false);assert.equal(p.fishCollected,1);
 collectFish(p);assert.equal(applyAction(p,'boost'),true);advancePlayers(game,.25);
 assert.equal(p.fishBalance,0);assert.equal(p.fishCollected,2);
 p.status='finished';assert.equal(result(game).players[0].score,Math.floor(p.distance)+50+p.bonusScore+450);
});
test('continuous boost drains all fuel precisely and does not charge beyond its last fish',()=>{
 const game=run(),p=game.players[0];
 for(let i=0;i<13;i++)collectFish(p);
 applyAction(p,'boost');
 for(let i=0;i<360;i++)advancePlayers(game,1/120);
 assert.equal(p.fishBalance,1);assert.equal(p.boosting,true);
 advancePlayers(game,.5);
 assert.equal(p.fishBalance,0);assert.equal(p.boosting,false);assert.equal(p.fishCollected,13);
 const one=run();collectFish(one.players[0]);applyAction(one.players[0],'boost');advancePlayers(one,1);
 assert.equal(one.players[0].distance,15+.25*7.5);assert.equal(one.players[0].speed,15);
});
test('co-op boost burns only each activated rider fuel and terminal riders stop boosting',()=>{
 const game=run('duo'),[a,b]=game.players;
 for(let i=0;i<3;i++){collectFish(a);collectFish(b)}
 applyAction(a,'boost');advancePlayers(game,.5);
 assert.deepEqual([a.fishBalance,b.fishBalance],[1,3]);assert.equal(b.boostElapsed,0);
 a.hp=0;settlePlayers(game);assert.equal(a.boosting,false);
 b.distance=LEVELS[0].length;applyAction(b,'boost');settlePlayers(game);assert.equal(b.boosting,false);
});
test('co-op pickup ties alternate seats and an earlier swept contact wins',()=>{
 const game=run('duo'),fish=[entity('fish',0,0),entity('fish',0,1)];
 resolveCollisions(game,fish);assert.deepEqual(game.players.map(p=>p.fishCollected),[1,1]);
 resolveCollisions(game,fish);assert.deepEqual(game.players.map(p=>p.fishCollected),[1,1]);
 const previous=game.players.map(p=>({...p,distance:0}));
 game.players[0].distance=2;game.players[1].distance=4;
 resolveCollisions(game,[entity('fish',3,2)],{previous});assert.deepEqual(game.players.map(p=>p.fishCollected),[1,2]);
});
test('each player must avoid the same obstacle; invulnerability and shield remain personal',()=>{
 const game=run('duo'),obstacle=entity('crate',10);game.players[0].distance=10;
 resolveCollisions(game,[obstacle]);assert.equal(game.players[0].hp,2);assert.equal(game.players[1].hp,3);
 assert.deepEqual(obstacle.resolvedBy,[0]);assert.equal(obstacle.resolved,false);
 game.players[1].distance=10;game.players[1].shield=true;resolveCollisions(game,[obstacle]);
 assert.deepEqual(obstacle.resolvedBy,[0,1]);assert.equal(game.players[1].hp,3);assert.equal(game.players[1].shield,false);
 resolveCollisions(game,[obstacle]);assert.equal(game.players[0].hp,2);
});
test('swept high speed contacts cannot tunnel through obstacles or fish',()=>{
 const game=run(),p=game.players[0],previous=[{...p}];p.distance=8;
 const entries=[entity('fish',3),entity('crate',5,1)];resolveCollisions(game,entries,{previous});
 assert.equal(p.fishCollected,1);assert.equal(p.hp,2);assert.deepEqual(entries[1].resolvedBy,[0]);
});
test('jump and duck clear the corresponding obstacle, not a tall crate',()=>{
 for(const [type,jumpY,duck,hp] of [['hurdle',1.3,0,3],['gate',0,.5,3],['crate',2,0,2]]){
  const game=run();Object.assign(game.players[0],{jumpY,duck});resolveCollisions(game,[entity(type)]);assert.equal(game.players[0].hp,hp);
 }
});
test('co-op catch-up is continuous and excludes downed or finished players',()=>{
 assert.equal(catchupBonus(10),0);assert.equal(catchupBonus(14),.25);assert.equal(catchupBonus(18),.5);assert.equal(catchupBonus(30),.5);
 const game=run('duo');game.players[0].distance=18;Object.assign(game.players[1],{boosting:true,fishBalance:10});
 advancePlayers(game,1/90);assert.equal(game.players[1].catchupBonus,.5);
 const base=15+5*18/600;assert.equal(game.players[1].speed,base*1.75);
 game.players[0].status='downed';advancePlayers(game,1/90);assert.equal(game.players[1].catchupBonus,0);
 for(let level=0;level<LEVELS.length;level++){
  const g=run('duo');g.level=level;let maximum=0;
  while(g.players.every(p=>p.status==='running')){
   Object.assign(g.players[0],{boosting:true,fishBalance:10});advancePlayers(g,1/90);settlePlayers(g);
   if(g.players.every(p=>p.status==='running'))maximum=Math.max(maximum,g.players[0].distance-g.players[1].distance);
  }
  assert.ok(maximum<=18.1,`level ${level} maximum gap ${maximum}`);
 }
});
test('a finished player waits for partner; only all-terminal state settles',()=>{
 const game=run('duo');game.players[0].distance=600;
 assert.equal(settlePlayers(game),null);assert.equal(game.players[0].status,'finished');
 game.players[1].hp=0;assert.equal(settlePlayers(game),'won');
 const r=result(game);assert.equal(r.stars,1);assert.equal(r.players[1].score,0);assert.equal(r.score,1050);
 const loss=run('duo');loss.players.forEach(p=>p.hp=0);assert.equal(settlePlayers(loss),'lost');assert.equal(result(loss,'lost').stars,0);
});
test('all power-ups obey slot, duration and fish accounting rules',()=>{
 const game=run('items'),p=game.players[0],box={...entity('item'),item:'magnet'};
 p.itemSlot='shield';resolveCollisions(game,[box]);assert.equal(box.resolved,false);assert.equal(p.itemSlot,'shield');
 p.shield=true;assert.equal(useItem(p,[]),false);assert.equal(p.itemSlot,'shield');
 p.shield=false;assert.equal(useItem(p,[]),true);assert.equal(p.shield,true);
 resolveCollisions(game,[box]);assert.equal(p.itemSlot,'magnet');assert.equal(box.resolved,true);
 assert.equal(useItem(p,[]),true);assert.equal(p.magnetRemaining,8);
 p.magnetRemaining=2;p.itemSlot='magnet';useItem(p,[]);assert.equal(p.magnetRemaining,8);
 p.itemSlot='double';useItem(p,[]);assert.equal(p.doubleRemaining,8);
 const fish=[entity('fish',11,1,0),entity('fish',11,2,2),entity('fish',13,3,0)];resolveCollisions(game,fish);
 assert.equal(p.fishCollected,2);assert.equal(p.fishBalance,2);assert.equal(p.bonusScore,50);assert.equal(fish[2].resolved,false);
 const clear=[entity('crate',30),entity('crate',31),entity('fish',10),entity('shield',10),entity('item',10),entity('gate',-1)];
 p.itemSlot='clear';useItem(p,clear);assert.deepEqual(clear.map(e=>e.resolved),[true,false,false,false,false,false]);
});
test('result is immutable, accepts Vue proxy appearance, and preserves cumulative fish stars',()=>{
 const game=run('duo');game.players.forEach(p=>Object.assign(p,{status:'finished',distance:600,fishCollected:25,fishBalance:5}));
 const r=result(game);assert.equal(r.stars,3);assert.equal(r.score,3350);assert.equal(r.fishCollected,50);
 assert.ok(Object.isFrozen(r.players[0].appearance));assert.throws(()=>r.players.push({}),TypeError);
 game.players[0].fishCollected=999;assert.equal(r.players[0].fishCollected,25);
 const endless=run('endless');Object.assign(endless.players[0],{status:'retired',distance:100,hp:3});
 const end=result(endless,'ended');assert.equal(end.score,100);assert.equal(end.stars,null);assert.equal(end.reason,'retired');
});
test('endless streams deterministically with bounded rows and always a safe lane',()=>{
 assert.equal(endlessSpeed(0),18);assert.equal(endlessSpeed(5000),32);assert.equal(endlessSpeed(1e6),32);
 assert.equal(endlessGap(0),36);assert.equal(endlessGap(5000),28);
 const one=createEndlessLayout(42),two=createEndlessLayout(42);
 const a=[...one.through(240),...one.through(1000)],b=two.through(1000);assert.deepEqual(a,b);
 assert.notDeepEqual(a,createEndlessLayout(43).through(1000));
 const stream=createEndlessLayout(7);let entries=[],maximum=0;
 for(let distance=0;distance<=100000;distance+=10){
  entries.push(...stream.through(distance+240));entries=entries.filter(e=>e.at>=distance-20);maximum=Math.max(maximum,entries.length);
  const rows=new Map();for(const e of entries)if(['crate','hurdle','gate'].includes(e.type)){if(!rows.has(e.at))rows.set(e.at,new Set());rows.get(e.at).add(e.lane)}
  for(const lanes of rows.values())assert.ok(lanes.size<=2);
 }
 assert.ok(maximum<80,`maximum streamed entities ${maximum}`);
});
test('all campaign routes stay deterministic and a safe-lane rider can finish physically',()=>{
 for(let level=0;level<LEVELS.length;level++){
  const entries=campaignLayout(level).map((e,id)=>({...e,id,height:e.height??1.35,resolved:false,resolvedBy:[]}));
  assert.deepEqual(campaignLayout(level),campaignLayout(level));
  assert.deepEqual(campaignLayout(level,true,42).filter(e=>e.type!=='item'),campaignLayout(level));
  const game=run();game.level=level;const p=game.players[0];let outcome=null;
  for(let n=0;n<20000&&!outcome;n++){
   const next=entries.filter(e=>['crate','hurdle','gate'].includes(e.type)&&!e.resolvedBy.includes(0)&&e.at>=p.distance-1.45).sort((a,b)=>a.at-b.at)[0];
   if(next){const blocked=entries.filter(e=>e.at===next.at&&['crate','hurdle','gate'].includes(e.type)).map(e=>e.lane);const safe=[0,1,2].find(lane=>!blocked.includes(lane));
    if(p.lane!==safe&&next.at-p.distance<35)applyAction(p,p.lane>safe?'left':'right');}
   outcome=tick(game,entries);
  }
  assert.equal(outcome,'won',`level ${level}`);assert.equal(p.hp,3,`level ${level} should be safe`);
 }
});
test('physical keyboard code separates players and space boosts, including NumLock independent codes',()=>{
 assert.deepEqual(keyboardAction('Space','campaign'),{playerId:0,type:'boost'});
 assert.deepEqual(keyboardAction('KeyW','duo'),{playerId:0,type:'jump'});
 for(const code of ['Numpad8','ArrowUp'])assert.deepEqual(keyboardAction(code,'duo'),{playerId:1,type:'jump'});
 for(const code of ['Numpad0','ShiftRight'])assert.deepEqual(keyboardAction(code,'duo'),{playerId:1,type:'boost'});
 assert.equal(keyboardAction('Digit4','duo'),null);assert.equal(keyboardAction('KeyE','duo'),null);
 assert.deepEqual(keyboardAction('KeyE','items'),{playerId:0,type:'item'});assert.equal(isMobileDevice(),false);
});

test('co-op camera frames the 22m budget and freezes the last view on terminal states',async()=>{
 const T=await import('three');const {createGameCamera}=await import('../src/game-camera.js');
 const width=Object.getOwnPropertyDescriptor(globalThis,'innerWidth'),height=Object.getOwnPropertyDescriptor(globalThis,'innerHeight');
 Object.defineProperty(globalThis,'innerWidth',{value:1280,configurable:true});Object.defineProperty(globalThis,'innerHeight',{value:720,configurable:true});
 try{
  const game=run('duo'),camera=new T.PerspectiveCamera(48,1280/720,.1,340);
  Object.assign(game.players[0],{distance:22,x:-3.4});game.players[1].x=3.4;
  const control=createGameCamera({camera},game,{wardrobeOpen:{value:false}});control.updateCamera(10);camera.updateMatrixWorld();
  for(const p of game.players){
   const foot=new T.Vector3(p.x,0,22-p.distance).project(camera),head=new T.Vector3(p.x,3.6,22-p.distance).project(camera);
   assert.ok((head.y-foot.y)*360>=80,`player ${p.id} projected height ${(head.y-foot.y)*360}`);
   assert.ok(Math.abs(foot.y)<1&&Math.abs(head.y)<1);
  }
  const position=camera.position.toArray(),quaternion=camera.quaternion.toArray();
  game.players[0].status='downed';game.players[1].status='finished';game.players[1].distance=1600;game.mode='won';
  control.updateCamera(10);assert.deepEqual(camera.position.toArray(),position);assert.deepEqual(camera.quaternion.toArray(),quaternion);
 }finally{
  if(width)Object.defineProperty(globalThis,'innerWidth',width);else delete globalThis.innerWidth;
  if(height)Object.defineProperty(globalThis,'innerHeight',height);else delete globalThis.innerHeight;
 }
});

test('portrait wardrobe frames all vehicles and both views above the panel, then clears its offset',async()=>{
 const T=await import('three');
 const {createGameCamera}=await import('../src/game-camera.js');
 const {createModelPrimitives}=await import('../src/rider-primitives.js');
 const {createRider}=await import('../src/rider.js');
 const {defaultRiderConfig,RIDER_OPTIONS}=await import('../src/appearance.js');
 const width=Object.getOwnPropertyDescriptor(globalThis,'innerWidth'),height=Object.getOwnPropertyDescriptor(globalThis,'innerHeight');
 const scene=new T.Scene(),primitives=createModelPrimitives(scene),camera=new T.PerspectiveCamera(45,1,.1,340);
 const game=run();game.mode='home';const app={wardrobeOpen:{value:true}};
 const control=createGameCamera({camera},game,app),model=createRider({scene,...primitives});
 try{
  for(const [w,h] of [[320,568],[375,667],[390,844],[430,932],[700,1000]]){
   Object.defineProperty(globalThis,'innerWidth',{value:w,configurable:true});
   Object.defineProperty(globalThis,'innerHeight',{value:h,configurable:true});
   camera.aspect=w/h;control.updateCamera(1/60);camera.updateMatrixWorld();
   for(const {id:vehicle} of RIDER_OPTIONS.vehicle)for(const hat of ['helmet','cap'])for(const back of [false,true]){
    model.applyConfig({...defaultRiderConfig(),vehicle,hat,glasses:'round',clothes:'jersey'});
    for(const time of [0,1,2,3]){
     model.animateRider({dt:1/60,time,moving:true,jumpY:0,duck:false,speed:18,boosting:false});
     model.rider.rotation.set(0,-.28+(back?Math.PI:0),Math.sin(time*1.1)*.025);scene.updateMatrixWorld(true);
     model.rider.traverseVisible(object=>{
      if(!object.isMesh)return;
      const positions=object.geometry.attributes.position;
      for(let i=0;i<positions.count;i++){
       const point=new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld).project(camera);
       const x=(point.x+1)*w/2,y=(1-point.y)*h/2;
       assert.ok(x>=12&&x<=w-12&&y>=12&&y<=238&&point.z>-1&&point.z<1,
        `${w}x${h} ${vehicle} ${hat} ${back?'back':'front'} vertex at ${x},${y}`);
      }
     });
    }
   }
  }
  app.wardrobeOpen.value=false;control.updateCamera(10);assert.equal(camera.view.enabled,false);
  Object.defineProperty(globalThis,'innerWidth',{value:1280,configurable:true});
  Object.defineProperty(globalThis,'innerHeight',{value:720,configurable:true});
  app.wardrobeOpen.value=true;control.updateCamera(10);
  assert.equal(camera.view.enabled,true);assert.ok(camera.position.distanceTo(new T.Vector3(6.4,5.8,10))<1e-9);
 }finally{
  model.dispose();Object.values(primitives.geos).forEach(geo=>geo.dispose());primitives.mats.forEach(mat=>mat.dispose());
  if(width)Object.defineProperty(globalThis,'innerWidth',width);else delete globalThis.innerWidth;
  if(height)Object.defineProperty(globalThis,'innerHeight',height);else delete globalThis.innerHeight;
 }
});


test('desktop and landscape wardrobe projects real vehicles left of the right menu',async()=>{
 const T=await import('three');
 const {createGameCamera}=await import('../src/game-camera.js');
 const {createModelPrimitives}=await import('../src/rider-primitives.js');
 const {createRider}=await import('../src/rider.js');
 const {defaultRiderConfig,RIDER_OPTIONS}=await import('../src/appearance.js');
 const width=Object.getOwnPropertyDescriptor(globalThis,'innerWidth'),height=Object.getOwnPropertyDescriptor(globalThis,'innerHeight');
 const scene=new T.Scene(),primitives=createModelPrimitives(scene),camera=new T.PerspectiveCamera(45,1,.1,340);
 const game=run();game.mode='home';const app={wardrobeOpen:{value:true}};
 const control=createGameCamera({camera},game,app),model=createRider({scene,...primitives});
 try{
  for(const [w,h] of [[1280,720],[1920,1080],[701,600],[844,390],[667,375],[600,550]]){
   // Match the wardrobe-panel width and overlay right padding in responsive.css.
   const compact=w<=700||h<=500;
   const menuWidth=compact?w*.47:Math.min(640,w*.49),right=compact?10:Math.max(w*.05,24);
   const menuLeft=w-right-menuWidth;
   Object.defineProperty(globalThis,'innerWidth',{value:w,configurable:true});
   Object.defineProperty(globalThis,'innerHeight',{value:h,configurable:true});
   camera.aspect=w/h;control.updateCamera(10);camera.updateMatrixWorld();
   for(const {id:vehicle} of RIDER_OPTIONS.vehicle)for(const time of [0,1,2,3]){
    model.applyConfig({...defaultRiderConfig(),vehicle,hat:'cap',glasses:'round',clothes:'jersey'});
    model.animateRider({dt:1/60,time,moving:true,jumpY:0,duck:false,speed:4,boosting:false});
    model.rider.position.set(-1.1,0,0);model.rider.rotation.set(0,-.28,Math.sin(time*1.1)*.025);scene.updateMatrixWorld(true);
    model.rider.traverseVisible(object=>{
     if(!object.isMesh)return;
     const positions=object.geometry.attributes.position;
     for(let i=0;i<positions.count;i++){
      const point=new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld).project(camera);
      const x=(point.x+1)*w/2,y=(1-point.y)*h/2;
      assert.ok(x>=12&&x<=menuLeft-12&&y>=12&&y<=h-12&&Math.abs(point.z)<1,
       `${w}x${h} ${vehicle} vertex at ${x},${y}`);
     }
    });
   }
  }
  app.wardrobeOpen.value=false;control.updateCamera(10);assert.equal(camera.view.enabled,false);
 }finally{
  model.dispose();Object.values(primitives.geos).forEach(geo=>geo.dispose());primitives.mats.forEach(mat=>mat.dispose());
  if(width)Object.defineProperty(globalThis,'innerWidth',width);else delete globalThis.innerWidth;
  if(height)Object.defineProperty(globalThis,'innerHeight',height);else delete globalThis.innerHeight;
 }
});
