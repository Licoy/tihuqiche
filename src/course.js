import * as T from 'three';
import { faArrowUp, faArrowDown, faArrowsLeftRight, faQuestion } from '@fortawesome/free-solid-svg-icons';
import { V } from './world.js';
import { LEVELS } from './levels.js';
import { campaignLayout, createEndlessLayout } from './course-layout.js';
import { addEntityDetails } from './course-models.js';

export function createCourse(world, state) {
const {scene,mesh,orb,box,finish}=world;
let entities=[],nextId=0,stream=null,assistMarkers=true;
const obstacleRoot=new T.Group();scene.add(obstacleRoot);
const markerTextures=new Map();
function marker(glyph,color){
 const key=glyph.iconName+color;
 if(!markerTextures.has(key)){
  const c=document.createElement('canvas');c.width=128;c.height=128;const ctx=c.getContext('2d');
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(64,64,51,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff8e5';ctx.lineWidth=5;ctx.stroke();
  const [width,height,,,path]=glyph.icon,scale=64/Math.max(width,height);
  ctx.save();ctx.translate((128-width*scale)/2,(128-height*scale)/2);ctx.scale(scale,scale);
  ctx.fillStyle='#fff8e5';ctx.fill(new Path2D(path));ctx.restore();
  markerTextures.set(key,new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:true}));
 }
 const s=new T.Sprite(markerTextures.get(key));s.name=`course-marker:${glyph.iconName}`;s.scale.set(.85,.85,1);
 s.userData.courseMarker=true;s.userData.assistMarker=glyph!==faQuestion;s.visible=!s.userData.assistMarker||assistMarkers;return s;
}
function setAssistMarkers(enabled){
 if(typeof enabled!=='boolean')throw new TypeError('Assist markers must be boolean');
 if(assistMarkers===enabled)return;
 assistMarkers=enabled;
 for(const entity of entities)for(const child of entity.mesh.children)if(child.userData.assistMarker)child.visible=enabled;
}
function makeEntity(type,lane,at,height=1.35){
 const g=new T.Group();g.position.set((lane-1)*3.4,0,-at);obstacleRoot.add(g);
 if(type==='fish'){
  orb('#ffc447',[0,0,0],[.32,.2,.13],g);
  mesh('cone','#f3ac2b',{p:[.38,0,0],s:[.21,.3,.08],r:[0,0,Math.PI/2],parent:g});
  orb('#5a5434',[-.16,.045,.115],[.029,.034,.021],g);
  g.position.y=height;
 }else if(type==='shield'){
  mesh('torus','#73f0cf',{s:[.46,.46,.46],parent:g});mesh('ico','#b5ffe6',{s:[.23,.29,.14],parent:g});g.position.y=1.7;
 }else if(type==='item'){
  box('#4B83A6',[0,1.35,0],[.8,.8,.8],g);
  const m=marker(faQuestion, '#338878');m.position.y=2.1;g.add(m);
 }else if(type==='hurdle'){
  for(const x of [-.98,.98])box('#a57c53',[x,.62,0],[.17,1.2,.25],g);
  box('#eb8960',[0,.83,0],[2.35,.46,.27],g);
  for(const x of [-.8,0,.8])box('#ffefc4',[x,.83,.145],[.27,.45,.035],g);
  const m=marker(faArrowUp,'#d77848');m.position.y=1.7;g.add(m);
 }else if(type==='gate'){
  for(const x of [-1.18,1.18])box('#427c7b',[x,1.6,0],[.16,3.2,.23],g);
  box('#348f90',[0,3.03,0],[2.62,.5,.36],g);
  for(const x of [-.94,.94])box('#d1f0d8',[x,3.03,.195],[.15,.48,.03],g);
  const m=marker(faArrowDown,'#337978');m.position.y=3.78;g.add(m);
 }else{
  box('#bf8c5c',[0,1.4,0],[2.2,2.8,1.65],g);
  for(const y of [.17,1.4,2.64])box('#dfb57e',[0,y,.85],[2.23,.16,.1],g);
  for(const x of [-.97,.97])box('#e9c28b',[x,1.4,.88],[.15,2.75,.13],g);
  const diagonal=box('#d9ab70',[0,1.4,.9],[.15,3.1,.12],g);diagonal.rotation.z=.61;
  const m=marker(faArrowsLeftRight,'#8a6b4a');m.position.y=3.48;g.add(m);
 }
 addEntityDetails(world,g,type);
 const e={id:nextId++,type,lane,at,height,mesh:g,resolved:false,resolvedBy:[]};entities.push(e);return e;
}
function addEntry(entry){const e=makeEntity(entry.type,entry.lane,entry.at,entry.height);if(entry.item)e.item=entry.item}
function generateCourse(index){
 clearCourse();
 if(state.gameMode==='endless'){
  stream=createEndlessLayout(state.seed);
  for(let n=0;n<7;n++)addEntry({type:'fish',lane:1,at:18+n*4});
  streamCourse();finish.visible=false;
 }else{
  campaignLayout(index,state.gameMode==='items',state.seed).forEach(addEntry);
  finish.visible=true;finish.position.z=-LEVELS[index].length;
 }
}
function streamCourse(){
 if(!stream)return;
 stream.through(state.distance+240).forEach(addEntry);
 const active=state.players.filter(p=>p.status==='running');
 const behind=Math.min(...(active.length?active:state.players).map(p=>p.distance))-20;
 entities=entities.filter(e=>{if(e.at>=behind)return true;obstacleRoot.remove(e.mesh);return false});
}
const markerPosition=new T.Vector3();
function updateEntities(time){
 world.camera.updateMatrixWorld();
 for(const e of entities){
  e.mesh.position.z=state.distance-e.at;
  e.mesh.visible=!e.resolved&&e.mesh.position.z>-240&&e.mesh.position.z<45;
  if(e.mesh.visible)for(const child of e.mesh.children)if(child.visible&&child.userData.courseMarker){
   child.getWorldPosition(markerPosition).applyMatrix4(world.camera.matrixWorldInverse);
   const size=Math.max(.85,-markerPosition.z*2*Math.tan(world.camera.fov*Math.PI/360)*32/innerHeight);
   child.scale.set(size,size,1);
  }
  if(e.type==='fish'||e.type==='shield'){
   e.mesh.rotation.y=time*2;e.mesh.position.y=e.height+Math.sin(time*3+e.at)*.12;
  }
 }
 finish.position.z=state.distance-LEVELS[state.level].length;
 finish.visible=state.gameMode!=='endless'&&finish.position.z>-170&&finish.position.z<45;
}
const particles=[];
function burst(position,color,count=10){
 for(let i=0;i<count;i++){
  const m=mesh('ico',color,{p:position.toArray(),s:[.06,.06,.06],shadow:false});
  particles.push({mesh:m,velocity:V((Math.random()-.5)*4,2+Math.random()*3,(Math.random()-.5)*4),life:.65});
 }
}
function updateParticles(dt){
 for(let i=particles.length-1;i>=0;i--){
  const p=particles[i];p.life-=dt;p.velocity.y-=8*dt;p.mesh.position.addScaledVector(p.velocity,dt);
  p.mesh.scale.setScalar(Math.max(0,p.life)*.14);
  if(p.life<=0){scene.remove(p.mesh);particles.splice(i,1)}
 }
}
function clearParticles(){particles.forEach(p=>scene.remove(p.mesh));particles.length=0}
function clearCourse(){obstacleRoot.clear();entities=[];nextId=0;stream=null}
function dispose(){clearCourse();clearParticles();markerTextures.forEach(m=>{m.map.dispose();m.dispose()});markerTextures.clear()}
return {get entities(){return entities},generateCourse,streamCourse,updateEntities,setAssistMarkers,burst,updateParticles,clearParticles,clearCourse,dispose};
}
