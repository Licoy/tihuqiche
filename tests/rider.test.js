import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createModelPrimitives} from '../src/rider-primitives.js';
import {createRider} from '../src/rider.js';
import {RIDER_OPTIONS,RIDER_COLORS,defaultRiderConfig,validateRiderConfig} from '../src/appearance.js';

function fixture(){
 const scene=new T.Scene(),primitives=createModelPrimitives(scene);
 return {scene,...primitives};
}
function release(world){
 Object.values(world.geos).forEach(g=>g.dispose());world.mats.forEach(m=>m.dispose());
}
function nodes(root){let count=0;root.traverse(()=>count++);return count;}
function geometrySignature(root){
 root.updateMatrixWorld(true);const result=[];
 root.traverse(o=>{if(o.isMesh)result.push([o.geometry.type,...o.matrixWorld.elements,o.material.color.getHex()])});
 return JSON.stringify(result);
}
const frame=overrides=>({dt:1/60,time:1,moving:true,jumpY:0,duck:false,speed:18,boosting:false,...overrides});

test('rider uses the public world primitives without requiring private resource registries',()=>{
 const world=fixture(),{scene,mesh,box,orb,rod,material}=world;
 const model=createRider({scene,mesh,box,orb,rod,material});
 model.shieldBubble.visible=true;model.animateRider(frame({boosting:true}));
 assert.equal(model.rider.getObjectByName('boost-flame').visible,true);
 model.dispose();release(world);
});

test('catalog is frozen, complete, bilingual and validates without mutating input',()=>{
 assert.deepEqual(Object.keys(RIDER_OPTIONS),['identity','skin','hat','scarf','glasses','clothes','vehicle']);
 assert.ok(Object.isFrozen(RIDER_OPTIONS));assert.ok(Object.isFrozen(RIDER_COLORS));
 for(const list of [...Object.values(RIDER_OPTIONS),RIDER_COLORS]){
  assert.ok(Object.isFrozen(list));
  for(const entry of list){assert.ok(Object.isFrozen(entry));assert.ok(entry.zh);assert.ok(entry.en);}
 }
 const config=Object.freeze(defaultRiderConfig());
 assert.deepEqual(validateRiderConfig(config),config);assert.notEqual(validateRiderConfig(config),config);
 assert.equal(defaultRiderConfig(1).identity,'mm');assert.equal(defaultRiderConfig(1).vehicleColor,'blue');
 for(const bad of [null,[],{}, {...config,skin:'unknown'},{...config,vehicleColor:'#ffffff'},{...config,extra:1}]){
  assert.throws(()=>validateRiderConfig(bad));
 }
 assert.throws(()=>defaultRiderConfig(2));
});

test('every option produces a different real mesh geometry, placement or material',()=>{
 const world=fixture(),model=createRider(world);
 for(const [category,options] of Object.entries(RIDER_OPTIONS)){
  const signatures=new Set();
  for(const option of options){
   model.applyConfig({...defaultRiderConfig(),[category]:option.id});
   signatures.add(geometrySignature(model.rider));
  }
  assert.equal(signatures.size,options.length,category);
 }
 for(const key of ['hatColor','scarfColor','glassesColor','clothesColor','vehicleColor']){
  const signatures=new Set();
  for(const color of RIDER_COLORS){
   model.applyConfig({...defaultRiderConfig(),glasses:'round',clothes:'jersey',[key]:color.id});
   signatures.add(geometrySignature(model.rider));
  }
  assert.equal(signatures.size,RIDER_COLORS.length,key);
 }
 model.dispose();release(world);
});

