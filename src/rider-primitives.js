import * as T from 'three';
const V = (...values) => new T.Vector3(...values);

// Shared by the live world and CPU-side Three.js model tests.
export function createModelPrimitives(scene) {
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
return {mesh,box,orb,rod,material,geos,mats};
}
