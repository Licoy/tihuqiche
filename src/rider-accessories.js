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
   mesh('torus','#345b53',{p:[0,.245,.015],s:[.388,.388,.085],r:[Math.PI/2,0,0],parent:hat}).name='helmet-rim';
   box('#ffdab1',[0,.507,.015],[.09,.013,.27],hat);
   for(const side of [-1,1]){
    box('#345b53',[side*.18,.468,.015],[.057,.016,.19],hat).rotation.z=-side*.33;
    rod('#345b53',[side*.35,.12,-.06],[side*.26,-.25,.08],{radius:.022,parent:hat});
    box('#f3e6ca',[side*.275,-.20,.06],[.055,.055,.04],hat);
   }
   box('#fff1c7',[0,.32,.396],[.19,.075,.027],hat).name='helmet-reflector';
  }else{
   orb(hc,[0,.285,-.43],[.355,.037,.31],hat).name='cap-visor';
   orb('#d6b48a',[0,.255,-.465],[.32,.012,.265],hat);
   orb(hc,[0,.507,.015],[.055,.033,.055],hat);
   box('#fff2d3',[0,.37,-.366],[.16,.09,.019],hat).name='cap-patch';
  }
 }
 const scarf=group(bird,'scarf:'+config.scarf),sc=riderColor(config.scarfColor);
 const scarfTail=group(scarf,'scarf-tail');scarfTail.position.set(.2,.68,.01);
 if(config.scarf!=='none'){
  mesh('torus',sc,{p:[0,.66,-.29],s:[.31,.31,.31],r:[Math.PI/2,0,0],parent:scarf});
  const length=config.scarf==='long'?.91:.38;
  orb(sc,[.18,.66,-.45],[.1,.105,.11],scarf);
  for(const side of [-1,1]){
   const tailLength=length-(side===1?.1:0);
   box(sc,[side*.063,0,tailLength/2],[.116,.06,tailLength],scarfTail);
   box('#F3E6CA',[side*.063,.001,tailLength-.05],[.12,.067,.065],scarfTail);
  }
 }
 const glasses=group(head,'glasses:'+config.glasses),gc=riderColor(config.glassesColor);
 if(config.glasses!=='none')for(const side of [-1,1]){
  const lens=group(glasses,'lens');lens.position.set(side*.48,.065,-.23);lens.rotation.y=side*Math.PI/2;
  mesh('torus',gc,{s:[.16,.18,.12],parent:lens});
  if(config.glasses==='sunglasses')orb('#233e3d',[0,0,.016],[.145,.165,.025],lens);
  rod(gc,[side*.48,.12,-.2],[side*.36,.13,.18],{radius:.025,parent:glasses});
 }
 if(config.glasses!=='none')rod(gc,[-.48,.17,-.32],[.48,.17,-.32],{radius:.02,parent:glasses});
 const clothes=group(bird,'clothes:'+config.clothes),cc=riderColor(config.clothesColor);
 if(config.clothes!=='none'){
  orb(cc,[0,-.03,.08],[.62,.48,.82],clothes);
  box('#f3e6ca',[0,.09,-.737],[.03,.52,.025],clothes);
  if(config.clothes==='jersey')for(const side of [-1,1]){
   const sleeve=orb(cc,[side*.47,.19,-.29],[.22,.285,.34],clothes);sleeve.rotation.x=-.35;
  }
  const number=group(clothes,'riding-number');number.position.set(0,.10,.902);
  box('#fff2d3',[0,0,0],[.27,.26,.02],number);
  box('#345b53',[0,.075,.015],[.12,.033,.012],number);
  const stroke=box('#345b53',[.008,-.012,.016],[.032,.16,.012],number);stroke.rotation.z=-.3;
  for(const side of [-1,1])box('#f3e6ca',[side*.28,-.09,.842],[.13,.04,.025],clothes);
 }
 if(config.identity==='mm')for(const side of [-1,1]){
  const blush=orb('#e4a0a0',[side*.366,-.15,-.24],[.035,.07,.085],head);blush.name='identity:mm';
  rod('#233e3d',[side*.4,.17,-.23],[side*.46,.23,-.24],{radius:.013,parent:head});
 }
 return scarfTail;
}
