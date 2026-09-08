import { LEVELS } from './levels.js';
export const GAME_MODES = ['campaign', 'endless', 'duo', 'items'];
export const ITEM_TYPES = ['shield', 'magnet', 'double', 'clear'];
export const BOOST_FISH_PER_SECOND = 4;
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
export function createPlayer(id = 0) {
 return {id,status:'running',distance:0,speed:0,lane:1,x:0,jumpY:0,vy:0,duck:0,hp:3,
  fishCollected:0,fishBalance:0,bonusScore:0,shield:false,invincible:0,boosting:false,boostElapsed:0,
  catchupBonus:0,itemSlot:null,magnetRemaining:0,doubleRemaining:0};
}
export function initialGameState() {
 return {mode:'home',gameMode:'campaign',level:0,seed:1,elapsed:0,distance:0,speed:0,
  players:[createPlayer()],result:null,recordSaved:null,markers:[],homePreviewPlayer:0,homePreviewAuto:true};
}
export const endlessSpeed = distance => 18 + 14 * clamp(distance / 5000, 0, 1);
export const endlessGap = distance => 36 - 8 * clamp(distance / 5000, 0, 1);
export const catchupBonus = gap => .5 * clamp((gap - 10) / 8, 0, 1);
export function seededRandom(seed) {
 let value = (seed >>> 0) % 2147483646 + 1;
 return () => { value = value * 16807 % 2147483647; return (value - 1) / 2147483646; };
}
export function applyAction(player, type) {
 if (player.status !== 'running') return false;
 if (type === 'left' || type === 'right') player.lane = clamp(player.lane + (type === 'left' ? -1 : 1), 0, 2);
 else if (type === 'jump' && player.jumpY === 0) { player.vy = 9.5; player.duck = 0; }
 else if (type === 'duck' && player.jumpY === 0) player.duck = .95;
 else if (type === 'boost' && (player.boosting || player.fishBalance > 0)) {
  player.boosting = !player.boosting;
 } else return false;
 return true;
}
export function collectFish(player) {
 player.fishCollected++; player.fishBalance++;
 if (player.doubleRemaining > 0) player.bonusScore += 25;
}
export function useItem(player, entities) {
 if (player.status !== 'running' || !player.itemSlot) return false;
 const item = player.itemSlot;
 if (item === 'shield') { if (player.shield) return false; player.shield = true; }
 if (item === 'magnet') player.magnetRemaining = 8;
 if (item === 'double') player.doubleRemaining = 8;
 if (item === 'clear') for (const entity of entities) {
  if (['hurdle','gate','crate'].includes(entity.type) && entity.at >= player.distance && entity.at <= player.distance + 30) entity.resolved = true;
 }
 player.itemSlot = null; return true;
}
function advanceBoost(player, dt) {
 if (!player.boosting) return 0;
 const duration = Math.min(dt, player.fishBalance / BOOST_FISH_PER_SECOND - player.boostElapsed);
 const elapsed = player.boostElapsed + duration;
 const spent = Math.min(player.fishBalance, Math.floor(elapsed * BOOST_FISH_PER_SECOND + 1e-9));
 player.fishBalance -= spent;
 player.boostElapsed = Math.max(0, elapsed - spent / BOOST_FISH_PER_SECOND);
 if (player.fishBalance === 0) { player.boosting = false; player.boostElapsed = 0; }
 return duration;
}
export function advancePlayers(game, dt) {
 if (game.mode !== 'playing') return;
 const running = game.players.filter(p => p.status === 'running');
 const lead = Math.max(0, ...running.map(p => p.distance));
 const level = LEVELS[game.level];
 const base = game.gameMode === 'endless' ? endlessSpeed(lead) : level.speed + (level.maxSpeed - level.speed) * Math.min(1, lead / level.length);
 game.elapsed += dt;
 for (const p of running) {
  p.catchupBonus = game.gameMode === 'duo' ? catchupBonus(lead - p.distance) : 0;
  const boostTime = advanceBoost(p, dt), normalSpeed = base * (1 + p.catchupBonus);
  const boostSpeed = base * Math.min(1.75, 1.5 + p.catchupBonus);
  p.speed = p.boosting ? boostSpeed : normalSpeed;
  const distance = p.distance + normalSpeed * dt + (boostSpeed - normalSpeed) * boostTime;
  p.distance = game.gameMode === 'endless' ? distance : Math.min(level.length, distance);
  p.x += ((p.lane - 1) * 3.4 - p.x) * (1 - Math.exp(-14 * dt));
  if (p.vy !== 0 || p.jumpY > 0) {
   p.jumpY += p.vy * dt - 11 * dt * dt; p.vy -= 22 * dt;
   if (p.jumpY <= 0) { p.jumpY = 0; p.vy = 0; }
  }
  for (const field of ['duck','invincible','magnetRemaining','doubleRemaining']) p[field] = Math.max(0, p[field] - dt);
 }
 syncOverview(game);
}
export function syncOverview(game) {
 const active = game.players.filter(p => p.status === 'running');
 game.distance = Math.max(0, ...(active.length ? active : game.players).map(p => p.distance));
 game.speed = game.players[0].speed;
}
export function settlePlayers(game) {
 for (const p of game.players) if (p.status === 'running') {
  if (p.hp <= 0) { p.status = 'downed'; p.speed = 0; p.boosting = false; }
  else if (game.gameMode !== 'endless' && p.distance >= LEVELS[game.level].length) { p.status = 'finished'; p.speed = 0; p.boosting = false; }
 }
 syncOverview(game);
 if (game.players.some(p => p.status === 'running')) return null;
 return game.players.some(p => p.status === 'finished') ? 'won' : 'lost';
}
function deepFreeze(object) {
 Object.values(object).forEach(value => { if (value && typeof value === 'object') deepFreeze(value); });
 return Object.freeze(object);
}
export function makeResult(game, {outcome, appearances, bestScore = 0}) {
 const players = game.players.map(p => ({id:p.id,status:p.status,distance:p.distance,hp:p.hp,
  fishCollected:p.fishCollected,fishBalance:p.fishBalance,bonusScore:p.bonusScore,
  score:Math.floor(p.distance) + p.fishCollected * 25 + p.bonusScore + (game.gameMode !== 'endless' && p.status === 'finished' ? p.hp * 150 : 0),
  appearance:{...appearances[p.id]}}));
 const fishCollected = players.reduce((n,p) => n + p.fishCollected, 0);
 const score = players.reduce((n,p) => n + p.score, 0);
 const perfect = players.every(p => p.status === 'finished' && p.hp === 3);
 const stars = game.gameMode === 'endless' ? null : outcome === 'won' ? 1 + Number(perfect) + Number(fishCollected >= (game.gameMode === 'duo' ? 50 : 25)) : 0;
 return deepFreeze({gameMode:game.gameMode,levelIndex:game.gameMode === 'endless' ? null : game.level,
  seed:game.seed,outcome,reason:outcome === 'ended' ? 'retired' : outcome === 'won' ? 'finish' : 'exhausted',
  score,stars,isNewRecord:score > bestScore,distance:Math.max(...players.map(p => p.distance)),fishCollected,players});
}
