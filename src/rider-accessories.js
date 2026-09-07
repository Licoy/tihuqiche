import * as T from 'three';
import { riderColor } from './appearance.js';
export const SKIN_COLORS=Object.freeze({
 cream:['#fff9e8','#e3e9dc','#d8e1d5','#fffdf0','#eaf0e4','#dce7db'],
 silver:['#d9e0e5','#adbcc7','#99aab9','#edf1f5','#c2ced8','#aabcc9'],
 brown:['#d9b99a','#b8977b','#a8876a','#efdbc5','#cfaf91','#bda184'],
 pink:['#f4d2d7','#dbafb9','#c798a6','#ffe8e9','#ebc3cf','#d8abba'],
});
export function addAccessories(world,bird,head,config) {
 const {orb,box,rod,mesh}=world;
 const group=(parent,name)=>{const g=new T.Group();g.name=name;parent.add(g);return g};
 const hat=group(head,'hat:'+config.hat),hc=riderColor(config.hatColor);
 if(config.hat!=='none'){
  orb(hc,[0,.28,.015],[.407,.226,.407],hat);
  if(config.hat==='helmet'){
   box('#ffdab1',[0,.474,0],[.085,.012,.38],hat);
   for(const side of [-1,1])rod(hc,[side*.34,.1,-.06],[side*.25,-.25,.08],{radius:.019,parent:hat});
  }else box(hc,[0,.29,-.43],[.62,.05,.44],hat);
 }
 const scarf=group(bird,'scarf:'+config.scarf),sc=riderColor(config.scarfColor);
 const scarfTail=group(scarf,'scarf-tail');scarfTail.position.set(.2,.68,.01);
 if(config.scarf!=='none'){
  mesh('torus',sc,{p:[0,.66,-.29],s:[.31,.31,.31],r:[Math.PI/2,0,0],parent:scarf});
  const length=config.scarf==='long'?.91:.38;
  box(sc,[0,0,length/2],[.26,.075,length],scarfTail);
  box('#F3E6CA',[0,.001,length-.06],[.27,.08,.08],scarfTail);
 }
 const glasses=group(head,'glasses:'+config.glasses),gc=riderColor(config.glassesColor);
 if(config.glasses!=='none')for(const side of [-1,1]){
  const lens=group(glasses,'lens');lens.position.set(side*.435,.065,-.23);lens.rotation.y=side*Math.PI/2;
  mesh('torus',gc,{s:[.16,.18,.12],parent:lens});
  if(config.glasses==='sunglasses')orb('#233e3d',[0,0,.016],[.145,.165,.025],lens);
  rod(gc,[side*.43,.12,-.2],[side*.36,.13,.18],{radius:.025,parent:glasses});
 }
 if(config.glasses!=='none')rod(gc,[-.43,.17,-.32],[.43,.17,-.32],{radius:.02,parent:glasses});
 const clothes=group(bird,'clothes:'+config.clothes),cc=riderColor(config.clothesColor);
 if(config.clothes!=='none'){
  orb(cc,[0,-.03,.08],[.62,.48,.82],clothes);
  box('#f3e6ca',[0,.09,-.737],[.03,.52,.025],clothes);
  if(config.clothes==='jersey')for(const side of [-1,1]){
   const sleeve=orb(cc,[side*.47,.19,-.29],[.22,.285,.34],clothes);sleeve.rotation.x=-.35;
  }
 }
 if(config.identity==='mm')for(const side of [-1,1]){
  const blush=orb('#e4a0a0',[side*.366,-.15,-.24],[.035,.07,.085],head);blush.name='identity:mm';
  rod('#233e3d',[side*.4,.17,-.23],[side*.46,.23,-.24],{radius:.013,parent:head});
 }
 return scarfTail;
}
