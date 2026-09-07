import { LEVELS } from './levels.js';
import { endlessGap, seededRandom, ITEM_TYPES } from './rules.js';
export function createEndlessLayout(seed) {
 const random = seededRandom(seed); let at = 70, row = 0;
 return { through(distance) {
  const entries = [];
  while (at <= distance) {
   const safe = Math.floor(random() * 3), blocked = (safe + 1 + Math.floor(random() * 2)) % 3;
   entries.push({type:['hurdle','gate','crate'][row % 3],lane:blocked,at});
   if (row > 3) entries.push({type:['gate','crate','hurdle'][row % 3],lane:3-safe-blocked,at});
   for (let k=0;k<4;k++) entries.push({type:'fish',lane:safe,at:at-7+k*3.7});
   if (row % 10 === 3) entries.push({type:'shield',lane:safe,at:at+13});
   at += endlessGap(at); row++;
  }
  return entries;
 }};
}
export function campaignLayout(index, items = false, seed = 1) {
 const entries = [], level = LEVELS[index], itemRandom = seededRandom(seed);
 let value = 7919 + index * 104729;
 const random = () => { value = value * 16807 % 2147483647; return (value - 1) / 2147483646; };
 for (let n=0,at=70;at<level.length-35;n++,at+=level.gap) {
  const safe=n<3?0:Math.floor(random()*3),primary=n<3?1:(safe+1+Math.floor(random()*2))%3;
  const types=['hurdle','gate','crate'],type=types[n%3];
  entries.push({type,lane:primary,at});
  if(n>3&&(index>0||n%3===0))entries.push({type:types[(n+1)%3],lane:3-safe-primary,at});
  for(let k=0;k<4;k++)entries.push({type:'fish',lane:safe,at:at-7+k*3.7});
  if(n%4===0)for(let k=0;k<3;k++)entries.push({type:'fish',lane:primary,at:at-2+k*2.7,height:type==='hurdle'?3:1.35});
  if(n===3||n===12)entries.push({type:'shield',lane:safe,at:at+13});
  if(items&&n%3===0)entries.push({type:'item',lane:safe,at:at+17,item:ITEM_TYPES[Math.floor(itemRandom()*4)]});
 }
 for(let n=0;n<7;n++)entries.push({type:'fish',lane:1,at:18+n*4});
 return entries;
}
