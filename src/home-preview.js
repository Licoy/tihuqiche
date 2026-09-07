import * as T from 'three';
import { createRider } from './rider.js';

// Uses the game's renderer and RAF; only the UI destination is a 2D canvas.
export function createHomePreview(world) {
 const {renderer}=world,scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.1,100);
 const light=new T.DirectionalLight(0xffedcd,3);light.position.set(-24,40,10);
 scene.add(new T.HemisphereLight(0xfff7dc,0x508c87,2.3),light);
 const centre=new T.Vector3(0,1.8,0),direction=new T.Vector3(6,3,8).normalize();
 const viewport=new T.Vector4(),scissor=new T.Vector4(),clearColor=new T.Color();
 let canvas=null,context=null,model=null,configKey='',angle=-.3,radius=3,disposed=false;
 function attach(destination){
  if(disposed)throw new Error('Home preview has been disposed');
  const next=destination?.getContext('2d')??null;
  if(destination&&!next)throw new Error('Home preview requires a 2D canvas');
  canvas=destination;context=next;
 }
 function rotate(delta){
  if(!Number.isFinite(delta))throw new RangeError('Invalid preview rotation');
  angle=(angle+delta)%(Math.PI*2);
 }
 function applyConfig(config){
  const key=JSON.stringify(config);
  if(key===configKey)return;
  if(model)model.applyConfig(config);else model=createRider({...world,scene},config);
  configKey=key;
  // Fit the entire model through a full rotation, including the beak and vehicle.
  model.rider.rotation.set(0,0,0);model.rider.updateMatrixWorld(true);radius=0;
  const point=new T.Vector3();
  model.rider.traverseVisible(object=>{
   if(!object.isMesh)return;
   const positions=object.geometry.attributes.position;
   for(let i=0;i<positions.count;i++){
    point.fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld);
    radius=Math.max(radius,point.distanceTo(centre));
   }
  });
  radius*=1.08;
 }
 function render({active,config,auto,dt,time,transparent=false}){
  if(disposed||!active||!canvas||!context)return false;
  const bounds=canvas.getBoundingClientRect();
  if(bounds.width<=0||bounds.height<=0||!canvas.getClientRects().length)return false;
  applyConfig(config);if(auto)rotate(dt*.25);
  const scale=Math.min(globalThis.devicePixelRatio||1,1.5,
   renderer.domElement.width/bounds.width,renderer.domElement.height/bounds.height);
  const width=Math.max(1,Math.floor(bounds.width*scale)),height=Math.max(1,Math.floor(bounds.height*scale));
  if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  camera.aspect=width/height;
  const halfFov=Math.atan(Math.tan(T.MathUtils.degToRad(camera.fov/2))*Math.min(camera.aspect,1));
  camera.position.copy(direction).multiplyScalar(radius/Math.sin(halfFov)).add(centre);
  camera.lookAt(centre);camera.updateProjectionMatrix();
  model.animateRider({dt,time,moving:true,jumpY:0,duck:false,speed:4,boosting:false});
  model.rider.rotation.y=angle;
  copyFrame(width,height,transparent);
  return true;
 }
 function copyFrame(width,height,transparent){
  renderer.getViewport(viewport);renderer.getScissor(scissor);renderer.getClearColor(clearColor);
  const alpha=renderer.getClearAlpha(),scissorTest=renderer.getScissorTest(),target=renderer.getRenderTarget();
  const pixelRatio=renderer.getPixelRatio(),autoClear=renderer.autoClear;
  try{
   renderer.setRenderTarget(null);
   renderer.setViewport(0,0,width/pixelRatio,height/pixelRatio);
   renderer.setScissor(0,0,width/pixelRatio,height/pixelRatio);renderer.setScissorTest(true);
   renderer.setClearColor(world.scene.background,transparent?0:1);renderer.autoClear=true;
   renderer.render(scene,camera);
   context.clearRect(0,0,width,height);
   context.drawImage(renderer.domElement,0,renderer.domElement.height-height,width,height,0,0,width,height);
  }finally{
   renderer.setRenderTarget(target);renderer.setViewport(viewport);renderer.setScissor(scissor);
   renderer.setScissorTest(scissorTest);renderer.setClearColor(clearColor,alpha);renderer.autoClear=autoClear;
  }
 }
 function dispose(){
  if(disposed)return;
  disposed=true;model?.dispose();scene.clear();canvas=null;context=null;
 }
 return {attach,rotate,render,dispose};
}
