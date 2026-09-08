import * as T from 'three';

// Keep the persistent effect nodes and their owned materials together for one disposal path.
export function createRiderEffects(world,rider){
 const materials=[];
 function material(color,opacity){
  const value=new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending});
  materials.push(value);return value;
 }
 function mesh(geometry,mat,parent,scale){
  const obj=world.mesh(geometry,'#ffe4a3',{s:scale,parent,shadow:false});obj.material=mat;return obj;
 }
 const gold=material('#ffc642',.13),ringGold=material('#ffd35a',.8),sparkGold=material('#fff3b0',.95);
 ringGold.blending=T.NormalBlending;
 const shieldBubble=mesh('sphere',gold,rider,[1.23,2.04,1.9]);
 shieldBubble.position.set(0,1.94,0);shieldBubble.name='shield';shieldBubble.visible=false;
 const rings=[];
 for(let i=0;i<3;i++){
  const ring=mesh('torus',ringGold,shieldBubble,[.95,.95,.24]);ring.name='shield-ring:'+i;
  ring.rotation.set(Math.PI/2+(i-1)*.52,i*.65,0);rings.push(ring);
 }
 const stars=Array.from({length:8},(_,i)=>{
  const star=mesh('ico',sparkGold,shieldBubble,[.04,.04,.04]);star.name='shield-spark:'+i;return star;
 });
 const fire=new T.Group();fire.name='boost-flame';fire.visible=false;
 const orange=material('#ff641f',.85),yellow=material('#ffdb45',.95),white=material('#fff4b8',.95),glow=material('#ff7b24',.18);
 orange.blending=T.NormalBlending;yellow.blending=T.NormalBlending;white.blending=T.NormalBlending;
 const halo=mesh('sphere',glow,fire,[.35,.3,.72]);halo.position.z=.43;
 const layers=[['flame-outer',orange,.28,1.22],['flame-core',yellow,.18,.91],['flame-hotspot',white,.1,.48]].map(([name,mat,width,length],i)=>{
  const cone=mesh('cone',mat,fire,[width,length,width]);cone.name=name;cone.rotation.x=Math.PI/2;
  cone.position.z=length/2;cone.renderOrder=i+1;return {cone,width,length};
 });
 const embers=Array.from({length:6},(_,i)=>{
  const ember=mesh('ico',i%2?yellow:orange,fire,[.035,.035,.12]);ember.name='flame-ember:'+i;return ember;
 });
 function attach(bike,exhaust={x:0,y:.72,z:1.32,scale:1},vehicle){
  bike.add(fire);fire.position.set(exhaust.x,exhaust.y,exhaust.z);fire.scale.setScalar(exhaust.scale);
  shieldBubble.scale.x=vehicle==='plane'?1.72:1.23;
 }
 function animate({time,moving,boosting}){
  if(shieldBubble.visible){
   gold.opacity=.12+Math.sin(time*5)*.035;ringGold.opacity=.7+Math.sin(time*8)*.2;
   rings.forEach((ring,i)=>{ring.rotation.z=time*(.65+i*.22);ring.rotation.y=i*.65+time*(i%2?-.5:.5)});
   stars.forEach((star,i)=>{
    const angle=time*(i%2?1.2:-1)+i*Math.PI/4,height=Math.sin(angle*.8+i)*.76;
    const radius=Math.sqrt(1-height*height);
    star.position.set(Math.cos(angle)*radius,height,Math.sin(angle)*radius);
    star.scale.setScalar(.025+.03*(.5+.5*Math.sin(time*10+i*2)));
   });
  }
  fire.visible=Boolean(moving&&boosting);
  if(!fire.visible)return;
  layers.forEach(({cone,width,length},i)=>{
   const flicker=1+Math.sin(time*35+i*2)*.16+Math.sin(time*53+i)*.08;
   cone.scale.set(width*(1.1-.13*flicker),length*flicker,width);cone.position.z=length*flicker/2;
   cone.rotation.z=Math.sin(time*19+i)*.09;
  });
  embers.forEach((ember,i)=>{
   const travel=(time*2.8+i/embers.length)%1,spread=.05+travel*.3;
   ember.position.set(Math.sin(i*2.4)*spread,Math.cos(i*2.4)*spread,.45+travel*1.12);
   ember.scale.set(.045*(1-travel),.045*(1-travel),.14*(1-travel));
  });
 }
 return {shieldBubble,attach,animate,dispose:()=>{fire.removeFromParent();materials.forEach(value=>value.dispose())}};
}
