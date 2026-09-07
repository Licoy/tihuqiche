const $ = id => document.getElementById(id);
const T = THREE, V = (x=0,y=0,z=0) => new T.Vector3(x,y,z);
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(48,innerWidth/innerHeight,.1,340);
const renderer = new T.WebGLRenderer({canvas:$('scene'),antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=T.PCFSoftShadowMap;
scene.add(new T.HemisphereLight(0xfff7dc,0x508c87,2.3));
const sunLight=new T.DirectionalLight(0xffe6c2,3.0);
sunLight.position.set(-24,40,10);sunLight.castShadow=true;
Object.assign(sunLight.shadow.camera,{left:-17,right:17,top:28,bottom:-18,near:1,far:100});
sunLight.shadow.mapSize.set(1024,1024);sunLight.shadow.bias=-.0006;
sunLight.shadow.normalBias=.035;scene.add(sunLight);
const mats=new Map(), geos={box:new T.BoxGeometry(1,1,1),sphere:new T.SphereGeometry(1,16,10),ico:new T.IcosahedronGeometry(1,0),cylinder:new T.CylinderGeometry(1,1,1,9),cone:new T.ConeGeometry(1,1,7),torus:new T.TorusGeometry(1,.13,8,24)};
function material(color){if(!mats.has(color))mats.set(color,new T.MeshStandardMaterial({color,roughness:.82,flatShading:true}));return mats.get(color)}
function mesh(geometry,color,options={}){
 const obj=new T.Mesh(typeof geometry==='string'?geos[geometry]:geometry,material(color));
 if(options.p)obj.position.set(...options.p);if(options.s)obj.scale.set(...options.s);if(options.r)obj.rotation.set(...options.r);
 obj.castShadow=options.shadow!==false;obj.receiveShadow=true;(options.parent||scene).add(obj);return obj;
}
function box(color,p,s,parent=scene){return mesh('box',color,{p,s,parent})}
function orb(color,p,s,parent=scene){return mesh('sphere',color,{p,s,parent})}
function rod(color,a,b,options={}){
 const av=V(...a),bv=V(...b),d=bv.clone().sub(av),o=mesh('cylinder',color,{p:av.add(bv).multiplyScalar(.5).toArray(),s:[options.radius||.045,d.length(),options.radius||.045],parent:options.parent});
 o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return o;
}
function instances(color,items,geometry=geos.box){
 const o=new T.InstancedMesh(geometry,material(color),items.length),dummy=new T.Object3D();
 items.forEach((item,i)=>{dummy.position.set(...item.p);dummy.scale.set(...item.s);dummy.rotation.set(...(item.r||[0,0,0]));dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix)});
 o.receiveShadow=true;o.castShadow=false;scene.add(o);return o;
}
const road=box('#577674',[0,-.22,-120],[10.2,.4,300]);
const foundation=box('#d8c3a0',[0,-1,-120],[11.1,1.2,300]);
const sea=box('#60c5b6',[0,-2.15,-105],[650,.2,620]);sea.castShadow=false;
const sand=box('#e5d6ad',[31,-1.75,-130],[49.5,.6,320]);
const stripes=[],curbs=[],posts=[],waterLines=[];
for(let i=0;i<68;i++){
 for(const x of [-1.7,1.7])stripes.push({p:[x,.011,18-i*4],s:[.055,.022,1.5]});
 for(const x of [-5.27,5.27])curbs.push({p:[x,.02,18-i*4],s:[.26,.36,2]});
 if(i%3===0)for(const x of [-5.6,5.6])posts.push({p:[x,.44,18-i*4],s:[.16,1.05,.16]});
}
const laneMarks=instances('#f4efd0',stripes),curbMarks=instances('#e78665',curbs),railPosts=instances('#fff4d7',posts);
const curbsBase=instances('#fff1cf',[-5.27,5.27].map(x=>({p:[x,-.02,-120],s:[.27,.26,300]})));
for(const x of [-5.6,5.6])box('#eee4c8',[x,.86,-120],[.12,.12,300]);
for(let i=0;i<110;i++)waterLines.push({p:[(i*19.31%175)-95,-2.02,20-(i*9.81%280)],s:[1.3+(i%5),.01,.09]});
const seaLines=instances('#97e1cf',waterLines);
const sun=orb('#ffdd92',[-75,42,-205],[15,15,15]);sun.material=new T.MeshBasicMaterial({color:'#ffe4a3',fog:false});
const cloudGroup=new T.Group();scene.add(cloudGroup);
for(let i=0;i<8;i++){
 const g=new T.Group();g.position.set(-85+i*24,21+(i%3)*7,-140-(i%2)*45);cloudGroup.add(g);
 for(let j=0;j<3;j++)orb('#fff5df',[j*3,Math.sin(j*2)*1.2,0],[4.5,1.7+j%2,2],g).castShadow=false;
}
const decor=[];
function palm(parent,x,z,scale=1){
 const g=new T.Group();g.position.set(x,-1.2,z);g.scale.setScalar(scale);parent.add(g);
 orb('#e5d6ad',[0,-.65,0],[2.8,.75,2.6],g);
 const trunk=rod('#b28b5f',[0,0,0],[.55,5.3,.1],{radius:.18,parent:g});
 for(let j=0;j<6;j++){
  const a=j*Math.PI/3,leaf=mesh('sphere',j%2?'#429a76':'#2c805e',{p:[.55+Math.sin(a)*1.15,5.14,.1+Math.cos(a)*1.15],s:[.4,.14,1.65],parent:g});
  leaf.rotation.set(.2,a,0);
 }
 for(let i=0;i<3;i++)orb('#9a7045',[.5+Math.cos(i*2)*.25,5,.1+Math.sin(i*2)*.25],[.22,.22,.22],g);
 return g;
}
function temple(parent,x,z){
 const g=new T.Group();g.position.set(x,-1.45,z);parent.add(g);
 for(let j=0;j<4;j++)box(j%2?'#c9b285':'#d9c698',[0,j*.5,0],[4.4-j*.75,.52,4.4-j*.75],g);
 for(const side of [-1,1])box('#dacba4',[side*.8,3.15,0],[.55,2.7,.6],g);
 box('#9a9e75',[0,4.65,0],[3,.45,1.6],g);box('#ded2ac',[0,4.95,0],[2.45,.35,1.3],g);
 const gem=mesh('ico','#e79b54',{p:[0,3.4,0],s:[.45,.55,.45],parent:g});return g;
}
for(let i=0;i<11;i++){
 const g=new T.Group();g.position.z=-i*25+15;scene.add(g);
 palm(g,8+(i%3)*2,0,.82+(i%3)*.13);
 if(i%2===0)palm(g,-10-i%3,8,.85);
 const rock=mesh('ico','#b7c7a0',{p:[-16-i%4*4,-1.2,-4],s:[4+i%3,2.2+i%2,3.5],parent:g});
 orb('#7fb495',[18,-.5,6],[4.3,1.5,4],g);
 if(i%3===0){const t=temple(g,-12,-5);t.visible=false;g.userData.temple=t}
 const bush=mesh('ico','#49836c',{p:[7,-.1,-8],s:[1.4,1.1,1.5],parent:g});
 decor.push(g);
}
const islands=new T.Group();scene.add(islands);
for(let i=0;i<7;i++){
 mesh('ico','#8eb8a2',{p:[-58+i*20,-2,-170-(i%3)*24],s:[16,12+(i%3)*5,14],parent:islands,shadow:false});
}
const finish=new T.Group();scene.add(finish);finish.visible=false;
for(const x of [-4.8,4.8]){box('#faf0d1',[x,3.2,0],[.28,6.4,.35],finish);box('#ed7753',[x,3.4,0],[.32,.3,.38],finish)}
box('#fff1cd',[0,5.8,0],[9.9,.85,.25],finish);
for(let i=0;i<16;i++)box(i%2?'#1f594f':'#fff4d9',[-4.4+i*.59,5.5,0],[.59,.24,.28],finish);
const bannerCanvas=document.createElement('canvas');bannerCanvas.width=512;bannerCanvas.height=80;
const bannerCtx=bannerCanvas.getContext('2d');bannerCtx.fillStyle='#fff1cd';bannerCtx.fillRect(0,0,512,80);bannerCtx.fillStyle='#285d50';bannerCtx.font='bold 40px sans-serif';bannerCtx.textAlign='center';bannerCtx.fillText('FINISH  /  终点',256,55);
const banner=new T.Mesh(new T.PlaneGeometry(6.5,.65),new T.MeshBasicMaterial({map:new T.CanvasTexture(bannerCanvas),side:T.DoubleSide}));banner.position.set(0,5.9,.15);finish.add(banner);
const LEVELS=[
 {name:'珊瑚海岸',en:'CORAL COAST',tag:'海风刚好，冒险开始',length:600,speed:15,maxSpeed:20,gap:36,sky:'#bce6db',sea:'#60c5b6',road:'#577674'},
 {name:'雨林遗迹',en:'JUNGLE RUINS',tag:'穿过雨林，追上好奇心',length:850,speed:18,maxSpeed:24,gap:32,sky:'#a9c9b6',sea:'#509f8b',road:'#596a59'},
 {name:'落日神庙',en:'SUNSET TEMPLE',tag:'向着落日，再骑远一点',length:1100,speed:21,maxSpeed:28,gap:29,sky:'#f4c6a3',sea:'#87b8ae',road:'#8c7970'}
];
function setTheme(index){
 const l=LEVELS[index];scene.background=new T.Color(l.sky);scene.fog=new T.Fog(l.sky,55,200);
 sea.material=material(l.sea);road.material=material(l.road);
 sunLight.color.set(index===2?'#ffd1a0':'#ffedcd');sun.position.y=index===2?16:42;
 decor.forEach(g=>{if(g.userData.temple)g.userData.temple.visible=index>0});
}
function updateWorld(distance,time){
 laneMarks.position.z=distance%4;curbMarks.position.z=distance%4;railPosts.position.z=distance%12;
 seaLines.position.z=(distance*.3)%10;seaLines.position.y=Math.sin(time*.9)*.025;
 decor.forEach((g,i)=>g.position.z=((distance-i*25+275)%275)-248);
 cloudGroup.position.x=Math.sin(time*.03)*3;
}
