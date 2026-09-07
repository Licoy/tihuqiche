import * as T from 'three';

const CENTER=[.68,.05], REAR=[.52*1.13,1.03];
const FRONT_RADIUS=.23, REAR_RADIUS=.115, CRANK_RADIUS=.23;

// External tangents and the two wrap arcs form one continuous chain pitch line.
function chainPath(){
 const dy=REAR[0]-CENTER[0],dz=REAR[1]-CENTER[1],distance=Math.hypot(dy,dz);
 const bearing=Math.atan2(dy,dz),alpha=Math.acos((FRONT_RADIUS-REAR_RADIUS)/distance);
 const straight=Math.sqrt(distance**2-(FRONT_RADIUS-REAR_RADIUS)**2);
 const rearArc=2*alpha*REAR_RADIUS,frontArc=(2*Math.PI-2*alpha)*FRONT_RADIUS;
 const length=2*straight+rearArc+frontArc;
 const circle=(center,r,a,target)=>target.set(.18,center[0]+r*Math.sin(a+bearing),center[1]+r*Math.cos(a+bearing));
 const top=circle(CENTER,FRONT_RADIUS,alpha,new T.Vector3()),backTop=circle(REAR,REAR_RADIUS,alpha,new T.Vector3());
 const bottom=circle(CENTER,FRONT_RADIUS,-alpha,new T.Vector3()),backBottom=circle(REAR,REAR_RADIUS,-alpha,new T.Vector3());
 function at(travel,target){
  let s=((travel%length)+length)%length;
  if(s<straight)return target.lerpVectors(top,backTop,s/straight);
  s-=straight;
  if(s<rearArc)return circle(REAR,REAR_RADIUS,alpha-s/REAR_RADIUS,target);
  s-=rearArc;
  if(s<straight)return target.lerpVectors(backBottom,bottom,s/straight);
  return circle(CENTER,FRONT_RADIUS,-alpha-(s-straight)/FRONT_RADIUS,target);
 }
 return {length,at};
}

function sprocket(world,parent,name,center,radius,teeth){
 const group=new T.Group();group.name=name;group.position.set(.18,...center);parent.add(group);
 world.mesh('torus','#afc8be',{s:[radius*.91,radius*.91,radius*.91],r:[0,Math.PI/2,0],parent:group});
 world.rod('#536361',[-.035,0,0],[.035,0,0],{radius:.055,parent:group});
 for(let i=0;i<teeth;i++){
  const a=i*2*Math.PI/teeth;
  const tooth=world.box('#afc8be',[0,radius*Math.sin(a),radius*Math.cos(a)],[.04,.037,.034],group);
  tooth.rotation.x=-a;
 }
 for(let i=0;i<5;i++){
  const a=i*2*Math.PI/5;
  world.rod('#afc8be',[0,0,0],[0,Math.sin(a)*radius*.85,Math.cos(a)*radius*.85],{radius:.019,parent:group});
 }
 return group;
}

export function createBicycleDrive(world,bike,wheels){
 const front=sprocket(world,bike,'chainring',CENTER,FRONT_RADIUS,24);
 const rear=sprocket(world,bike,'rear-sprocket',REAR,REAR_RADIUS,12);
 world.rod('#536361',[-.3,...CENTER],[.3,...CENTER],{radius:.042,parent:bike});
 const pedals=[],cranks=[];
 for(let i=0;i<2;i++){
  const side=i===0?-1:1,crank=new T.Group();crank.name='crank:'+i;crank.position.set(side*.24,...CENTER);bike.add(crank);
  world.rod('#afc8be',[0,0,0],[0,0,CRANK_RADIUS],{radius:.032,parent:crank});cranks.push(crank);
  const pedal=new T.Group();pedal.name='pedal:'+i;bike.add(pedal);
  world.box('#263f40',[0,0,0],[.3,.06,.28],pedal);
  world.rod('#afc8be',[-.17,0,0],[.17,0,0],{radius:.026,parent:pedal});
  for(const z of [-.145,.145])world.box('#f5cc85',[0,0,z],[.19,.028,.016],pedal);
  pedals.push(pedal);
 }
 const chain=new T.Group();chain.name='chain';bike.add(chain);
 const path=chainPath(),count=96,pitch=path.length/count;
 const links=Array.from({length:count},(_,i)=>{
  const link=world.box(i%2?'#536361':'#afc8be',[0,0,0],[.045,.026,pitch],chain);link.name='chain-link:'+i;return link;
 });
 const axis=new T.Vector3(0,0,1),start=new T.Vector3(),end=new T.Vector3(),direction=new T.Vector3();
 function animate(angle){
  front.rotation.x=-angle;rear.rotation.x=-angle*FRONT_RADIUS/REAR_RADIUS;
  wheels.forEach(wheel=>{wheel.rotation.x=rear.rotation.x});
  pedals.forEach((pedal,i)=>{
   const phase=angle+i*Math.PI;cranks[i].rotation.x=-phase;
   pedal.position.set(i===0?-.3:.3,CENTER[0]+Math.sin(phase)*CRANK_RADIUS,CENTER[1]+Math.cos(phase)*CRANK_RADIUS);
  });
  links.forEach((link,i)=>{
   path.at(i*pitch-angle*FRONT_RADIUS,start);path.at((i+1)*pitch-angle*FRONT_RADIUS,end);
   direction.subVectors(end,start);link.position.copy(start).add(end).multiplyScalar(.5);
   link.scale.z=direction.length();link.quaternion.setFromUnitVectors(axis,direction.normalize());
  });
 }
 animate(0);
 return {animate,pedals};
}