test('eight vehicle structures use their matching pedal, standing or seated riding poses',()=>{
 const world=fixture(),model=createRider(world),poses=new Set();
 assert.equal(RIDER_OPTIONS.vehicle.length,8);
 for(const vehicle of RIDER_OPTIONS.vehicle){
  model.applyConfig({...defaultRiderConfig(),vehicle:vehicle.id});
  const bike=model.rider.getObjectByName('vehicle:'+vehicle.id);
  assert.ok(bike instanceof T.Group);
  if(vehicle.id==='plane'){
   const wings=bike.getObjectByName('wings'),shield=model.shieldBubble;
   const shieldWidth=shield.scale.x*Math.sqrt(1-((wings.position.y-shield.position.y)/shield.scale.y)**2);
   assert.ok(shieldWidth>wings.scale.x/2,'golden shield encloses the airplane wings');
  }
  const characteristic={bicycle:'chainring',motorcycle:'fuel-tank',ebike:'battery',scooter:'deck',tricycle:'rear-axle',car:'chassis',truck:'cargo-bed',plane:'wings'}[vehicle.id];
  assert.equal(bike.getObjectByName(characteristic)?.type,vehicle.id==='bicycle'?'Group':'Mesh',vehicle.id);
  const foot=model.rider.getObjectByName('foot:1'),before=foot.position.clone();
  model.animateRider(frame({dt:.2}));
  poses.add(foot.position.toArray().join(','));
  assert.notEqual(bike.children[0].rotation.x,0);
  if(['bicycle','tricycle','scooter'].includes(vehicle.id))assert.notDeepEqual(foot.position.toArray(),before.toArray());
  else assert.deepEqual(foot.position.toArray(),before.toArray());
  for(const variant of [{jumpY:1.2},{duck:true},{boosting:true}]){
   model.animateRider(frame(variant));model.rider.updateMatrixWorld(true);
   model.rider.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
   const bounds=new T.Box3().setFromObject(model.rider,true);
   assert.ok(bounds.max.y-bounds.min.y<5);assert.ok(bounds.max.z-bounds.min.z<6.5,'vehicle and rear flame stay within rider camera space');
  }
  assert.equal(model.rider.position.y,0);
 }
 assert.equal(poses.size,7,'bicycle and tricycle share their actual pedal positions');model.dispose();release(world);
});

test('applyConfig keeps root, shield and transforms stable and rejects invalid changes atomically',()=>{
 const world=fixture(),model=createRider(world),rider=model.rider,shield=model.shieldBubble;
 rider.position.set(3,1,-10);rider.rotation.y=.5;shield.visible=true;
 model.applyConfig({...defaultRiderConfig(),vehicle:'scooter'});
 assert.equal(model.rider,rider);assert.equal(model.shieldBubble,shield);assert.equal(shield.visible,true);
 assert.deepEqual(rider.position.toArray(),[3,1,-10]);assert.equal(rider.rotation.y,.5);
 const before=geometrySignature(rider),config=model.getConfig();
 assert.throws(()=>model.applyConfig({...config,hat:'bogus'}));
 assert.equal(geometrySignature(rider),before);assert.deepEqual(model.getConfig(),config);
 config.skin='pink';assert.equal(model.getConfig().skin,'cream');
 model.dispose();release(world);
});

test('layered feathers and expressive eyes retain their shape while blinking without new resources',()=>{
 const world=fixture(),model=createRider(world),count=nodes(model.rider),materials=world.mats.size;
 for(const side of [-1,1]){
  assert.ok(model.rider.getObjectByName('bill-seam:'+side));
  const wing=model.rider.getObjectByName('wing:'+side);
  assert.equal(wing.children.filter(child=>child.name.startsWith('flight-feather:')).length,4);
 }
 model.animateRider(frame({time:4.68}));
 for(const side of [-1,1])assert.ok(model.rider.getObjectByName('eye:'+side).scale.y<=.075);
 model.animateRider(frame({time:4.8}));
 for(const side of [-1,1])assert.equal(model.rider.getObjectByName('eye:'+side).scale.y,1);
 assert.equal(nodes(model.rider),count);assert.equal(world.mats.size,materials);
 model.dispose();release(world);
});

test('the visible rider heading steers front running gear without moving rear wheels or feet off pedals',()=>{
 const world=fixture(),model=createRider(world);
 for(const {id:vehicle} of RIDER_OPTIONS.vehicle){
  model.applyConfig({...defaultRiderConfig(),vehicle});model.rider.rotation.y=.2;model.animateRider(frame({steering:.2}));
  const bike=model.rider.getObjectByName('vehicle:'+vehicle);
  for(const wheel of bike.children.filter(child=>child.name.startsWith('wheel:')))assert.equal(wheel.rotation.y,wheel.position.z<0?.2:0);
  const handlebar=bike.getObjectByName('handlebar');if(handlebar)assert.equal(handlebar.rotation.y,.2);
  if(['bicycle','tricycle'].includes(vehicle)){
   model.rider.updateMatrixWorld(true);
   for(let i=0;i<2;i++){
    const sole=new T.Vector3(0,-.5,0).applyMatrix4(bike.getObjectByName('foot:'+i).matrixWorld);
    const surface=new T.Vector3(0,.03,0).applyMatrix4(bike.getObjectByName('pedal:'+i).matrixWorld);
    assert.ok(sole.distanceTo(surface)<1e-10);
   }
  }
 }
 model.dispose();release(world);
});

