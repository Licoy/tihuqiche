import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createHomePreview} from '../src/home-preview.js';
import {createModelPrimitives} from '../src/rider-primitives.js';
import {defaultRiderConfig} from '../src/appearance.js';
import {initialGameState} from '../src/rules.js';

// Renderer test double verifies the copy/state contract, not GPU output.
function fixture(){
 const scene=new T.Scene();scene.background=new T.Color('#60c5b6');
 const primitives=createModelPrimitives(scene),copies=[];
 let viewport=new T.Vector4(3,4,800,600),scissor=new T.Vector4(1,2,700,500);
 let colour=new T.Color('#123456'),alpha=.4,clipped=false,target={name:'original'};
 const renderer={domElement:{width:1200,height:900},autoClear:false,frames:[],
  getViewport:out=>out.copy(viewport),setViewport:(...a)=>{viewport=a[0]?.isVector4?a[0].clone():new T.Vector4(...a)},
  getScissor:out=>out.copy(scissor),setScissor:(...a)=>{scissor=a[0]?.isVector4?a[0].clone():new T.Vector4(...a)},
  getClearColor:out=>out.copy(colour),getClearAlpha:()=>alpha,setClearColor:(c,a)=>{colour=new T.Color(c);alpha=a},
  getScissorTest:()=>clipped,setScissorTest:value=>{clipped=value},
  getRenderTarget:()=>target,setRenderTarget:value=>{target=value},getPixelRatio:()=>1.75,
  render:(s,c)=>{s.updateMatrixWorld(true);c.updateMatrixWorld(true);renderer.frames.push({scene:s,camera:c,alpha,colour:colour.getHex()})},
 };
 let bounds={width:420,height:380};
 const canvas={width:0,height:0,getBoundingClientRect:()=>bounds,getClientRects:()=>bounds.width?[bounds]:[],
  getContext:()=>({clearRect(){},drawImage(...args){copies.push(args)}})};
 const world={scene,renderer,...primitives},preview=createHomePreview(world);
 const draw=overrides=>preview.render({active:true,config:defaultRiderConfig(),auto:false,dt:1/60,time:1,...overrides});
 function snapshot(){return [viewport.toArray(),scissor.toArray(),colour.getHex(),alpha,clipped,target,renderer.autoClear]}
 function dispose(){preview.dispose();Object.values(primitives.geos).forEach(g=>g.dispose());primitives.mats.forEach(m=>m.dispose())}
 preview.attach(canvas);
 return {world,renderer,canvas,copies,preview,draw,snapshot,dispose,setBounds:value=>{bounds=value}};
}

test('preview defaults, rotation, player configs and inactive return reuse the real model',()=>{
 assert.equal(initialGameState().homePreviewPlayer,0);assert.equal(initialGameState().homePreviewAuto,true);
 const f=fixture(),configs=[Object.freeze(defaultRiderConfig()),Object.freeze(defaultRiderConfig(1))];
 try{
  f.draw({config:configs[0]});const scene=f.renderer.frames.at(-1).scene,rider=scene.getObjectByName('rider');
  const root=rider.getObjectByName('rider-model'),materials=f.world.mats.size;
  assert.equal(rider.rotation.y,-.3);
  f.preview.rotate(.7);f.draw({config:configs[0]});assert.ok(Math.abs(rider.rotation.y-.4)<1e-9);
  f.draw({config:configs[0],auto:true,dt:2});assert.ok(Math.abs(rider.rotation.y-.9)<1e-9);
  const angle=rider.rotation.y,count=f.renderer.frames.length;
  assert.equal(f.draw({active:false,auto:true,dt:10}),false);assert.equal(f.renderer.frames.length,count);
  f.preview.attach(null);assert.equal(f.draw(),false);f.preview.attach(f.canvas);f.draw();
  assert.equal(rider.rotation.y,angle);assert.equal(rider.getObjectByName('rider-model'),root);
  assert.equal(f.world.mats.size,materials);assert.equal(scene.children.length,3);
  f.draw({config:configs[1]});assert.equal(scene.getObjectByName('rider'),rider);
  assert.notEqual(rider.getObjectByName('rider-model'),root);assert.equal(rider.rotation.y,angle);
  assert.deepEqual(configs[0],defaultRiderConfig());assert.deepEqual(configs[1],defaultRiderConfig(1));
  f.setBounds({width:0,height:0});assert.equal(f.draw(),false);
  let released=0,sharedReleased=0;rider.getObjectByName('shield').material.addEventListener('dispose',()=>released++);
  Object.values(f.world.geos).forEach(g=>g.addEventListener('dispose',()=>sharedReleased++));
  f.preview.dispose();f.preview.dispose();assert.equal(released,1);assert.equal(sharedReleased,0);assert.equal(scene.children.length,0);
 }finally{f.dispose()}
});

