import * as T from 'three';
import { riderColor } from './appearance.js';
import { createBicycleDrive } from './bicycle-drive.js';
export function createVehicle(world,parent,config) {
const {mesh,box,orb,rod}=world,color=riderColor(config.vehicleColor);
const bike=new T.Group();parent.add(bike);bike.name='vehicle:'+config.vehicle;
const wheels=[];
const scooter=config.vehicle==='scooter';
const wheelSize=scooter?.32:config.vehicle==='motorcycle'?.61:.52;
for(const z of [-1.03,1.03]){
 const wheel=new T.Group();wheel.position.set(0,wheelSize*1.13,z);bike.add(wheel);
 mesh('torus','#263f40',{s:[wheelSize,wheelSize,wheelSize],r:[0,Math.PI/2,0],parent:wheel});
 mesh('torus','#ede6d0',{s:[wheelSize*.85,wheelSize*.85,wheelSize*.85],r:[0,Math.PI/2,0],parent:wheel});
 for(let i=0;i<8;i++){const a=i*Math.PI/4;rod('#93adaa',[0,0,0],[0,Math.sin(a)*wheelSize*.85,Math.cos(a)*wheelSize*.85],{radius:.012,parent:wheel})}
 const axleEnd=config.vehicle==='bicycle' && z>0?.215:.1;
 rod('#d6c8a6',[-.1,0,0],[axleEnd,0,0],{radius:.07,parent:wheel});wheels.push(wheel);
}
if(config.vehicle==='bicycle'){
const framePoints=[[0,.57,1.03],[0,1.42,.43],[0,.62,.03],[0,.57,1.03],[0,1.42,.43],[0,1.39,-.67],[0,.62,.03],[0,1.39,-.67],[0,.57,-1.03]];
for(let i=0;i<framePoints.length-1;i++)rod(color,framePoints[i],framePoints[i+1],{radius:.06,parent:bike});
rod(color,[.015,1.46,.37],[.015,1.43,-.64],{radius:.022,parent:bike});
rod('#254c48',[0,1.33,.43],[0,1.68,.46],{radius:.048,parent:bike});
orb('#243f3d',[0,1.68,.47],[.31,.09,.3],bike);
rod('#afc8be',[0,1.39,-.67],[0,1.95,-.88],{radius:.046,parent:bike});
rod('#284e48',[-.49,1.98,-.91],[.49,1.98,-.91],{radius:.055,parent:bike});
for(const x of [-.49,.49])orb('#f2c18b',[x,1.98,-.91],[.13,.08,.1],bike);

}
else {
 buildMotorBody(world,bike,config,color);
}
const feet=[];
for(const side of [-1,1]){
 const foot=box('#e7a343',[side*.3,.71,.05],[.26,.1,.33],bike);foot.name='foot:'+feet.length;feet.push(foot);
}
if(config.vehicle==='bicycle'){
box('#f5cc85',[0,1.18,1.16],[.53,.37,.45],bike);
for(const x of [-.19,0,.19])box('#cc9460',[x,1.18,1.397],[.022,.35,.018],bike);
}
const drive=config.vehicle==='bicycle'?createBicycleDrive(world,bike,wheels):null;
return {bike,wheels,feet,drive};
}
function buildMotorBody({box,orb,rod},bike,config,color) {
  const scooter=config.vehicle==='scooter',motorcycle=config.vehicle==='motorcycle';
  const part=(name,obj)=>{obj.name=name;return obj};
  if(scooter){
    part('deck',box(color,[0,.48,.05],[.54,.16,1.75],bike));
    rod(color,[0,.42,-1.03],[0,2.0,-.88],{radius:.07,parent:bike});
    box('#f3e6ca',[0,.57,.12],[.36,.025,1.22],bike);
  } else {
    box(color,[0,1.0,.15],[.55,.6,1.6],bike);
    part('seat',orb('#243f3d',[0,1.64,.45],[.36,.13,.65],bike));
    if(motorcycle){
      part('fuel-tank',orb(color,[0,1.5,-.43],[.4,.35,.57],bike));
      rod('#243f3d',[-.48,.74,.13],[.48,.74,.13],{radius:.04,parent:bike});
      part('engine',box('#536361',[0,.84,.1],[.65,.42,.65],bike));
      for(let i=0;i<4;i++)box('#afc8be',[0,.72+i*.09,.1],[.68,.035,.68],bike);
      rod('#afc8be',[.4,.75,.1],[.4,.75,1.3],{radius:.09,parent:bike});
    } else {
      part('battery',box(color,[0,1.18,-.57],[.65,.85,.3],bike));
      part('floorboard',box('#243f3d',[0,.65,-.2],[.75,.13,.9],bike));
      box('#f3e6ca',[0,1.8,1.04],[.65,.43,.5],bike);
    }
    for(const z of [-1.03,1.03])rod('#afc8be',[0,.6,z],[0,1.4,z*.7],{radius:.055,parent:bike});
    rod('#afc8be',[0,1.25,-.7],[0,2,-.88],{radius:.07,parent:bike});
    part('headlight',orb('#ffe4a3',[0,1.74,-1.03],[.24,.2,.12],bike));
  }
  rod('#284e48',[-.49,2,-.91],[.49,2,-.91],{radius:.055,parent:bike});
  for(const x of [-.49,.49])orb('#243f3d',[x,2,-.91],[.13,.08,.1],bike);
}
