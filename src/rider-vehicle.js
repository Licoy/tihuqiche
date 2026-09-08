import * as T from 'three';
import { riderColor } from './appearance.js';
import { createBicycleDrive } from './bicycle-drive.js';
import { buildExtraVehicle } from './rider-vehicle-extra.js';
import { addFootDetails } from './rider-details.js';
export function createVehicle(world,parent,config) {
const {box,orb,rod}=world,color=riderColor(config.vehicleColor);
const bike=new T.Group();parent.add(bike);bike.name='vehicle:'+config.vehicle;
const pedalVehicle=['bicycle','tricycle'].includes(config.vehicle),extraVehicle=['car','truck','plane'].includes(config.vehicle);
const scooter=config.vehicle==='scooter';
const wheelSize=scooter?.32:config.vehicle==='motorcycle'?.61:.52;
let layout=[[0,-1.03,wheelSize],[0,1.03,wheelSize]];
if(config.vehicle==='tricycle')layout=[[0,-1.03,.52],[-.69,1.03,.52],[.69,1.03,.52]];
if(config.vehicle==='car'||config.vehicle==='truck')layout=[[-.69,-.92,.38],[.69,-.92,.38],[-.69,.92,.38],[.69,.92,.38]];
if(config.vehicle==='plane')layout=[[-.48,-.44,.25],[.48,-.44,.25],[0,1.13,.17]];
const wheels=layout.map(([x,z,radius],i)=>buildWheel(world,bike,{x,z,radius,index:i,vehicle:config.vehicle,axleEnd:pedalVehicle&&z>0?.215:.1}));
if(config.vehicle!=='plane')layout.forEach(([x,z,radius])=>addMudguard(world,bike,{x,z,radius,color,pedalVehicle}));
if(pedalVehicle){
const framePoints=[[0,.57,1.03],[0,1.42,.43],[0,.62,.03],[0,.57,1.03],[0,1.42,.43],[0,1.39,-.67],[0,.62,.03],[0,1.39,-.67],[0,.57,-1.03]];
for(let i=0;i<framePoints.length-1;i++)rod(color,framePoints[i],framePoints[i+1],{radius:.06,parent:bike});
rod(color,[.015,1.46,.37],[.015,1.43,-.64],{radius:.022,parent:bike});
rod('#254c48',[0,1.33,.43],[0,1.68,.46],{radius:.048,parent:bike});
orb('#243f3d',[0,1.68,.47],[.31,.09,.3],bike);
rod('#afc8be',[0,1.39,-.67],[0,1.95,-.88],{radius:.046,parent:bike});
buildHandlebar(world,bike,false);
box('#f2ead4',[0,1.85,-.99],[.21,.18,.13],bike).name='front-lamp';
orb('#ffe29c',[0,1.85,-1.065],[.08,.065,.035],bike);
box('#c75140',[0,1.29,1.4],[.21,.12,.04],bike).name='rear-reflector';
rod('#254c48',[0,.8,-.02],[0,1.18,-.32],{radius:.066,parent:bike});
box('#fff0c6',[0,1.03,-.21],[.15,.07,.14],bike).rotation.x=-.65;

}
else if(!extraVehicle){
 buildMotorBody(world,bike,config,color);
}
const extra=extraVehicle?buildExtraVehicle(world,bike,config):{};
const feet=[];
for(const side of [-1,1]){
 const foot=box('#e7a343',[side*.3,.71,.05],[.26,.1,.33],bike);foot.name='foot:'+feet.length;feet.push(foot);addFootDetails(world,foot);
}
if(pedalVehicle){
const tricycle=config.vehicle==='tricycle';
const basket=box('#f5cc85',[0,1.18,1.16],[tricycle?1.24:.53,.37,.45],bike);basket.name='basket';
for(const x of tricycle?[-.5,-.25,0,.25,.5]:[-.19,0,.19])box('#cc9460',[x,1.18,1.397],[.022,.35,.018],bike);
if(tricycle){
 rod('#536361',[-.69,.52*1.13,1.03],[.69,.52*1.13,1.03],{radius:.075,parent:bike}).name='rear-axle';
 for(const x of [-.59,.59])rod(color,[0,.62,.03],[x,.65,1.03],{radius:.055,parent:bike});
 for(const z of [.94,1.38])rod('#845d3c',[-.60,1.39,z],[.60,1.39,z],{radius:.026,parent:bike});
 for(const x of [-.60,.60])rod('#845d3c',[x,1.39,.94],[x,1.39,1.38],{radius:.026,parent:bike});
 for(const x of [-.38,.38])box('#845d3c',[x,1.19,1.403],[.05,.31,.025],bike);
 box('#f6e1aa',[0,1.4,1.14],[.49,.06,.22],bike).name='basket-lid';
}
}
const drive=pedalVehicle?createBicycleDrive(world,bike,wheels):null;
const handlebar=bike.getObjectByName('handlebar'),steeringWheel=bike.getObjectByName('steering-wheel');
function setSteering(angle){
 const turn=T.MathUtils.clamp(angle,-.30,.30);
 wheels.forEach(wheel=>{wheel.rotation.y=wheel.position.z<0?turn:0});
 if(handlebar)handlebar.rotation.y=turn;if(steeringWheel)steeringWheel.rotation.z=-turn*2;
}
return {bike,wheels,feet,drive,setSteering,exhaust:{x:0,y:.65,z:1.52,scale:1},...extra};
}
function buildWheel({mesh,rod,box},bike,{x,z,radius,index,axleEnd,vehicle}){
 const wheel=new T.Group();wheel.name='wheel:'+index;wheel.rotation.order='YXZ';wheel.position.set(x,radius*1.13,z);bike.add(wheel);
 const capped=vehicle==='car'||vehicle==='truck',wire=vehicle==='bicycle'||vehicle==='tricycle';
 const depth=capped?.95:vehicle==='motorcycle'?.75:radius;
 mesh('torus','#263f40',{s:[radius,radius,depth],r:[0,Math.PI/2,0],parent:wheel}).name='tire';
 mesh('torus','#a8b9ac',{s:[radius*.79,radius*.79,radius*.38],r:[0,Math.PI/2,0],parent:wheel}).name='rim';
 const count=wire?8:vehicle==='plane'?3:5;
 if(!capped)for(let i=0;i<count;i++){
  const a=i*2*Math.PI/count;
  rod('#bdcbbb',[0,0,0],[0,Math.sin(a)*radius*.80,Math.cos(a)*radius*.80],{radius:wire?.012:.028,parent:wheel}).name='spoke:'+i;
 }
 for(const side of [-1,1]){
  const face=side*(depth*.13+.012);
  mesh('cylinder',capped?'#e7dec5':'#536f69',{p:[face,0,0],s:[radius*(capped?.66:.20),.035,radius*(capped?.66:.20)],r:[0,0,Math.PI/2],parent:wheel}).name='hub:'+side;
  if(capped){
   mesh('cylinder',vehicle==='truck'?'#536f69':'#98aba1',{p:[face+side*.023,0,0],s:[radius*.27,.025,radius*.27],r:[0,0,Math.PI/2],parent:wheel});
   for(let i=0;i<5;i++){
    const angle=i*2*Math.PI/5,vent=box('#536f69',[face+side*.021,Math.sin(angle)*radius*.46,Math.cos(angle)*radius*.46],[.017,radius*.10,radius*.19],wheel);
    vent.rotation.x=-angle;vent.name='hub-vent:'+side+':'+i;
   }
  }
 }
 rod('#d6c8a6',[-.1,0,0],[axleEnd,0,0],{radius:.07,parent:wheel});return wheel;
}
function addMudguard({box},bike,{x,z,radius,color,pedalVehicle}){
 const arch=radius*1.18,baseY=radius*1.13;
 for(let i=0;i<5;i++){
  const a=Math.PI*(.15+i*.14),b=a+Math.PI*.14;
  const ay=Math.sin(a)*arch,az=Math.cos(a)*arch,by=Math.sin(b)*arch,bz=Math.cos(b)*arch;
  const panel=box(color,[x,baseY+(ay+by)/2,z+(az+bz)/2],[pedalVehicle?.17:.34,.065,Math.hypot(by-ay,bz-az)+.015],bike);
  panel.rotation.x=-Math.atan2(by-ay,bz-az);panel.name='mudguard';
 }
}
function buildHandlebar({rod,orb,box},bike,mirrors){
 const bar=new T.Group();bar.name='handlebar';bar.position.set(0,1.98,-.91);bike.add(bar);
 rod('#284e48',[-.49,0,0],[.49,0,0],{radius:.055,parent:bar});
 for(const side of [-1,1]){
  orb('#243f3d',[side*.45,0,0],[.15,.075,.08],bar);
  rod('#bdcbbb',[side*.39,-.015,-.10],[side*.55,-.04,-.06],{radius:.018,parent:bar});
  if(mirrors){
   rod('#afc8be',[side*.39,.02,0],[side*.58,.30,-.10],{radius:.018,parent:bar});
   orb('#243f3d',[side*.59,.34,-.11],[.105,.085,.035],bar).name='mirror-back';
   orb('#a9ced1',[side*.59,.34,-.073],[.085,.065,.01],bar).name='mirror-glass';
  }
 }
 box('#ddd6bb',[0,.03,-.01],[.13,.08,.12],bar);
}
function buildMotorBody({box,orb,rod},bike,config,color) {
  const scooter=config.vehicle==='scooter',motorcycle=config.vehicle==='motorcycle';
  const part=(name,obj)=>{obj.name=name;return obj};
  if(scooter){
    part('deck',box(color,[0,.48,.05],[.54,.16,1.75],bike));
    rod(color,[0,.42,-1.03],[0,2.0,-.88],{radius:.07,parent:bike});
    box('#f3e6ca',[0,.57,.12],[.36,.025,1.22],bike);
  } else {
    part('seat',orb('#243f3d',[0,1.64,.45],[.36,.13,.65],bike));
    if(motorcycle){
      box('#263f40',[0,1.08,.18],[.30,.19,1.30],bike);
      for(const side of [-1,1]){
       orb(color,[side*.23,1.27,.58],[.11,.19,.38],bike).name='side-fairing';
       rod(color,[side*.23,.63,.76],[side*.23,.62,-.42],{radius:.055,parent:bike});
       rod(color,[side*.23,.62,-.42],[side*.23,1.26,-.69],{radius:.055,parent:bike});
       rod(color,[side*.23,.63,.76],[side*.23,1.28,.5],{radius:.055,parent:bike});
      }
      part('fuel-tank',orb(color,[0,1.5,-.43],[.4,.35,.57],bike));
      rod('#243f3d',[-.48,.74,.13],[.48,.74,.13],{radius:.04,parent:bike});
      part('engine',box('#536361',[0,.84,.1],[.65,.42,.65],bike));
      for(let i=0;i<4;i++)box('#afc8be',[0,.72+i*.09,.1],[.68,.035,.68],bike);
      rod('#afc8be',[.4,.75,.1],[.4,.75,1.3],{radius:.09,parent:bike});
    } else {
      part('rear-fairing',orb(color,[0,1.11,.64],[.31,.34,.52],bike));
      part('battery',box(color,[0,1.18,-.57],[.65,.85,.3],bike));
      part('floorboard',box('#243f3d',[0,.65,-.2],[.75,.13,.9],bike));
      box('#f3e6ca',[0,1.8,1.04],[.65,.43,.5],bike);
    }
    for(const z of [-1.03,1.03])rod('#afc8be',[0,.6,z],[0,1.4,z*.7],{radius:.055,parent:bike});
    rod('#afc8be',[0,1.25,-.7],[0,2,-.88],{radius:.07,parent:bike});
    part('headlight',orb('#ffe4a3',[0,1.74,-1.03],[.24,.2,.12],bike));
  }
  buildHandlebar({rod,orb,box},bike,!scooter);
  box('#b94336',[0,scooter?.54:1.41,1.35],[scooter?.22:.34,.12,.07],bike).name='rear-lamp';
  if(!scooter){
   box('#f3e6ca',[0,1.1,1.37],[.29,.16,.025],bike).name='rear-plate';
   for(const z of [-.3,.05,.4])box('#345b53',[0,1.646,z],[.58,.028,.025],bike);
  }
}
