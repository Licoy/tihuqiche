import * as T from 'three';
import { defaultRiderConfig, validateRiderConfig } from './appearance.js';
import { createVehicle } from './rider-vehicle.js';
import { addAccessories, SKIN_COLORS } from './rider-accessories.js';

export function createRider(world, initialConfig=defaultRiderConfig()) {
 const {scene,orb}=world;
 let config=validateRiderConfig(initialConfig),model,disposed=false;
 const rider=new T.Group();rider.name='rider';scene.add(rider);
 const shieldBubble=orb('#80e0c5',[0,2,0],[1.05,2,1.8],rider);
 const shieldMaterial=new T.MeshStandardMaterial({color:'#71e2c3',transparent:true,opacity:.15,roughness:.15,wireframe:true});
 shieldBubble.material=shieldMaterial;shieldBubble.name='shield';shieldBubble.visible=false;shieldBubble.castShadow=false;
 function applyConfig(nextConfig){
  if(disposed)throw new Error('Rider has been disposed');
  const next=validateRiderConfig(nextConfig);
  const replacement=buildModel(world,next);
  if(model)rider.remove(model.root);
  model=replacement;config=next;rider.add(model.root);
 }
 function animateRider(frame){
  if(disposed)throw new Error('Rider has been disposed');
  model.animate(frame);rider.position.y=frame.jumpY;
 }
 function dispose(){
  if(disposed)return;
  disposed=true;rider.removeFromParent();rider.clear();shieldMaterial.dispose();model=null;
 }
 applyConfig(config);
 return {rider,shieldBubble,animateRider,applyConfig,getConfig:()=>({...config}),dispose};
}

function buildModel(world,config) {
const {mesh,orb,rod}=world,palette=SKIN_COLORS[config.skin];
const root=new T.Group();root.name='rider-model';
const {bike,wheels,feet,drive}=createVehicle(world,root,config);
const bird=new T.Group();bird.position.set(0,1.83,.25);root.add(bird);bird.name='bird';
orb(palette[0],[0,.13,.04],[.61,.65,.83],bird);
orb(palette[1],[0,-.1,.23],[.59,.43,.67],bird);
for(let i=0;i<3;i++){const feather=orb(i%2?palette[2]:palette[0],[(i-1)*.2,.12,.77],[.16,.16,.44],bird);feather.rotation.x=-.15}
const neck=orb(palette[0],[0,.65,-.3],[.31,.64,.32],bird);neck.rotation.x=-.29;
const head=new T.Group();head.position.set(0,1.22,-.44);head.rotation.y=-.22;bird.add(head);
orb(palette[3],[0,0,0],[.39,.4,.43],head);
mesh('cone','#f6bb52',{p:[0,-.02,-1.02],s:[.31,1.52,.13],r:[-Math.PI/2,0,0],parent:head});
orb('#eea443',[0,-.27,-.78],[.28,.33,.68],head);
orb('#ffd06f',[0,-.01,-.87],[.29,.075,.73],head);
for(const side of [-1,1]){
 orb('#faefd1',[side*.332,.045,-.2],[.1,.14,.13],head);
 orb('#233e3d',[side*.398,.06,-.232],[.041,.073,.063],head);
 orb('#ffffff',[side*.421,.084,-.26],[.016,.022,.018],head);
}
const scarfTail=addAccessories(world,bird,head,config);
for(const side of [-1,1]){
 const wing=orb(palette[4],[side*.47,.17,-.33],[.2,.27,.68],bird);wing.rotation.x=-.35;wing.rotation.z=side*.2;
 for(let i=0;i<3;i++){const feather=orb(palette[5],[side*(.42+i*.056),-.09,-.74-i*.04],[.085,.075,.32],bird);feather.rotation.x=-.32}
}
const legs=[];
for(const side of [-1,1]){
 const upper=rod('#eca84e',[side*.31,1.67,.25],[side*.32,1.17,-.15],{radius:.055,parent:root});
 const lower=rod('#eca84e',[side*.32,1.17,-.15],[side*.3,.7,0],{radius:.05,parent:root});upper.name='leg-upper:'+legs.length;lower.name='leg-lower:'+legs.length;legs.push({upper,lower});
}

let pedalAngle=0;
function animate({dt,time,moving,jumpY,duck,speed,boosting}){
 const standing=config.vehicle==='scooter';
 if(moving)pedalAngle+=dt*Math.max(0,speed)/1.8;
 if(drive)drive.animate(pedalAngle);
 else wheels.forEach(w=>w.rotation.x=-pedalAngle);
 bike.rotation.x=jumpY>0?Math.sin(jumpY)*.06:0;
 bike.updateMatrix();
 feet.forEach((foot,i)=>{
  const side=i===0?-1:1,angle=pedalAngle+i*Math.PI;
  let y,z,knee;
  if(config.vehicle==='bicycle'){
   y=drive.pedals[i].position.y+.08;z=drive.pedals[i].position.z;
   knee=[side*.33,1.22+Math.sin(angle)*.09,-.22+Math.cos(angle)*.1];
  }else if(standing){
   const pushing=i===1 && moving && jumpY===0 && !duck;
   y=pushing?.24+Math.max(0,Math.sin(pedalAngle))*.35:.63;
   z=pushing?.2+Math.cos(pedalAngle)*.5:.2;
   knee=[side*.32,1.12,z*.5];
  }else{
   y=config.vehicle==='motorcycle'?.83:.77;z=config.vehicle==='motorcycle'?.13:-.32;
   knee=[side*.39,1.2,-.33];
  }
  foot.position.set(side*.3,y,z);
  const hipY=duck?1.48:standing?1.88:1.73;
  alignRod(legs[i].upper,[side*.31,hipY,.25],knee,.055);
  const ankle=foot.position.clone().applyMatrix4(bike.matrix).toArray();
  alignRod(legs[i].lower,knee,ankle,.048);
 });
 bird.scale.y=T.MathUtils.damp(bird.scale.y,duck?.42:1,18,dt);
 bird.position.y=(standing?1.98:1.83)+(moving?Math.sin(pedalAngle*2)*.025:0);
 head.rotation.y=-.22+Math.sin(time*1.2)*.09;
 scarfTail.rotation.set(Math.sin(time*(boosting?14:9))*.13,-.2+Math.sin(time*6)*.2,0);
 bird.rotation.x=T.MathUtils.damp(bird.rotation.x,boosting?-.12:0,12,dt);
}
animate({dt:0,time:0,moving:false,jumpY:0,duck:false,speed:0,boosting:false});
return {root,animate};
}
function alignRod(obj,a,b,r){
 const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);
 obj.position.copy(av.add(bv).multiplyScalar(.5));obj.scale.set(r,d.length(),r);
 obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());
}
