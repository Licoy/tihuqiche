$('start').onclick=()=>startLevel(selected);
$('sound').onclick=()=>{soundEnabled=!soundEnabled;updateSound();if(soundEnabled)tone('fish');if(game.mode==='playing')$('scene').focus()};
$('pause').onclick=pauseGame;$('resume').onclick=resumeGame;
$('restart').onclick=()=>startLevel(game.level);$('quit').onclick=goHome;$('result-home').onclick=goHome;
$('next').onclick=()=>{if(game.mode==='lost')startLevel(game.level);else if(game.level===2)goHome();else startLevel(game.level+1)};
$('help-open').onclick=()=>{$('help').hidden=false;$('help-close').focus()};
$('help-close').onclick=()=>{$('help').hidden=true;$('help-open').focus()};
const keyActions={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'jump',w:'jump',W:'jump',' ':'jump',ArrowDown:'duck',s:'duck',S:'duck'};
document.addEventListener('keydown',event=>{
 if(event.key==='Tab'){
  const overlay=[...document.querySelectorAll('.overlay')].find(el=>!el.hidden);
  if(overlay){const buttons=[...overlay.querySelectorAll('button')];if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1).focus()}else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0].focus()}}
 }
 if(event.repeat)return;
 if(!$('help').hidden){if(event.key==='Escape')$('help-close').click();return}
 if(event.key==='p'||event.key==='P'||event.key==='Escape'){
  if(['playing','paused'].includes(game.mode)){event.preventDefault();game.mode==='paused'?resumeGame():pauseGame()}return;
 }
 if(game.mode==='playing'&&keyActions[event.key]){
  if(event.key===' '&&event.target.tagName==='BUTTON')return;
  event.preventDefault();action(keyActions[event.key]);
 }
 if(game.mode==='home'&&(event.key==='Enter'||event.key===' ')&&!event.target.closest('button,a')){event.preventDefault();startLevel(selected)}
});
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();action(b.dataset.action)}));
let touchStart=null;
$('scene').addEventListener('pointerdown',e=>{if(game.mode==='playing'){touchStart={x:e.clientX,y:e.clientY,id:e.pointerId};$('scene').setPointerCapture(e.pointerId)}});
$('scene').addEventListener('pointerup',e=>{
 if(!touchStart||touchStart.id!==e.pointerId)return;
 const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;touchStart=null;
 if(Math.max(Math.abs(dx),Math.abs(dy))<23)return;
 action(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'duck':'jump');
});
$('scene').addEventListener('pointercancel',()=>{touchStart=null});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame()});
window.addEventListener('blur',pauseGame);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
$('scene').addEventListener('webglcontextlost',e=>{e.preventDefault();pauseGame();$('loading').hidden=false;$('loading').innerHTML='<h2>3D 画面连接中断</h2><p>请重新打开文件，或刷新页面恢复游戏；已完成的关卡会保留</p>'});
readSave();renderRoutes();setTheme(selected);updateCamera(10);$('loading').hidden=true;
requestAnimationFrame(frame);
