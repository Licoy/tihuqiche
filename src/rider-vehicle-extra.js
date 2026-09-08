import * as T from 'three';
import {riderColor} from './appearance.js';

export function buildExtraVehicle(world,bike,config){
 const color=riderColor(config.vehicleColor);
 if(config.vehicle==='plane')return buildPlane(world,bike,color);
 return buildCar(world,bike,{color,truck:config.vehicle==='truck'});
}

function buildCar({box,orb,rod,mesh},bike,{color,truck}){
 const part=(name,obj)=>{obj.name=name;return obj};
 part('chassis',box('#263f40',[0,.65,0],[1.38,.27,2.7],bike));
 box(color,[0,truck?.92:.86,-1],[1.42,truck?.61:.5,.72],bike);
 part('hood',orb(color,[0,1.13,-.99],[.69,.12,.37],bike));
 for(const x of [-.69,.69]){
  box(color,[x,1.03,.06],[.13,.65,1.36],bike);
  box('#afc8be',[x*1.02,1.24,-.02],[.025,.06,.25],bike);
 }
 part('seat',box('#243f3d',[0,1.29,.42],[.96,.43,.23],bike));
 box('#243f3d',[0,1.08,.12],[.92,.18,.7],bike);
 const screenY=truck?1.61:1.47;
 part('windshield',box('#8dbbc0',[0,screenY,-.64],[1.17,.34,.055],bike));
 for(const x of [-.63,.63])rod('#f3e6ca',[x,1.23,-.65],[x,screenY+.2,-.64],{radius:.035,parent:bike});
 rod('#f3e6ca',[-.63,screenY+.2,-.64],[.63,screenY+.2,-.64],{radius:.035,parent:bike});
 part('steering-wheel',mesh('torus','#243f3d',{p:[0,1.54,-.44],s:[.2,.2,.2],r:[-.35,0,0],parent:bike}));
 for(const z of [-1.4,1.4])box('#afc8be',[0,.69,z],[1.53,.13,.11],bike);
 part('grille',box('#243f3d',[0,.88,-1.37],[.69,.17,.03],bike));
 for(const x of [-.49,.49]){
  orb('#ffe4a3',[x,1.02,-1.38],[.16,.12,.05],bike);
 }
 if(truck)buildCargo({box,rod},bike,color);
 else{
  part('trunk',box(color,[0,1.01,1.01],[1.42,.51,.71],bike));
  box('#f3e6ca',[0,1.28,1.03],[.22,.04,.67],bike);
 }
 addCarTrim({box,orb,rod},bike,{truck,screenY});
 return {
  pose:truck?{birdY:2,hipY:1.9,footY:1.04,footZ:-.28,kneeY:1.4,kneeZ:-.4}:
   {birdY:1.83,hipY:1.73,footY:.88,footZ:-.32,kneeY:1.25,kneeZ:-.36},
  exhaust:{x:0,y:truck?.7:.6,z:truck?1.64:1.55,scale:1.05},
 };
}

function buildCargo({box,rod},bike,color){
 box(color,[0,.9,1.0],[1.49,.33,1.16],bike).name='cargo-bed';
 for(const x of [-.71,.71]){
  box(color,[x,1.16,1.01],[.1,.5,1.16],bike);
  rod('#536f69',[x,1.435,.46],[x,1.435,1.57],{radius:.035,parent:bike});
 }
 box(color,[0,1.16,1.55],[1.49,.5,.08],bike).name='tailgate';
 const crate=box('#b88c58',[-.24,1.39,1.18],[.62,.68,.63],bike);crate.name='cargo-crate';
 box('#dbb77b',[.40,1.29,1.19],[.49,.48,.63],bike);
 for(const x of [-.44,-.04,.25,.54])box('#edd19a',[x,1.4,x<0?1.505:1.515],[.065,x<0?.63:.40,.025],bike);
 for(const [x,y] of [[-.24,1.78],[.40,1.55]])rod('#365d51',[x,y,.89],[x,y,1.50],{radius:.022,parent:bike});
 box('#e7c995',[-.24,1.74,1.18],[.66,.045,.66],bike);
 box('#365d51',[-.24,1.77,1.18],[.09,.025,.68],bike);
 for(const x of [-.43,.43])box('#536f69',[x,1.0,1.60],[.15,.07,.035],bike);
}

