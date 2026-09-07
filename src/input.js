const p1 = {KeyA:'left',KeyD:'right',KeyW:'jump',KeyS:'duck',Space:'boost'};
const p2 = {Numpad4:'left',Numpad6:'right',Numpad8:'jump',Numpad2:'duck',Numpad0:'boost',ArrowLeft:'left',ArrowRight:'right',ArrowUp:'jump',ArrowDown:'duck',ShiftRight:'boost'};
export function keyboardAction(code, gameMode) {
 if (p1[code]) return {playerId:0,type:p1[code]};
 if (p2[code]) return {playerId:gameMode==='duo'?1:0,type:p2[code]};
 if (code==='KeyE'&&gameMode==='items') return {playerId:0,type:'item'};
 return null;
}
export function isMobileDevice() {
 if(typeof navigator==='undefined')return false;
 return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
}
function trapFocus(event, overlay) {
 if(event.code!=='Tab'||!overlay)return;
 const controls=[...overlay.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')]
  .filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);
 if(!controls.length)return;
 const active=document.activeElement;
 if(event.shiftKey&&(active===controls[0]||!overlay.contains(active))){event.preventDefault();controls.at(-1).focus()}
 else if(!event.shiftKey&&(active===controls.at(-1)||!overlay.contains(active))){event.preventDefault();controls[0].focus()}
}
export function bindInput(canvas, api) {
 const {game,app,action,pauseGame,resumeGame}=api;
 const controller=new AbortController(),options={signal:controller.signal};
 document.addEventListener('keydown',event=>{
  if(app.error.value)return;
  const overlay=[...document.querySelectorAll('.overlay,[role="dialog"]')].find(el=>!el.hidden&&el.getClientRects().length);
  trapFocus(event,overlay);
  if(event.repeat)return;
  if(app.helpOpen.value){if(event.code==='Escape')app.closeHelp();return}
  if(app.wardrobeOpen.value)return;
  const target=event.target;
  if(target.closest('input,select,textarea,[contenteditable="true"],[contenteditable=""]')||target.isContentEditable)return;
  if(event.code==='KeyP'||event.code==='Escape'){
   if(['playing','paused'].includes(game.mode)){event.preventDefault();game.mode==='paused'?resumeGame():pauseGame()}
   return;
  }
  if(overlay)return;
  if(['Space','Enter'].includes(event.code)&&target.closest('button,a,[role="button"]'))return;
  const command=keyboardAction(event.code,game.gameMode);
  if(game.mode==='playing'&&command){event.preventDefault();action(command)}
  if(game.mode==='home'&&['Enter','Space'].includes(event.code)){event.preventDefault();api.startLevel(app.selected.value)}
 },options);
 let touchStart=null;
 canvas.addEventListener('pointerdown',event=>{
  if(game.mode==='playing'&&!app.helpOpen.value&&!app.wardrobeOpen.value){touchStart={x:event.clientX,y:event.clientY,id:event.pointerId};canvas.setPointerCapture(event.pointerId)}
 },options);
 canvas.addEventListener('pointerup',event=>{
  if(!touchStart||touchStart.id!==event.pointerId)return;
  const dx=event.clientX-touchStart.x,dy=event.clientY-touchStart.y;touchStart=null;
  if(Math.max(Math.abs(dx),Math.abs(dy))<23)return;
  action({playerId:0,type:Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'duck':'jump'});
 },options);
 canvas.addEventListener('pointercancel',()=>{touchStart=null},options);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame()},options);
 window.addEventListener('blur',pauseGame,options);window.addEventListener('resize',api.world.resize,options);
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();pauseGame();app.error.value={title:'contextLost',description:'contextHelp'}},options);
 return ()=>controller.abort();
}
