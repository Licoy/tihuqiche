import { collectFish } from './rules.js';
export const isPickup = type => ['fish','shield','item'].includes(type);
// Swept contact uses the same previous/current tick for both players, including lane and height.
function contact(player, previous, entity) {
 const magnet = entity.type === 'fish' && player.magnetRemaining > 0;
 const before = previous || player;
 const start = before.distance, end = player.distance;
 const reach = magnet ? 12 : isPickup(entity.type) ? 1.45 : .65;
 if (entity.at < start - 1.45 || entity.at > end + reach) return null;
 const fraction = end > start ? Math.max(0, Math.min(1, (entity.at - reach - start) / (end - start))) : 0;
 const x = before.x + (player.x - before.x) * fraction;
 if (!magnet && Math.abs(x - (entity.lane - 1) * 3.4) > 1.08) return null;
 const jumpY = before.jumpY + (player.jumpY - before.jumpY) * fraction;
 if (entity.type === 'fish' && !magnet && Math.abs(jumpY + 1.35 - entity.height) >= 1) return null;
 if (!isPickup(entity.type) && entity.at > end + .65) return null;
 return {player,fraction,jumpY};
}
export function resolveCollisions(game, entities, {previous = [], onEvent = () => {}} = {}) {
 if (game.mode !== 'playing') return;
 for (const entity of entities) {
  if (entity.resolved) continue;
  const contacts = game.players.filter(p => p.status === 'running' && p.hp > 0)
   .map(p => contact(p, previous[p.id], entity)).filter(Boolean);
  if (isPickup(entity.type)) {
   const eligible = contacts.filter(c => entity.type !== 'item' || c.player.itemSlot === null);
   eligible.sort((a,b) => Math.abs(a.fraction-b.fraction) > 1e-8 ? a.fraction-b.fraction : ((a.player.id + entity.id) % 2) - ((b.player.id + entity.id) % 2));
   if (!eligible.length) continue;
   const p = eligible[0].player;
   if (entity.type === 'fish') collectFish(p);
   if (entity.type === 'shield') p.shield = true;
   if (entity.type === 'item') p.itemSlot = entity.item;
   entity.resolved = true; onEvent(entity.type,p,entity); continue;
  }
  entity.resolvedBy ||= [];
  for (const c of contacts) {
   const p = c.player;
   if (entity.resolvedBy.includes(p.id)) continue;
   entity.resolvedBy.push(p.id);
   const safe = entity.type === 'hurdle' ? c.jumpY > 1.18 : entity.type === 'gate' ? p.duck > 0 && c.jumpY < .1 : false;
   if (safe || p.invincible > 0) continue;
   p.invincible = 1.8;
   if (p.shield) { p.shield = false; onEvent('shieldHit',p,entity); }
   else { p.hp--; onEvent('hit',p,entity); }
  }
 }
}
