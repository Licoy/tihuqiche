const options = entries => Object.freeze(entries.map(([id, zh, en]) => Object.freeze({id, zh, en})));
export const RIDER_OPTIONS = Object.freeze({
  identity: options([['gg','GG','GG'],['mm','MM','MM']]),
  skin: options([['cream','奶油白','Cream'],['silver','银灰','Silver'],['brown','浅棕','Brown'],['pink','淡粉','Pink']]),
  hat: options([['none','无','None'],['helmet','骑行头盔','Helmet'],['cap','棒球帽','Cap']]),
  scarf: options([['none','无','None'],['short','短围巾','Short'],['long','长飘带','Long']]),
  glasses: options([['none','无','None'],['round','圆框眼镜','Round'],['sunglasses','墨镜','Sunglasses']]),
  clothes: options([['none','无','None'],['vest','背心','Vest'],['jersey','骑行上衣','Jersey']]),
  vehicle: options([['bicycle','自行车','Bicycle'],['motorcycle','摩托车','Motorcycle'],['ebike','电瓶车','E-bike'],['scooter','滑板车','Scooter']]),
});
export const RIDER_COLORS = Object.freeze([
  ['coral','#E9764E','珊瑚橙','Coral'],['green','#338878','海藻绿','Green'],
  ['blue','#4B83A6','海洋蓝','Blue'],['cream','#F3E6CA','奶油色','Cream'],
].map(([id,hex,zh,en])=>Object.freeze({id,hex,zh,en})));
export function defaultRiderConfig(playerId=0) {
  if(playerId!==0 && playerId!==1) throw new RangeError('Unknown player seat');
  return {identity:playerId?'mm':'gg',skin:'cream',hat:'helmet',hatColor:playerId?'blue':'coral',
    scarf:'long',scarfColor:'green',glasses:'none',glassesColor:'coral',clothes:'none',clothesColor:'coral',
    vehicle:'bicycle',vehicleColor:playerId?'blue':'coral'};
}
export function validateRiderConfig(config) {
  if(!config || typeof config!=='object' || Array.isArray(config)) throw new TypeError('Invalid rider configuration');
  const result={};
  for(const key of Object.keys(defaultRiderConfig())) {
    const choices=key.endsWith('Color')?RIDER_COLORS:RIDER_OPTIONS[key];
    if(!choices.some(option=>option.id===config[key])) throw new RangeError(`Unknown rider ${key}: ${config[key]}`);
    result[key]=config[key];
  }
  for(const key of Object.keys(config)) if(!(key in result)) throw new RangeError(`Unknown rider field: ${key}`);
  return result;
}
export const riderColor = id => {
  const color=RIDER_COLORS.find(entry=>entry.id===id);
  if(!color) throw new RangeError(`Unknown rider color: ${id}`);
  return color.hex;
};
