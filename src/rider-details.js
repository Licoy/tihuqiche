import * as T from 'three';

export function addBirdDetails(world,{bird,head,palette}){
 const {orb,rod,mesh}=world,eyes=[];
 for(const side of [-1,1]){
  const eye=new T.Group();eye.name=`eye:${side}`;eye.position.set(side*.36,.065,-.235);head.add(eye);eyes.push(eye);
  orb(palette[2],[0,0,0],[.075,.145,.15],eye);
  orb('#fffdf0',[side*.04,0,-.012],[.043,.116,.12],eye);
  orb('#335b53',[side*.075,-.012,-.038],[.025,.083,.071],eye);
  orb('#183c38',[side*.089,-.012,-.049],[.016,.065,.047],eye);
  orb('#ffffff',[side*.101,.02,-.063],[.01,.024,.019],eye);
  rod(palette[2],[side*.416,.211,-.34],[side*.428,.216,-.17],{radius:.028,parent:head}).name=`brow:${side}`;
  orb('#b67b37',[side*.239,.024,-.72],[.023,.016,.052],head).name=`nostril:${side}`;
  rod('#c7893c',[side*.239,-.115,-.52],[side*.15,-.115,-1.28],{radius:.012,parent:head}).name=`bill-seam:${side}`;
  const wing=new T.Group();wing.name=`wing:${side}`;bird.add(wing);
  const cover=mesh('ico',palette[4],{p:[side*.50,.19,-.25],s:[.20,.27,.61],r:[-.31,0,side*.14],parent:wing});cover.name='wing-cover';
  for(let i=0;i<4;i++){
   const feather=orb(i%2?palette[4]:palette[5],[side*(.44+i*.058),-.035-i*.018,-.66+i*.025],[.086,.076,.36],wing);
   feather.rotation.set(-.30,side*(.04+i*.025),side*.06);feather.name=`flight-feather:${i}`;
  }
  const shoulder=orb(palette[0],[side*.49,.28,.04],[.175,.20,.29],wing);shoulder.rotation.x=-.30;
 }
 mesh('cone','#de9b39',{p:[0,-.06,-1.715],s:[.03,.10,.038],r:[0,0,Math.PI],parent:head}).name='bill-hook';
 for(let i=-2;i<=2;i++){
  const feather=orb(i%2?palette[2]:palette[0],[i*.105,.055,.82+Math.abs(i)*.02],[.095,.105,.46],bird);
  feather.rotation.set(-.15,i*.16,0);feather.name=`tail-feather:${i+2}`;
 }
 return time=>{
  const phase=time%4.8,blink=phase>4.56?Math.max(.07,Math.abs(phase-4.68)/.12):1;
  eyes.forEach(eye=>eye.scale.y=blink);
 };
}

export function addFootDetails(world,foot){
 for(const x of [-.3,0,.3]){
  world.box('#f5c576',[x,.51,-.12],[.04,.025,.63],foot);
  world.mesh('cone','#d08a38',{p:[x,.13,-.59],s:[.10,.22,.13],r:[-Math.PI/2,0,0],parent:foot});
 }
}