test('preview restores renderer state and uniformly limits oversized UI canvases',()=>{
 const f=fixture();
 try{
  const before=f.snapshot();f.draw();assert.deepEqual(f.snapshot(),before);
  f.setBounds({width:2400,height:600});f.draw();
  assert.equal(f.canvas.width,1200);assert.equal(f.canvas.height,300);
  assert.deepEqual(f.copies.at(-1).slice(1),[0,600,1200,300,0,0,1200,300]);
  assert.deepEqual(f.snapshot(),before);
  f.renderer.render=()=>{throw new Error('GPU failure')};
  assert.throws(()=>f.draw(),/GPU failure/);assert.deepEqual(f.snapshot(),before);
 }finally{f.dispose()}
});

test('home and wardrobe destinations share one model while draft changes remain reversible',()=>{
 const f=fixture(),saved=Object.freeze(defaultRiderConfig(1));
 const draft=Object.freeze({...saved,vehicle:'scooter',hat:'cap'}),wardrobeCopies=[];
 const wardrobeCanvas={...f.canvas,getBoundingClientRect:()=>({width:296,height:182}),
  getContext:()=>({clearRect(){},drawImage(...args){wardrobeCopies.push(args)}})};
 try{
  f.draw({config:saved});const scene=f.renderer.frames.at(-1).scene,rider=scene.getObjectByName('rider');
  const homeCopies=f.copies.length,before=f.snapshot();
  f.preview.attach(wardrobeCanvas);f.preview.rotate(Math.PI);f.draw({config:draft});
  assert.equal(f.copies.length,homeCopies);assert.equal(wardrobeCopies.length,1);
  assert.equal(f.renderer.frames.at(-1).scene,scene);assert.equal(scene.getObjectByName('rider'),rider);
  assert.ok(rider.getObjectByName('vehicle:scooter'));assert.deepEqual(f.snapshot(),before);
  f.preview.attach(null);assert.equal(f.draw({config:draft}),false);assert.equal(wardrobeCopies.length,1);
  f.preview.attach(f.canvas);f.draw({config:saved});
  assert.equal(f.copies.length,homeCopies+1);assert.equal(wardrobeCopies.length,1);
  assert.ok(rider.getObjectByName('vehicle:bicycle'));assert.equal(rider.getObjectByName('vehicle:scooter'),undefined);
  assert.deepEqual(saved,defaultRiderConfig(1));assert.equal(draft.vehicle,'scooter');
 }finally{f.dispose()}
});

test('every vehicle remains inside the real preview projection throughout a full turn',()=>{
 const f=fixture();
 try{
  for(const vehicle of ['bicycle','motorcycle','ebike','scooter']){
   for(let i=0;i<24;i++){
    f.draw({config:{...defaultRiderConfig(),vehicle,hat:'cap',glasses:'round',clothes:'jersey'},time:i/4});
    const {scene,camera}=f.renderer.frames.at(-1);
    scene.getObjectByName('rider').traverseVisible(o=>{
     if(!o.isMesh)return;
     const vertices=o.geometry.attributes.position;
     for(let j=0;j<vertices.count;j++){
      const p=new T.Vector3().fromBufferAttribute(vertices,j).applyMatrix4(o.matrixWorld).project(camera);
      assert.ok(Math.abs(p.x)<.96&&Math.abs(p.y)<.96&&Math.abs(p.z)<1,`${vehicle} turn ${i}: ${p.toArray()}`);
     }
    });
    f.preview.rotate(Math.PI/12);
   }
  }
 }finally{f.dispose()}
});


test('wardrobe clears transparently, home stays opaque, and copy failures restore state',()=>{
 const f=fixture();
 try{
  const before=f.snapshot();f.draw({transparent:true});
  assert.equal(f.renderer.frames.at(-1).alpha,0);assert.deepEqual(f.snapshot(),before);
  assert.equal(f.world.scene.background.getHex(),0x60c5b6);
  f.draw();assert.equal(f.renderer.frames.at(-1).alpha,1);
  f.preview.attach({...f.canvas,getContext:()=>({clearRect(){},drawImage(){throw new Error('copy failed')}})});
  assert.throws(()=>f.draw({transparent:true}),/copy failed/);assert.deepEqual(f.snapshot(),before);
  f.renderer.render=()=>{throw new Error('render failed')};
  assert.throws(()=>f.draw({transparent:true}),/render failed/);assert.deepEqual(f.snapshot(),before);
 }finally{f.dispose()}
});

