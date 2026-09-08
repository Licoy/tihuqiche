// Geometry belongs to the world pool; course teardown only detaches these nodes.
export function addEntityDetails(world,group,type){
 switch(type){
  case 'fish':return fishDetails(world,group);
  case 'shield':return shieldDetails(world,group);
  case 'item':return itemDetails(world,group);
  case 'hurdle':return hurdleDetails(world,group);
  case 'gate':return gateDetails(world,group);
  case 'crate':return crateDetails(world,group);
  default:throw new RangeError(`Unknown course model: ${type}`);
 }
}

function fishDetails({mesh,orb,rod},group){
 group.children[0].name='fish-body';group.children[1].name='fish-tail';group.children[2].name='fish-eye:front';
 mesh('cone','#df952c',{p:[.035,.205,0],s:[.115,.17,.035],r:[0,0,-.4],parent:group}).name='fish-dorsal-fin';
 mesh('cone','#e8a434',{p:[.07,-.18,0],s:[.085,.10,.03],r:[0,0,Math.PI+.4],parent:group});
 orb('#5a5434',[-.16,.045,-.122],[.031,.036,.021],group).name='fish-eye:back';
 for(const side of [-1,1])rod('#d08a2b',[-.075,.095,side*.125],[-.035,-.075,side*.125],{radius:.012,parent:group});
 rod('#ffe7a1',[.035,.105,.1],[.19,.08,.08],{radius:.014,parent:group});
}

function shieldDetails({material,rod,orb},group){
 const [ring,crest]=group.children;
 ring.name='shield-medallion';ring.material=material('#d7a13b');
 crest.name='shield-crest';crest.material=material('#f1c45a');crest.scale.set(.29,.36,.09);
 for(const side of [-1,1]){
  rod('#fff3c2',[-.13,.11,side*.14],[0,-.13,side*.14],{radius:.028,parent:group});
  rod('#fff3c2',[0,-.13,side*.14],[.13,.11,side*.14],{radius:.028,parent:group});
 }
 orb('#fff2b1',[0,.465,0],[.055,.055,.055],group).name='shield-crown';
}

function itemDetails({box,rod,orb},group){
 group.children[0].name='item-box';
 box('#245b5c',[0,1.35,.415],[.59,.59,.024],group).name='item-question-panel';
 const path=[[-.11,1.48],[-.05,1.55],[.09,1.53],[.12,1.44],[0,1.35],[0,1.29]];
 for(let i=0;i<path.length-1;i++)rod('#fff0ba',[...path[i],.443],[...path[i+1],.443],{radius:.027,parent:group}).name='item-question-stroke';
 orb('#fff0ba',[0,1.19,.444],[.034,.034,.02],group).name='item-question-dot';
 for(const x of [-.34,.34])for(const y of [1.01,1.69])box('#b8d5ce',[x,y,.416],[.115,.115,.045],group);
}

function hurdleDetails({box,orb},group){
 group.children[2].name='hurdle-crossbar';
 for(const stripe of group.children.slice(3,6))stripe.rotation.z=-.3;
 for(const x of [-.98,.98]){
  box('#536d60',[x,.075,0],[.42,.15,.68],group).name='hurdle-foot';
  box('#6f6e4f',[x,.53,0],[.21,.43,.28],group);
  for(const y of [.72,.94])orb('#5c6552',[x,y,.175],[.036,.036,.015],group);
 }
 box('#f6d597',[0,1.079,0],[2.37,.043,.29],group);
}

function gateDetails({box,rod,orb},group){
 group.children[2].name='gate-crossbar';
 for(const side of [-1,1]){
  const x=side*1.18;
  box('#355f5e',[x,.065,0],[.39,.13,.59],group).name='gate-foot';
  box('#c3d1bc',[x,.44,0],[.225,.66,.26],group);
  rod('#86aba0',[x,2.60,-.06],[side*.70,2.96,-.06],{radius:.035,parent:group});
  orb('#e1deba',[x,3.03,.206],[.045,.045,.022],group);
 }
 for(const x of [-.60,-.20,.20,.60]){
  const stripe=box('#e9d69b',[x,3.03,.194],[.15,.42,.026],group);stripe.rotation.z=-.3;
 }
}

function crateDetails({box,orb},group){
 group.children[0].name='crate-body';
 for(let i=0;i<4;i++)box(i%2?'#d3a76c':'#c69a60',[-.80+i*.53,2.805,0],[.49,.045,1.58],group).name='crate-top-plank';
 for(const side of [-1,1]){
  for(const y of [.48,1.4,2.32])box('#c99b65',[side*1.113,y,0],[.035,.85,1.56],group).name='crate-side-plank';
  for(const z of [-.77,.77])box('#766d56',[side*1.13,1.4,z],[.045,2.74,.085],group).name='crate-corner';
  for(const y of [.17,2.64])orb('#72684f',[side*.97,y,.976],[.042,.042,.020],group).name='crate-rivet';
 }
}