test('shield is a filled golden dome with three animated rings and pulsing sparkles',()=>{
 const world=fixture(),model=createRider(world),shield=model.shieldBubble;
 assert.ok(shield.isMesh);assert.equal(shield.visible,false);assert.equal(shield.material.wireframe,false);
 assert.ok(shield.material.color.r>shield.material.color.b*2);
 assert.ok(shield.material.transparent);assert.equal(shield.material.depthWrite,false);
 const rings=shield.children.filter(o=>o.name.startsWith('shield-ring:'));
 const sparks=shield.children.filter(o=>o.name.startsWith('shield-spark:'));
 assert.equal(rings.length,3);assert.equal(sparks.length,8);
 const count=nodes(model.rider),scale=shield.scale.toArray();shield.visible=true;
 model.animateRider(frame({time:1}));const before=geometrySignature(shield),opacity=shield.material.opacity;
 model.animateRider(frame({time:1.1}));
 assert.notEqual(geometrySignature(shield),before);assert.notEqual(shield.material.opacity,opacity);
 assert.deepEqual(shield.scale.toArray(),scale);assert.equal(nodes(model.rider),count);
 assert.ok(sparks.every(s=>s.position.length()>.99&&s.position.length()<1.01));
 model.dispose();release(world);
});

test('boost flame follows each vehicle rear, flickers without allocating nodes and stops immediately',()=>{
 const world=fixture(),model=createRider(world),flame=model.rider.getObjectByName('boost-flame');
 assert.equal(flame.visible,false);
 for(const {id:vehicle} of RIDER_OPTIONS.vehicle){
  model.applyConfig({...defaultRiderConfig(),vehicle});
  const bike=model.rider.getObjectByName('vehicle:'+vehicle),count=nodes(model.rider),materials=world.mats.size;
  assert.equal(model.rider.getObjectByName('boost-flame'),flame);assert.equal(flame.parent,bike);
  assert.ok(flame.position.z>=1.3,'flame starts behind the vehicle');
  model.animateRider(frame({boosting:true,time:2}));assert.equal(flame.visible,true);
  const before=geometrySignature(flame);
  model.animateRider(frame({boosting:true,time:2.15}));assert.notEqual(geometrySignature(flame),before);
  flame.updateMatrixWorld(true);
  for(const name of ['flame-outer','flame-core','flame-hotspot']){
   const cone=flame.getObjectByName(name);
   assert.ok(new T.Vector3(0,.5,0).applyMatrix4(cone.matrix).z>0,'fire tips point toward the rear');
  }
  assert.equal(nodes(model.rider),count);assert.equal(world.mats.size,materials);
  model.animateRider(frame({boosting:false}));assert.equal(flame.visible,false);
  model.animateRider(frame({boosting:true,moving:false}));assert.equal(flame.visible,false);
 }
 model.dispose();release(world);
});

test('player colors and effects are isolated and all exclusive materials are disposed exactly once',()=>{
 const world=fixture(),first=createRider(world),second=createRider(world,defaultRiderConfig(1));
 const scenery=world.box('#E9764E',[8,0,0],[1,1,1]);
 const originalColor=scenery.material.color.getHex(),secondSignature=geometrySignature(second.rider);
 let sharedDisposed=0;
 const exclusive=new Map(),shared=new Set(world.mats.values());
 first.rider.traverse(obj=>{if(obj.isMesh&&!shared.has(obj.material))exclusive.set(obj.material,0)});
 assert.equal(exclusive.size,7,'three shield and four fire materials belong to each rider');
 for(const mat of exclusive.keys())mat.addEventListener('dispose',()=>exclusive.set(mat,exclusive.get(mat)+1));
 for(const g of Object.values(world.geos))g.addEventListener('dispose',()=>sharedDisposed++);
 for(const m of world.mats.values())m.addEventListener('dispose',()=>sharedDisposed++);
 first.applyConfig({...defaultRiderConfig(),hatColor:'green',vehicleColor:'green'});
 first.shieldBubble.visible=true;first.animateRider(frame({dt:.3,boosting:true}));
 assert.equal(scenery.material.color.getHex(),originalColor);
 assert.equal(geometrySignature(second.rider),secondSignature);
 first.dispose();first.dispose();
 assert.deepEqual([...exclusive.values()],Array(7).fill(1));assert.equal(sharedDisposed,0);assert.equal(first.rider.parent,null);
 assert.equal(first.rider.children.length,0);assert.equal(second.rider.parent,world.scene);
 assert.throws(()=>first.applyConfig(defaultRiderConfig()));assert.throws(()=>first.animateRider(frame()));
 second.dispose();release(world);
});