// Run the actual engine factory with controlled renderer/RAF dependencies; no GPU claim.
async function engineFixture(){
 const {readFile}=await import('node:fs/promises');
 const source=(await readFile(new URL('../src/game.js',import.meta.url),'utf8'))
  .replace(/^import .*;\n/gm,'').replace(/^export \{.*\n/gm,'').replace('export function createGame','function createGame');
 const calls=[],scheduled=new Map();let nextId=0,copy=true,failure=null;
 const ref=value=>({value});
 const app={save:{},notify(){},appearance:{players:[defaultRiderConfig(),defaultRiderConfig(1)]},
  settings:{soundEnabled:false,soundStyle:'classic',volume:.65,assistMarkers:true,speedLines:true,ambientLife:true,shadows:true},settingsOpen:ref(false),
  soundEnabled:ref(false),dark:ref(false),selected:ref(0),locale:ref('zh'),state:{},error:ref(null),ready:ref(true),
  wardrobeOpen:ref(false),wardrobeScene:ref(false),wardrobeAuto:ref(true),wardrobeDraft:ref(defaultRiderConfig())};
 const renderer={render(){calls.push('world');if(failure==='world')throw new Error('world failed')}};
 const world={renderer,scene:{},camera:{},finish:{},setTheme(){},setLanguage(){},setSettings(){},updateWorld(){},dispose(){calls.push('dispose-world')}};
 const preview={attach(){},render(){calls.push('preview');if(failure==='preview')throw new Error('preview failed');return copy},dispose(){calls.push('dispose-preview')}};
 const dependencies={T,nextTick(){},initialGameState,createWorld:()=>world,
  createRider:()=>({rider:new T.Object3D(),shieldBubble:{},animateRider(){},dispose(){}}),
  createCourse:()=>({setAssistMarkers(){},updateParticles(){},dispose(){}}),createHomePreview:()=>preview,
  createSound:()=>({tone(){},dispose(){}}),createGameCamera:()=>({updateCamera(){},markers:()=>[]}),
  bindInput:()=>()=>calls.push('unbind'),V:()=>{},performance:{now:()=>0},innerWidth:1280,innerHeight:720,
  requestAnimationFrame:callback=>{scheduled.set(++nextId,callback);return nextId},
  cancelAnimationFrame:id=>scheduled.delete(id),console:{error:(...args)=>calls.push(args),warn(){}}};
 const engine=new Function(...Object.keys(dependencies),`${source}\nreturn createGame;`)(...Object.values(dependencies))({},app);
 function tick(){const [id,callback]=scheduled.entries().next().value;scheduled.delete(id);callback(16)}
 return {engine,app,calls,scheduled,tick,setCopy:value=>{copy=value},fail:value=>{failure=value}};
}

test('whenReady waits for preview copy and world render on the existing RAF only',async()=>{
 const f=await engineFixture();let settled=false;
 const promise=f.engine.whenReady();assert.equal(f.engine.whenReady(),promise);
 promise.then(()=>{settled=true});f.engine.attachHomePreview({});f.setCopy(false);
 assert.equal(f.scheduled.size,1);await Promise.resolve();assert.equal(settled,false);
 f.tick();await Promise.resolve();assert.equal(settled,false);assert.equal(f.scheduled.size,1);
 f.setCopy(true);f.tick();await promise;assert.equal(settled,true);
 assert.deepEqual(f.calls,['preview','world','preview','world']);assert.equal(f.app.ready.value,true);
 assert.equal(f.scheduled.size,1);f.engine.dispose();assert.equal(f.scheduled.size,0);
});

test('first-frame preview and world errors reject readiness and stop RAF with a visible error',async()=>{
 for(const stage of ['preview','world']){
  const f=await engineFixture();f.engine.attachHomePreview({});f.fail(stage);
  const rejection=assert.rejects(f.engine.whenReady(),new RegExp(`${stage} failed`));
  f.tick();await rejection;assert.equal(f.scheduled.size,0);
  assert.equal(f.app.error.value.title,'errorTitle');assert.equal(f.app.error.value.detail,`${stage} failed`);
  assert.ok(f.calls.some(entry=>Array.isArray(entry)&&entry[0]==='Game frame failed'));
  f.engine.dispose();assert.ok(f.calls.includes('dispose-preview'));assert.ok(f.calls.includes('dispose-world'));
 }
});

test('dispose before readiness rejects and releases resources once, existing app errors reject too',async()=>{
 const f=await engineFixture();const rejection=assert.rejects(f.engine.whenReady(),/disposed before first frame/);
 f.engine.dispose();f.engine.dispose();await rejection;
 assert.equal(f.scheduled.size,0);assert.equal(f.calls.filter(value=>value==='dispose-world').length,1);
 const g=await engineFixture();g.app.error.value={title:'contextLost'};
 const contextLost=assert.rejects(g.engine.whenReady(),/contextLost/);g.tick();await contextLost;
 assert.equal(g.scheduled.size,0);assert.equal(g.calls.includes('world'),false);g.engine.dispose();
});


test('engine moves only wardrobe world rider left and restores the original home position',async()=>{
 const f=await engineFixture();f.setCopy(false);f.tick();await f.engine.whenReady();
 assert.equal(f.engine.rider.position.x,1.1);
 const preview=f.engine;
 f.app.wardrobeOpen.value=true;f.app.wardrobeScene.value=true;f.tick();
 assert.equal(preview.rider.position.x,-1.1);
 f.app.wardrobeOpen.value=false;f.tick();assert.equal(preview.rider.position.x,1.1);
 f.engine.dispose();
});
