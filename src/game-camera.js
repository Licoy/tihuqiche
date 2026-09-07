import * as T from 'three';
export function createGameCamera(world, game, app) {
 const target=new T.Vector3(),desired=new T.Vector3(),look=new T.Vector3();
 function updateCamera(dt) {
  if(['paused','won','lost','ended'].includes(game.mode))return;
  const home=game.mode==='home',mobile=innerWidth<701,stacked=mobile&&innerHeight>500;
  const portraitPreview=home&&app.wardrobeOpen.value&&stacked&&innerHeight>innerWidth;
  if(portraitPreview){
   // The mobile wardrobe leaves the top 250 CSS pixels for the complete rider.
   // Scale camera distance with viewport height, then move the optical centre up.
   const scale=innerHeight/600;
   world.camera.position.set(8*scale,1.8+4*scale,10*scale);target.set(0,1.8,0);
   world.camera.lookAt(target);world.camera.fov=50;
   world.camera.setViewOffset(innerWidth,innerHeight,0,(innerHeight-250)/2,innerWidth,innerHeight);
   return;
  }
  if(world.camera.view?.enabled)world.camera.clearViewOffset();
  const active=game.players.filter(p=>p.status==='running');
  const players=active.length?active:game.players;
  const spread=game.gameMode==='duo'?Math.max(...players.map(p=>p.distance))-Math.min(...players.map(p=>p.distance)):0;
  const x=players.reduce((n,p)=>n+p.x,0)/players.length;
  if(home&&app.wardrobeOpen.value){
   desired.set(6.4,5.8,10);look.set(-1.1,1.8,0);
   world.camera.setViewOffset(innerWidth,innerHeight,innerWidth*.22,0,innerWidth,innerHeight);
  }
  else if(home){desired.set(stacked?8:7.5,5.8,stacked?10:8.6);look.set(stacked?0:-3.7,stacked?-.35:1.35,stacked?0:-.6)}
  else if(game.gameMode==='duo'){
   desired.set(x*.15,7.5+spread*.08,12.5+spread);look.set(x*.1,1,spread*.4-7);
  }else{desired.set(x*(mobile?.55:.22),mobile?7:6.5,mobile?14:11.8);look.set(x*(mobile?.45:.13),1,mobile?-10:-12)}
  world.camera.position.lerp(desired,1-Math.exp(-dt*4));target.lerp(look,1-Math.exp(-dt*4));world.camera.lookAt(target);
  world.camera.fov=T.MathUtils.damp(world.camera.fov,home?(stacked?50:45):(game.gameMode==='duo'?48:mobile?60:52),5,dt);world.camera.updateProjectionMatrix();
 }
 function markers(riders) {
  if(game.gameMode!=='duo'||game.mode==='home')return [];
  world.camera.updateMatrixWorld();
  return game.players.map(p=>{
   const position=new T.Vector3(riders[p.id].rider.position.x,4.8+p.jumpY,riders[p.id].rider.position.z).project(world.camera);
   return {id:p.id,x:(position.x+1)*innerWidth/2,y:(1-position.y)*innerHeight/2,
    visible:p.status==='running'&&position.z>-1&&position.z<1&&Math.abs(position.x)<1&&Math.abs(position.y)<1};
  });
 }
 return {updateCamera,markers};
}