test('100 full wardrobe passes keep real scene nodes and shared resource counts bounded',()=>{
 const world=fixture(),model=createRider(world);
 const configs=RIDER_OPTIONS.vehicle.flatMap(({id:vehicle})=>RIDER_COLORS.map(({id:color})=>({
  ...defaultRiderConfig(),vehicle,hat:'cap',glasses:'sunglasses',clothes:'jersey',
  hatColor:color,scarfColor:color,glassesColor:color,clothesColor:color,vehicleColor:color,
 })));
 const expected=new Map();
 for(const config of configs){model.applyConfig(config);expected.set(JSON.stringify(config),nodes(world.scene));}
 const materials=world.mats.size,geometries=Object.keys(world.geos).length;
 const exclusive=new Set();
 model.rider.traverse(o=>{if(o.isMesh&&![...world.mats.values()].includes(o.material))exclusive.add(o.material)});
 assert.equal(exclusive.size,7);
 for(let pass=0;pass<100;pass++)for(const config of configs){
  model.applyConfig(config);model.animateRider(frame());
  assert.equal(nodes(world.scene),expected.get(JSON.stringify(config)));
  assert.equal(world.mats.size,materials);assert.equal(Object.keys(world.geos).length,geometries);
  model.rider.traverse(o=>{if(o.isMesh){
   assert.ok(Object.values(world.geos).includes(o.geometry));
   assert.ok(exclusive.has(o.material) || [...world.mats.values()].includes(o.material));
  }});
 }
 model.dispose();assert.equal(nodes(world.scene),1);release(world);
});

test('wheel spokes stay inside tires and animated legs reach the actual feet',()=>{
 const world=fixture(),model=createRider(world);
 for(const {id:vehicle} of RIDER_OPTIONS.vehicle){
  model.applyConfig({...defaultRiderConfig(),vehicle});
  const bike=model.rider.getObjectByName('vehicle:'+vehicle);
  const wheels=bike.children.filter(child=>child.name.startsWith('wheel:'));
  assert.equal(wheels.length,{tricycle:3,car:4,truck:4,plane:3}[vehicle]??2,vehicle);
  for(const wheel of wheels){
   const tire=wheel.children[0],radius=tire.scale.y;
   const spokes=wheel.children.filter(child=>child.name.startsWith('spoke:'));
   assert.equal(spokes.length,['car','truck'].includes(vehicle)?0:['bicycle','tricycle'].includes(vehicle)?8:vehicle==='plane'?3:5);
   assert.equal(wheel.children.filter(child=>child.name.startsWith('hub:')).length,2,'every wheel has supported hubs');
   for(const spoke of spokes){
    const endpoint=new T.Vector3(0,.5,0).applyMatrix4((spoke.updateMatrix(),spoke.matrix));
    assert.ok(Math.hypot(endpoint.y,endpoint.z)<=radius,'spoke fits inside tire');
   }
  }
  for(const duck of [false,true])for(const moving of [false,true])for(const jumpY of [0,1.2]){
   model.animateRider(frame({duck,moving,jumpY}));model.rider.updateMatrixWorld(true);
   for(let seat=0;seat<2;seat++){
    const upper=model.rider.getObjectByName('leg-upper:'+seat);
    const lower=model.rider.getObjectByName('leg-lower:'+seat);
    const foot=model.rider.getObjectByName('foot:'+seat);
    const knee=new T.Vector3(0,.5,0).applyMatrix4(upper.matrixWorld);
    const lowerStart=new T.Vector3(0,-.5,0).applyMatrix4(lower.matrixWorld);
    const ankle=new T.Vector3(0,.5,0).applyMatrix4(lower.matrixWorld);
    assert.ok(knee.distanceTo(lowerStart)<1e-10,'leg segments meet');
    assert.ok(ankle.distanceTo(foot.getWorldPosition(new T.Vector3()))<1e-10,'leg reaches foot');
   }
  }
 }
 model.dispose();release(world);
});

