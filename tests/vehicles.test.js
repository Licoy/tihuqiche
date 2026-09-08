import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createModelPrimitives} from '../src/rider-primitives.js';
import {createVehicle} from '../src/rider-vehicle.js';
import {defaultRiderConfig,validateRiderConfig} from '../src/appearance.js';

test('new vehicles have grounded running gear, recognizable bodies and fit one lane',()=>{
 const scene=new T.Scene(),world={scene,...createModelPrimitives(scene)};
 for(const [vehicle,count,part] of [['tricycle',3,'rear-axle'],['car',4,'trunk'],['truck',4,'cargo-crate'],['plane',3,'wings']]){
  const config=Object.freeze({...defaultRiderConfig(),vehicle});
  const model=createVehicle(world,scene,validateRiderConfig(config));
  assert.equal(model.wheels.length,count);assert.ok(model.bike.getObjectByName(part));
  assert.equal(new Set(model.wheels.map(w=>w.position.toArray().join(','))).size,count);
  for(const wheel of model.wheels){
   const bounds=new T.Box3().setFromObject(wheel);
   assert.ok(Math.abs(bounds.min.y)<.00001,'every wheel touches the ground');
  }
  const bounds=new T.Box3().setFromObject(model.bike),size=bounds.getSize(new T.Vector3());
  assert.ok(size.x<3.4,`${vehicle} fits the lane`);assert.ok(size.z<3.8,`${vehicle} remains compact`);
  assert.ok([model.exhaust.x,model.exhaust.y,model.exhaust.z,model.exhaust.scale].every(Number.isFinite));
  model.bike.removeFromParent();
 }
 Object.values(world.geos).forEach(g=>g.dispose());world.mats.forEach(m=>m.dispose());
});

test('tricycle pedals drive all three wheels and aircraft propeller stops with movement',()=>{
 const scene=new T.Scene(),world={scene,...createModelPrimitives(scene)};
 const tricycle=createVehicle(world,scene,{...defaultRiderConfig(),vehicle:'tricycle'});
 tricycle.drive.animate(.73);
 assert.equal(tricycle.drive.pedals.length,2);
 assert.ok(tricycle.wheels.every(w=>w.rotation.x===-1.46));
 assert.ok(Math.abs(tricycle.drive.pedals[0].position.y+tricycle.drive.pedals[1].position.y-1.36)<1e-10);
 const plane=createVehicle(world,scene,{...defaultRiderConfig(),vehicle:'plane'});
 const propeller=plane.bike.getObjectByName('propeller');
 plane.animate({dt:.2,moving:true,boosting:false});const moving=propeller.rotation.z;
 assert.ok(moving>0);
 plane.animate({dt:.2,moving:false,boosting:false});assert.equal(propeller.rotation.z,moving);
 plane.animate({dt:.2,moving:true,boosting:true});assert.ok(propeller.rotation.z-moving>moving);
 for(const model of [tricycle,plane]){
  model.bike.updateMatrixWorld(true);
  model.bike.traverse(node=>assert.ok(node.matrixWorld.elements.every(Number.isFinite)));
 }
 Object.values(world.geos).forEach(g=>g.dispose());world.mats.forEach(m=>m.dispose());
});

test('wheel construction reflects the vehicle and mudguards stay fixed while wheels turn',()=>{
 const scene=new T.Scene(),world={scene,...createModelPrimitives(scene)};
 for(const vehicle of ['bicycle','motorcycle','ebike','scooter','tricycle','car','truck','plane']){
  const model=createVehicle(world,scene,{...defaultRiderConfig(),vehicle});
  const guards=model.bike.children.filter(child=>child.name==='mudguard');
  assert.equal(guards.length,vehicle==='plane'?0:model.wheels.length*5);
  const positions=guards.map(guard=>guard.position.toArray());
  for(const wheel of model.wheels){
   const capped=vehicle==='car'||vehicle==='truck';
   assert.equal(wheel.children.filter(child=>child.name.startsWith('hub-vent:')).length,capped?10:0);
   assert.equal(wheel.children.filter(child=>child.name.startsWith('hub:')).length,2);
   assert.ok(wheel.getObjectByName('tire'));assert.ok(wheel.getObjectByName('rim'));
   wheel.rotation.x=.75;
  }
  model.setSteering(.7);
  assert.deepEqual(guards.map(guard=>guard.position.toArray()),positions);
  assert.ok(model.wheels.every(wheel=>wheel.rotation.y===(wheel.position.z<0?.3:0)));
  for(const wheel of model.wheels)for(const spin of [0,.75,2.4,Math.PI]){
   wheel.rotation.x=spin;
   const axle=new T.Vector3(1,0,0).applyQuaternion(wheel.quaternion);
   assert.ok(Math.abs(axle.y)<1e-12,'steering keeps each axle horizontal through a full wheel rotation');
  }
  model.bike.removeFromParent();
 }
 Object.values(world.geos).forEach(g=>g.dispose());world.mats.forEach(m=>m.dispose());
});