function addCarTrim({box,orb,rod},bike,{truck,screenY}){
 for(const side of [-1,1]){
  rod('#afc8be',[side*.67,1.37,-.57],[side*.82,1.43,-.63],{radius:.024,parent:bike});
  box('#274e49',[side*.85,1.46,-.65],[.15,.13,.08],bike).name='mirror-back';
  box('#aad0d0',[side*.85,1.46,-.602],[.11,.09,.012],bike);
  box('#f3e6ca',[side*.735,.84,.04],[.025,.06,1.35],bike).name='door-trim';
  box('#7caaa9',[side*.24,screenY,-.679],[.045,.30,.012],bike).rotation.z=-.12;
  box('#284e48',[side*.71,1.12,-.37],[.024,.31,.018],bike).name='door-seam';
  box('#a33f33',[side*.5,.94,truck?1.604:1.384],[.27,.17,.036],bike).name='tail-lamp';
  box('#ffd070',[side*.58,.97,truck?1.627:1.409],[.065,.11,.016],bike);
 }
 for(const x of [-.25,-.125,0,.125,.25])box('#c4d1bf',[x,.88,-1.39],[.03,.145,.018],bike);
 box('#fff0cd',[0,.76,truck?1.608:1.458],[.31,.13,.025],bike).name='license-plate';
 box('#345b53',[0,.78,truck?1.624:1.474],[.13,.02,.008],bike);
 orb('#e9ca84',[0,1.266,-1.05],[.08,.025,.11],bike).name='hood-badge';
}

function buildPlane(world,bike,color){
 const {box,orb,rod}=world;
 const part=(name,obj)=>{obj.name=name;return obj};
 part('fuselage',orb(color,[0,.94,.12],[.57,.38,1.43],bike));
 orb('#f3e6ca',[0,.97,-1.26],[.41,.31,.45],bike);
 part('cockpit',orb('#243f3d',[0,1.25,.12],[.4,.1,.58],bike));
 part('wings',box(color,[0,.89,-.1],[2.82,.13,.69],bike));
 for(const x of [-1.29,1.29])box('#f3e6ca',[x,.963,-.1],[.21,.025,.69],bike);
 for(const x of [-.48,.48])rod('#afc8be',[x,.25*1.13,-.44],[x*.5,.83,-.1],{radius:.055,parent:bike});
 rod('#afc8be',[0,.17*1.13,1.13],[0,.76,1.15],{radius:.04,parent:bike});
 part('tailplane',box(color,[0,1.11,1.25],[1.3,.11,.54],bike));
 part('tail-fin',box(color,[0,1.36,1.24],[.13,.62,.53],bike)).rotation.x=-.2;
 box('#f3e6ca',[0,1.48,1.27],[.145,.1,.43],bike);
 part('windscreen',orb('#8dbbc0',[0,1.35,-.43],[.34,.18,.09],bike));
 const propeller=new T.Group();propeller.name='propeller';propeller.position.set(0,.99,-1.74);bike.add(propeller);
 for(const rotation of [0,Math.PI/2]){
  const blade=box('#f3e6ca',[0,0,0],[.13,1.09,.06],propeller);blade.rotation.z=rotation;
  for(const tip of [-.49,.49]){const mark=box('#d78a43',[0,tip,0],[.135,.10,.068],propeller);mark.rotation.z=rotation;mark.position.set(-Math.sin(rotation)*tip,Math.cos(rotation)*tip,0);}
 }
 orb('#e7a343',[0,0,-.055],[.13,.13,.11],propeller);
 addPlaneTrim(world,bike);
 return {
  pose:{birdY:1.9,hipY:1.8,footY:.98,footZ:-.45,kneeY:1.29,kneeZ:-.42},
  exhaust:{x:0,y:.83,z:1.62,scale:.9},
  animate:({dt,moving,boosting})=>{if(moving)propeller.rotation.z+=dt*(boosting?60:36)},
 };
}

function addPlaneTrim({box,orb,rod,mesh},bike){
 for(const side of [-1,1]){
  box('#ca9e63',[side*.84,.968,.18],[.88,.025,.035],bike).name='flap-seam';
  box('#fff0cf',[side*.70,.95,-.43],[1.34,.033,.035],bike).name='leading-edge';
  rod('#e7d3aa',[side*.32,1.16,.20],[side*1.03,.96,-.10],{radius:.026,parent:bike});
  mesh('cylinder','#fff0cf',{p:[side*1.01,.975,-.10],s:[.145,.018,.145],parent:bike}).name='wing-roundel';
  mesh('cylinder','#39726b',{p:[side*1.01,.986,-.10],s:[.075,.018,.075],parent:bike});
  orb(side<0?'#bd5140':'#5aaf87',[side*1.40,.92,-.09],[.036,.045,.06],bike).name='navigation-lamp';
  rod('#afc8be',[side*.08,.83,1.16],[side*.52,1.10,1.33],{radius:.022,parent:bike});
  box('#fff0cf',[side*.573,1.0,.55],[.02,.075,.38],bike).name='fuselage-stripe';
 }
 const rudder=box('#eddbad',[0,1.39,1.45],[.145,.40,.11],bike);rudder.rotation.x=-.2;rudder.name='rudder';
 for(const side of [-1,1])orb('#fff0cf',[side*.585,.98,.52],[.018,.105,.12],bike);
}
