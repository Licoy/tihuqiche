const rider=new T.Group();scene.add(rider);
const bike=new T.Group();rider.add(bike);
const wheels=[];
for(const z of [-1.03,1.03]){
 const wheel=new T.Group();wheel.position.set(0,.57,z);bike.add(wheel);
 mesh('torus','#263f40',{s:[.52,.52,.52],r:[0,Math.PI/2,0],parent:wheel});
 mesh('torus','#ede6d0',{s:[.445,.445,.445],r:[0,Math.PI/2,0],parent:wheel});
 for(let i=0;i<8;i++){const a=i*Math.PI/4;rod('#93adaa',[0,0,0],[0,Math.sin(a)*.44,Math.cos(a)*.44],{radius:.012,parent:wheel})}
 rod('#d6c8a6',[-.1,0,0],[.1,0,0],{radius:.07,parent:wheel});wheels.push(wheel);
}
const framePoints=[[0,.57,1.03],[0,1.42,.43],[0,.62,.03],[0,.57,1.03],[0,1.42,.43],[0,1.39,-.67],[0,.62,.03],[0,1.39,-.67],[0,.57,-1.03]];
for(let i=0;i<framePoints.length-1;i++)rod('#e96648',framePoints[i],framePoints[i+1],{radius:.06,parent:bike});
rod('#f9a074',[.015,1.46,.37],[.015,1.43,-.64],{radius:.022,parent:bike});
rod('#254c48',[0,1.33,.43],[0,1.68,.46],{radius:.048,parent:bike});
orb('#243f3d',[0,1.68,.47],[.31,.09,.3],bike);
rod('#afc8be',[0,1.39,-.67],[0,1.95,-.88],{radius:.046,parent:bike});
rod('#284e48',[-.49,1.98,-.91],[.49,1.98,-.91],{radius:.055,parent:bike});
for(const x of [-.49,.49])orb('#f2c18b',[x,1.98,-.91],[.13,.08,.1],bike);
const crank=new T.Group();crank.position.set(0,.68,.05);bike.add(crank);
mesh('torus','#ccd3bf',{p:[.1,0,0],s:[.19,.19,.19],r:[0,Math.PI/2,0],parent:crank});
const feet=[];
for(const side of [-1,1]){
 const foot=box('#e7a343',[side*.3,.71,.05],[.26,.1,.33],bike);feet.push(foot);
}
box('#f5cc85',[0,1.18,1.16],[.53,.37,.45],bike);
for(const x of [-.19,0,.19])box('#cc9460',[x,1.18,1.397],[.022,.35,.018],bike);
const bird=new T.Group();bird.position.set(0,1.83,.25);rider.add(bird);
orb('#fff9e8',[0,.13,.04],[.61,.65,.83],bird);
orb('#e3e9dc',[0,-.1,.23],[.59,.43,.67],bird);
for(let i=0;i<3;i++){const feather=orb(i%2?'#d8e1d5':'#fff9e8',[(i-1)*.2,.12,.77],[.16,.16,.44],bird);feather.rotation.x=-.15}
const neck=orb('#fff9e8',[0,.65,-.3],[.31,.64,.32],bird);neck.rotation.x=-.29;
const head=new T.Group();head.position.set(0,1.22,-.44);head.rotation.y=-.22;bird.add(head);
orb('#fffdf0',[0,0,0],[.39,.4,.43],head);
const beak=mesh('cone','#f6bb52',{p:[0,-.02,-1.02],s:[.31,1.52,.13],r:[-Math.PI/2,0,0],parent:head});
orb('#eea443',[0,-.27,-.78],[.28,.33,.68],head);
const billTop=orb('#ffd06f',[0,-.01,-.87],[.29,.075,.73],head);
for(const side of [-1,1]){
 orb('#faefd1',[side*.332,.045,-.2],[.1,.14,.13],head);
 orb('#233e3d',[side*.398,.06,-.232],[.041,.073,.063],head);
 orb('#ffffff',[side*.421,.084,-.26],[.016,.022,.018],head);
}
const helmet=orb('#e9764e',[0,.28,.015],[.407,.226,.407],head);
box('#ffdab1',[0,.474,0],[.085,.012,.38],head);
for(const side of [-1,1])rod('#ba5a3c',[side*.34,.1,-.06],[side*.25,-.25,.08],{radius:.019,parent:head});
const scarf=mesh('torus','#338878',{p:[0,.66,-.29],s:[.31,.31,.31],r:[Math.PI/2,0,0],parent:bird});
const scarfTail=new T.Group();scarfTail.position.set(.2,.68,.01);bird.add(scarfTail);
box('#389985',[0,0,.41],[.26,.075,.91],scarfTail);box('#6cbaa3',[0,.001,.77],[.27,.08,.08],scarfTail);
const wings=[];
for(const side of [-1,1]){
 const wing=orb('#eaf0e4',[side*.47,.17,-.33],[.2,.27,.68],bird);wing.rotation.x=-.35;wing.rotation.z=side*.2;wings.push(wing);
 for(let i=0;i<3;i++){const feather=orb('#dce7db',[side*(.42+i*.056),-.09,-.74-i*.04],[.085,.075,.32],bird);feather.rotation.x=-.32}
}
const legs=[];
for(const side of [-1,1]){
 const upper=rod('#eca84e',[side*.31,1.67,.25],[side*.32,1.17,-.15],{radius:.055,parent:rider});
 const lower=rod('#eca84e',[side*.32,1.17,-.15],[side*.3,.7,0],{radius:.05,parent:rider});legs.push({upper,lower});
}
const shieldBubble=orb('#80e0c5',[0,2,0],[1.05,2,1.8],rider);
shieldBubble.material=new T.MeshStandardMaterial({color:'#71e2c3',transparent:true,opacity:.15,roughness:.15,wireframe:true});shieldBubble.visible=false;shieldBubble.castShadow=false;
function alignRod(obj,a,b,r){const av=V(...a),bv=V(...b),d=bv.clone().sub(av);obj.position.copy(av.add(bv).multiplyScalar(.5));obj.scale.set(r,d.length(),r);obj.quaternion.setFromUnitVectors(V(0,1,0),d.normalize())}
let pedalAngle=0;
function animateRider(dt,time,moving,jumpY,duck){
 if(moving)pedalAngle+=dt*10;
 wheels.forEach(w=>w.rotation.x=-pedalAngle);
 feet.forEach((f,i)=>{
  const a=pedalAngle+i*Math.PI,s=i===0?-1:1,y=.76+Math.sin(a)*.23,z=.05+Math.cos(a)*.23;f.position.set(s*.3,y,z);
  const knee=[s*.33,1.22+Math.sin(a)*.09,-.22+Math.cos(a)*.1];
  alignRod(legs[i].upper,[s*.31,1.73,.25],knee,.055);alignRod(legs[i].lower,knee,[s*.3,y,z],.048);
 });
 bird.scale.y=T.MathUtils.damp(bird.scale.y,duck?.42:1,18,dt);
 bird.position.y=1.83+(moving?Math.sin(pedalAngle*2)*.025:0);
 head.rotation.y=-.22+Math.sin(time*1.2)*.09;
 scarfTail.rotation.set(Math.sin(time*9)*.13,-.2+Math.sin(time*6)*.2,0);
 rider.position.y=jumpY;bike.rotation.x=jumpY>0?Math.sin(jumpY)*.06:0;
}