test('bicycle pedals support both soles while opposite cranks drive the gears and wheels',()=>{
 const world=fixture(),model=createRider(world),bike=model.rider.getObjectByName('vehicle:bicycle');
 let angle=0;
 for(const variant of [{dt:0},{dt:.13},{dt:.27,jumpY:1.2},{dt:.2,duck:true},{dt:.4,boosting:true}]){
  const current=frame(variant);angle+=current.dt*current.speed/1.8;
  model.animateRider(current);model.rider.updateMatrixWorld(true);
  const pedals=[0,1].map(i=>bike.getObjectByName('pedal:'+i));
  assert.ok(Math.abs(pedals[0].position.y+pedals[1].position.y-1.36)<1e-10);
  assert.ok(Math.abs(pedals[0].position.z+pedals[1].position.z-.1)<1e-10);
  for(let i=0;i<2;i++){
   const foot=bike.getObjectByName('foot:'+i),pedal=pedals[i],crank=bike.getObjectByName('crank:'+i);
   const sole=new T.Vector3(0,-.5,0).applyMatrix4(foot.matrixWorld);
   const surface=new T.Vector3(0,.03,0).applyMatrix4(pedal.matrixWorld);
   assert.ok(sole.distanceTo(surface)<1e-10,'sole meets horizontal pedal top, also during jumping');
   assert.equal(pedal.rotation.x,0,'pedal does not tumble with crank');
   const crankEnd=new T.Vector3(0,0,.23).applyMatrix4((crank.updateMatrix(),crank.matrix));
   assert.ok(Math.abs(crankEnd.y-pedal.position.y)<1e-10);
   assert.ok(Math.abs(crankEnd.z-pedal.position.z)<1e-10);
  }
  assert.ok(Math.abs(bike.getObjectByName('chainring').rotation.x+angle)<1e-10);
  assert.ok(Math.abs(bike.getObjectByName('rear-sprocket').rotation.x+2*angle)<1e-10);
  for(const wheel of bike.children.slice(0,2))assert.equal(wheel.rotation.x,bike.getObjectByName('rear-sprocket').rotation.x);
 }
 model.dispose();release(world);
});

test('bicycle chain closes around both sprockets, circulates without adding nodes and stays still when stopped',()=>{
 const world=fixture(),model=createRider(world),bike=model.rider.getObjectByName('vehicle:bicycle');
 const chain=bike.getObjectByName('chain'),count=nodes(bike),materials=world.mats.size;
 function checkLoop(){
  chain.updateMatrixWorld(true);
  const ends=chain.children.map(link=>({
   start:new T.Vector3(0,0,-.5).applyMatrix4(link.matrixWorld),
   end:new T.Vector3(0,0,.5).applyMatrix4(link.matrixWorld),
  }));
  for(let i=0;i<ends.length;i++)assert.ok(ends[i].end.distanceTo(ends[(i+1)%ends.length].start)<1e-10,'adjacent links share endpoint including closing link');
  for(const name of ['chainring','rear-sprocket']){
   const gear=bike.getObjectByName(name),radius=name==='chainring'?.23:.115;
   const vertices=chain.children.map(link=>new T.Vector3(0,0,-.5).applyMatrix4((link.updateMatrix(),link.matrix)));
   const onWrap=vertices.filter(p=>Math.abs(Math.hypot(p.y-gear.position.y,p.z-gear.position.z)-radius)<1e-8);
   assert.ok(onWrap.length>=8,'multiple chain links wrap the actual gear pitch circle');
   assert.ok(vertices.every(p=>Math.abs(p.x-.18)<1e-10),'drive is visible on positive x side');
  }
  assert.equal(nodes(bike),count);assert.equal(world.mats.size,materials);
 }
 checkLoop();const before=geometrySignature(chain);
 model.animateRider(frame({dt:.137}));checkLoop();assert.notEqual(geometrySignature(chain),before);
 const stopped=geometrySignature(bike);
 for(let i=0;i<20;i++){model.animateRider(frame({moving:false,dt:.1,time:i}));checkLoop();assert.equal(geometrySignature(bike),stopped);}
 model.dispose();release(world);
});
