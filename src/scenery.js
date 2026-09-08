import * as T from 'three';
import { LEVELS } from './levels.js';
import { createCityScenery } from './city-scenery.js';
import { createSceneryProps } from './scenery-props.js';
import { createSceneryLife } from './scenery-life.js';

export function createScenery({ scene, box, orb, rod, mesh }) {
 const cities = createCityScenery({ box, orb, rod, mesh });
 const props = createSceneryProps({ box, orb, rod, mesh });
 const life = createSceneryLife({ scene, box, orb, rod, mesh });
function palm(parent,x,z,scale=1){
 const g=new T.Group();g.position.set(x,-1.2,z);g.scale.setScalar(scale);parent.add(g);
 orb('#e5d6ad',[0,-.65,0],[2.8,.75,2.6],g);
 const trunk=rod('#b28b5f',[0,0,0],[.55,5.3,.1],{radius:.18,parent:g});
 for(let j=0;j<6;j++){
  const a=j*Math.PI/3,leaf=mesh('sphere',j%2?'#429a76':'#2c805e',{p:[.55+Math.sin(a)*1.15,5.14,.1+Math.cos(a)*1.15],s:[.4,.14,1.65],parent:g});
  leaf.rotation.set(.2,a,0);
 }
 for(let i=0;i<3;i++)orb('#9a7045',[.5+Math.cos(i*2)*.25,5,.1+Math.sin(i*2)*.25],[.22,.22,.22],g);
 for(let y=1;y<4.8;y+=.8)mesh('torus','#98764f',{p:[y*.1,y,.02],s:[.18,.18,.18],r:[Math.PI/2,0,0],parent:g});
 return g;
}
function temple(parent,x,z){
 const g=new T.Group();g.position.set(x,-1.45,z);parent.add(g);
 for(let j=0;j<4;j++)box(j%2?'#c9b285':'#d9c698',[0,j*.5,0],[4.4-j*.75,.52,4.4-j*.75],g);
 for(const side of [-1,1])box('#dacba4',[side*.8,3.15,0],[.55,2.7,.6],g);
 box('#9a9e75',[0,4.65,0],[3,.45,1.6],g);box('#ded2ac',[0,4.95,0],[2.45,.35,1.3],g);
 for(const side of [-1,1])for(const y of [2.5,3.3,4.1])box('#a18e68',[side*.8,y,.32],[.58,.12,.06],g);
 const gem=mesh('ico','#e79b54',{p:[0,3.4,0],s:[.45,.55,.45],parent:g});return g;
}

 const decor = [];
 function cactus(parent, x, z) {
  const g = new T.Group(); g.position.set(x, -1.3, z); parent.add(g);
  rod('#638965', [0,0,0], [0,4.7,0], { radius: .38, parent: g });
  for (const side of [-1,1]) {
   rod('#638965', [0,2.2,0], [side*1.25,2.2,0], { radius: .26, parent: g });
   rod('#638965', [side*1.25,2.2,0], [side*1.25,3.6,0], { radius: .26, parent: g });
  }
 }
 function skull(parent, x, z) {
  const g = new T.Group(); g.position.set(x, .7, z); parent.add(g);
  orb('#d9d6bd', [0,1,0], [2.5,2.1,1.7], g);
  for (const side of [-1,1]) orb('#354754', [side*.95,1.4,1.45], [.65,.7,.28], g);
  mesh('cone','#354754',{p:[0,.45,1.65],s:[.35,.55,.18],r:[0,0,Math.PI],parent:g});
  for (let i=0;i<5;i++) box('#d9d6bd', [(i-2)*.55,-.65,1], [.42,.7,.65], g);
  rod('#938f81',[-1.2,2.2,1.15],[-.5,1.8,1.55],{radius:.04,parent:g});
  rod('#938f81',[-.5,1.8,1.55],[-.7,1.35,1.6],{radius:.04,parent:g});
  for (const side of [-1,1]) rod('#d9d6bd', [-2,-1.8,side*.65], [2,-1.8,-side*.65], {radius:.19,parent:g});
 }
 function building(parent, x, z, i) {
  const g = new T.Group(); g.position.set(x,-1.4,z); parent.add(g);
  const height = 5 + i%4*1.5;
  box(i%2 ? '#bbae93' : '#b8a393', [0,height/2,0], [4,height,4], g);
  box('#e2ceb0', [0,height,0], [4.5,.4,4.5], g);
  box('#58645e',[0,1,2.04],[.85,1.9,.12],g);
  for(const x of [-1.9,1.9])box('#d8c5a4',[x,height/2,2.09],[.18,height,.17],g);
  for(let y=1;y<height;y+=1.5) for(const offset of [-1.2,0,1.2]) {
   const window = box('#ffd98e',[offset,y,2.02],[.6,.75,.06],g);
   window.material = window.material.clone(); window.material.emissive.set('#ffaf52'); window.material.emissiveIntensity = .3;
  }
  if(i%3===0) { mesh('cone','#596d70',{p:[0,height+1,0],s:[2,2,2],parent:g}); }
  rod('#455d61',[3,0,1],[3,6,1],{radius:.09,parent:g});
  orb('#ffdfa2',[3,6,1],[.35,.45,.35],g);
 }
 for(let i=0;i<11;i++) {
  const segment=new T.Group(); segment.position.z=-i*25+15; scene.add(segment);
  const themes = LEVELS.map(level=>{const g=new T.Group();g.name=level.id;segment.add(g);return g});
  for(let theme=0;theme<3;theme++) {
   const g=themes[theme]; palm(g,8+(i%3)*2,0,.82+(i%3)*.13);
   if(i%2===0) palm(g,-10-i%3,8,.85);
   mesh('ico','#b7c7a0',{p:[-16-i%4*4,-1.2,-4],s:[4+i%3,2.2+i%2,3.5],parent:g});
   orb('#7fb495',[18,-.5,6],[4.3,1.5,4],g);
   mesh('ico','#49836c',{p:[7,-.1,-8],s:[1.4,1.1,1.5],parent:g});
   if(theme===1) palm(g,-8,0,1.45);
   if(theme>0 && i%3===0) temple(g,-12,-5);
  }
  cactus(themes[3],8+i%3*2,0);
  mesh('ico','#c39761',{p:[-15,-.8,-4],s:[6,3+i%3,8],parent:themes[3]});
  orb('#e1bf84',[18,-1.4,6],[8,3,10],themes[3]);
  skull(themes[4],i%2 ? -10 : 11,-2);
  mesh('ico','#586771',{p:[-18,-.8,-7],s:[5,5+i%3,6],parent:themes[4]});
  rod('#665f53',[8,-1,4],[8,5,4],{radius:.18,parent:themes[4]});
  rod('#665f53',[8,3,4],[10,4,4],{radius:.12,parent:themes[4]});
  building(themes[5],9,0,i); building(themes[5],-11,-7,i+1);
  for(let theme=0;theme<5;theme++)props.addNature(themes[theme],LEVELS[theme].id,i);
  for(let theme=6;theme<LEVELS.length;theme++) cities.roadside(themes[theme],LEVELS[theme].id,i);
  for(let theme=5;theme<LEVELS.length;theme++)life.addCity(themes[theme],theme,i);
  segment.userData.themes=themes; decor.push(segment);
 }
 const skyline = new T.Group(); scene.add(skyline);
 const skylineThemes = LEVELS.map(level=>{const g=new T.Group();g.name=level.id;skyline.add(g);return g});
 const shanghai = skylineThemes[5];
 for(let i=0;i<8;i++) box('#7e9296',[-45+i*13,3+i%3*3,-170],[7,10+i%3*6,8],shanghai);
 rod('#9daaad',[4,-2,-160],[4,35,-160],{radius:.55,parent:shanghai});
 for(const y of [12,26]) orb('#b07883',[4,y,-160],[3.4,3.4,3.4],shanghai);
 for(const x of [-1,1])rod('#afbab7',[4+x*5,-1,-160],[4,13,-160],{radius:.7,parent:shanghai});
 for(const y of [12,26])mesh('torus','#d5b0ad',{p:[4,y,-160],s:[3.45,3.45,3.45],r:[Math.PI/2,0,0],parent:shanghai});
 for(let theme=6;theme<LEVELS.length;theme++) cities.skyline(skylineThemes[theme],LEVELS[theme].id);
 skyline.userData.themes = skylineThemes;
 return { decor, skyline, life };
}
