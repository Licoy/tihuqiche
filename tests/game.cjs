const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const target=pathToFileURL(path.resolve(__dirname,'../dist/offline.html')).href;
const { installTestClock, waitForGame, rideToFinish, verifyFeatures } = require('./features.cjs');
const { verifyUpgrades } = require('./upgrades.cjs');
const { verifySettingsUi } = require('./settings-ui.cjs');
const { verifyMobileHeader, verifyControlsUi } = require('./controls-ui.cjs');
const report=[];
const artifacts=path.resolve(__dirname,'../test-results');
fs.mkdirSync(artifacts,{recursive:true});
function check(name,actual,expected=true){assert.deepEqual(actual,expected,name);report.push('PASS '+name)}
async function renderView(page){
 // The suite holds requestAnimationFrame, so poll resize completion independently.
 await page.waitForFunction(()=>camera.aspect===innerWidth/innerHeight,null,{polling:50});
 await page.evaluate(()=>{testFrame(performance.now());updateCamera(10);document.getAnimations().forEach(animation=>{if(Number.isFinite(animation.effect.getComputedTiming().endTime))animation.finish()});renderer.render(scene,camera)});
}
(async()=>{
 const { messages } = await import(pathToFileURL(path.resolve(__dirname,'../src/locales.js')).href);
 const { LEVELS } = await import(pathToFileURL(path.resolve(__dirname,'../src/levels.js')).href);
 const levelCount=LEVELS.length;
 const zh=messages.zh;
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900},locale:'zh-CN',colorScheme:'light'});
  await context.setOffline(true);
  // Hold the display clock; tests advance the real game's physics at 120 Hz.
  await installTestClock(context);
  const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto(target);await waitForGame(page);
  check('offline file initialization',await page.evaluate(()=>game.mode==='home'&&$('loading').hidden&&renderer.getContext().getParameter(renderer.getContext().VERSION).includes('WebGL')));
  check('only the HTML file is requested',requests,[target]);
  check('header shows the requested brand and domain',await page.locator('.brand').innerText(),'鹈鹕骑车\ntihuqiche.com');
  check('logo is embedded, decoded and transparent',await page.evaluate(()=>{const img=document.querySelector('.brand-mark'),c=document.createElement('canvas');c.width=c.height=1;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return img.complete&&img.naturalWidth>0&&img.src.startsWith('data:image/png;base64,')&&ctx.getImageData(0,0,1,1).data[3]===0}));
  check('home links to the project on GitHub',await page.locator('#github').getAttribute('href'),'https://github.com/Licoy/tihuqiche');
  check('GitHub keyboard activation does not start the game',await page.evaluate(()=>{const event=new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});$('github').dispatchEvent(event);return !event.defaultPrevented&&game.mode==='home'}));
  check('sound defaults on before interaction',await page.evaluate(()=>soundEnabled&&audio===null&&$('sound').getAttribute('aria-pressed')==='true'&&$('sound').getAttribute('aria-label')==='音效：开'));
  await renderView(page);await page.screenshot({path:path.join(artifacts,'home-desktop.png')});
  check('later stages initially locked',await page.locator('.route:disabled').count(),levelCount-1);
  await page.getByRole('button',{name:'第一次骑？看这里'}).click();check('help opens',await page.locator('#help').isVisible());
  check('Chinese help translates every instruction',await page.locator('#help').textContent().then(text=>[zh.helpTitle,zh.helpNote,...zh.helpRows.flat()].every(value=>text.includes(value))));
  await page.keyboard.press('Escape');check('help closes with Escape',await page.locator('#help').isHidden());
  await page.getByRole('button',{name:'出发，去兜风'}).click();
  await page.waitForFunction(()=>audio?.state==='running',null,{polling:50});check('start click activates real audio',await page.evaluate(()=>audio.state),'running');
  check('GitHub entry is hidden during a run',await page.locator('#github').isHidden());
  check('Chinese HUD includes the full stage count and health label',await page.evaluate(count=>$('level-name').textContent.includes('珊瑚海岸')&&$('stage-count').textContent===`1 / ${count}`&&$('hearts').getAttribute('aria-label')==='剩余 3 点体力',levelCount));
  await page.locator('#language').click();
  await page.keyboard.press('ArrowLeft');
  check('focused language button still allows gameplay direction keys',await page.evaluate(()=>({lane:game.players[0].lane,activeElement:document.activeElement.id})),{lane:0,activeElement:'language'});
  await page.keyboard.press('Space');
  check('focused language button retains native Space activation without boosting',await page.evaluate(()=>app.locale.value==='zh'&&!game.players[0].boosting&&document.activeElement.id==='language'));
  await page.keyboard.press('ArrowRight');
  await page.locator('#sound').click();check('sound can be muted',await page.evaluate(()=>!soundEnabled&&$('sound').getAttribute('aria-pressed')==='false'));
  await page.locator('#pause').click();await page.locator('#restart').click();check('restart respects muted sound',await page.evaluate(()=>!soundEnabled));
  await page.locator('#sound').click();check('sound can be enabled again',await page.evaluate(()=>soundEnabled&&$('sound').getAttribute('aria-pressed')==='true'));
  await page.keyboard.press('ArrowLeft');check('keyboard moves left',await page.evaluate(()=>game.players[0].lane),0);
  await page.keyboard.press('ArrowLeft');check('left lane is bounded',await page.evaluate(()=>game.players[0].lane),0);
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
  check('right lane is bounded',await page.evaluate(()=>game.players[0].lane),2);
  await page.keyboard.press('ArrowUp');
  check('up key jumps',await page.evaluate(()=>game.players[0].vy>0));
  check('jump rises then lands',await page.evaluate(()=>{for(let i=0;i<30;i++)step(1/120);const high=game.players[0].jumpY>1.18;for(let i=0;i<90;i++)step(1/120);return high&&game.players[0].jumpY===0&&game.players[0].vy===0}));
  await page.keyboard.press('ArrowDown');check('down key ducks',await page.evaluate(()=>game.players[0].duck>0));
  await page.keyboard.press('p');check('pause preserves position',await page.evaluate(()=>{const d=game.distance;step(1);return game.mode==='paused'&&game.distance===d}));
  check('Chinese pause dialog is fully translated',await page.locator('#pause-screen').textContent().then(text=>[zh.pauseTag,zh.pauseTitle,zh.pauseDesc,zh.resume,zh.restart,zh.home].every(value=>text.includes(value))));
  await page.getByRole('button',{name:'继续骑行'}).click();check('resume',await page.evaluate(()=>game.mode),'playing');
  check('hurdle damages without a jump',await page.evaluate(()=>{startLevel(0);const e=entities.find(e=>e.type==='hurdle');game.distance=game.players[0].distance=e.at;game.players[0].lane=e.lane;game.players[0].x=(e.lane-1)*3.4;collide();return game.players[0].hp}),2);
  check('jump clears a real hurdle',await page.evaluate(()=>{startLevel(0);const e=entities.find(e=>e.type==='hurdle');game.distance=game.players[0].distance=e.at-6;game.players[0].lane=e.lane;game.players[0].x=(e.lane-1)*3.4;action({playerId:0,type:'jump'});for(let i=0;i<70;i++)step(1/120);return game.players[0].hp===3&&e.resolvedBy.includes(0)}));
  check('blue bar damages without ducking',await page.evaluate(()=>{startLevel(0);const e=entities.find(e=>e.type==='gate');game.distance=game.players[0].distance=e.at;game.players[0].lane=e.lane;game.players[0].x=(e.lane-1)*3.4;collide();return game.players[0].hp}),2);
  check('duck clears a real blue bar',await page.evaluate(()=>{startLevel(0);const e=entities.find(e=>e.type==='gate');game.distance=game.players[0].distance=e.at-6;game.players[0].lane=e.lane;game.players[0].x=(e.lane-1)*3.4;action({playerId:0,type:'duck'});for(let i=0;i<65;i++)step(1/120);return game.players[0].hp===3&&e.resolvedBy.includes(0)}));
  check('jumping cannot clear tall crates',await page.evaluate(()=>{startLevel(0);const e=entities.find(e=>e.type==='crate');game.distance=game.players[0].distance=e.at-6;game.players[0].lane=e.lane;game.players[0].x=(e.lane-1)*3.4;action({playerId:0,type:'jump'});for(let i=0;i<65;i++)step(1/120);return game.players[0].hp}),2);
  check('fish pickup increments exactly once',await page.evaluate(()=>{startLevel(0);const e=entities.find(e=>e.type==='fish'&&e.lane===1&&e.at===18);game.distance=game.players[0].distance=e.at;collide();collide();return [game.players[0].fishCollected,game.players[0].fishBalance]}),[1,1]);
  check('shield pickup absorbs one collision',await page.evaluate(()=>{startLevel(0);const e=entities.find(e=>e.type==='shield');game.distance=game.players[0].distance=e.at;game.players[0].x=(e.lane-1)*3.4;collide();const obtained=game.players[0].shield;const c=entities.find(e=>e.type==='crate');game.distance=game.players[0].distance=c.at;game.players[0].x=(c.lane-1)*3.4;collide();return obtained&&!game.players[0].shield&&game.players[0].hp===3}));
  check('three separated collisions end the run',await page.evaluate(()=>{startLevel(0);for(const e of entities.filter(e=>e.type==='crate').slice(0,3)){game.players[0].invincible=0;game.distance=game.players[0].distance=e.at;game.players[0].x=(e.lane-1)*3.4;collide()}step(1/120);return game.mode==='lost'&&game.players[0].hp===0}));
  check('Chinese defeat dialog is fully translated',await page.locator('#result').textContent().then(text=>[zh.modes.campaign,zh.lostTitle,zh.lostDesc,zh.retry,zh.home,zh.rideStat,zh.fishStat,zh.totalScore].every(value=>text.includes(value))));
  await page.getByRole('button',{name:'再骑一次'}).click();check('retry resets this level',await page.evaluate(()=>game.mode==='playing'&&game.distance===0&&game.players[0].hp===3&&game.players[0].fishCollected===0&&game.players[0].fishBalance===0));
  const stages=[];
  for(let level=0;level<levelCount;level++){
   const result=await rideToFinish(page);
   check('stage '+(level+1)+' reaches finish with real physics',result.mode,'won');
   check('stage '+(level+1)+' has a collision-free route',result.hp,3);
   check('stage '+(level+1)+' grants three stars',result.stars,3);check('stage '+(level+1)+' persists its result stars',result.recordStars,3);stages.push(result);
   check('stage '+(level+1)+' unlocks only the next route',result.unlocked,Math.min(levelCount,level+2));
   check('Chinese stage '+(level+1)+' victory dialog is localized',await page.locator('#result').textContent().then(text=>[level===levelCount-1?zh.allTitle:zh.wonTitle,zh.modes.campaign,level===levelCount-1?zh.again:zh.next,zh.home].every(value=>text.includes(value))));
   if(level<levelCount-1){await page.getByRole('button',{name:'下一站，继续冒险'}).click();check('next-stage button starts correct stage',await page.evaluate(()=>game.level),level+1)}
  }
  await page.evaluate(()=>{updateWorld(game.distance,20);updateEntities(20);updateCamera(20);renderer.render(scene,camera)});
  await page.screenshot({path:path.join(artifacts,'victory.png')});
  await page.reload();await waitForGame(page);check('completed stages persist after reload',await page.evaluate(count=>save.records.campaign.unlocked===count&&save.records.campaign.stars.length===count&&save.records.campaign.best.length===count&&save.records.campaign.stars.every(n=>n===3)&&save.records.campaign.best.every(n=>n>0),levelCount));
  check('unlocked route buttons persist',await page.locator('.route:disabled').count(),0);
  check('no JavaScript page errors',errors,[]);
  const mobile=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'zh-CN',colorScheme:'light'});await mobile.setOffline(true);
  await installTestClock(mobile);
  const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));await phone.goto(target);await waitForGame(phone);
  await phone.getByRole('button',{name:'出发，去兜风'}).tap();
  await phone.waitForFunction(()=>audio?.state==='running',null,{polling:50});check('touch start activates real audio',await phone.evaluate(()=>audio.state),'running');
  await phone.getByRole('button',{name:'向左变道'}).tap();check('touch button changes lane',await phone.evaluate(()=>game.players[0].lane),0);
  await phone.getByRole('button',{name:'跳跃',exact:true}).tap();check('touch jump',await phone.evaluate(()=>game.players[0].vy>0));
  await phone.evaluate(()=>{for(let i=0;i<130;i++)step(1/120)});
  await phone.getByRole('button',{name:'低头',exact:true}).tap();check('touch duck',await phone.evaluate(()=>game.players[0].duck>0));
  const cdp=await mobile.newCDPSession(phone);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:120,y:420}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:260,y:420}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  check('real touch swipe changes lane',await phone.evaluate(()=>game.players[0].lane),1);
  const mobileBounds=await phone.evaluate(()=>{action({playerId:0,type:'right'});for(let i=0;i<60;i++)step(1/120);updateCamera(10);rider.position.x=game.players[0].x;renderer.render(scene,camera);const p=V(game.players[0].x,2,0).project(camera);return {x:p.x,y:p.y}});
  console.log('Mobile projection',mobileBounds);
  check('mobile right-lane rider stays in view',Math.abs(mobileBounds.x)<.85&&Math.abs(mobileBounds.y)<.85);
  check('mobile has no horizontal overflow',await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:568,height:320},{width:844,height:390}]){
   const size=viewport.width+'x'+viewport.height;await phone.setViewportSize(viewport);
   await phone.evaluate(()=>{goHome();$('home').scrollTop=0});await renderView(phone);
   await verifyMobileHeader(phone,check,size);
   if(viewport.width===320||viewport.width===390){
    await phone.locator('#language').tap();await renderView(phone);
    await verifyMobileHeader(phone,check,size+' en','en');
    await phone.locator('#language').tap();await renderView(phone);
   }
   check(size+' home rider is visible beside or above the menu',await phone.evaluate(()=>{const p=V(rider.position.x,2,0).project(camera),menu=$('home').getBoundingClientRect();return Math.abs(p.x)<.9&&Math.abs(p.y)<.9&&(innerWidth>innerHeight?(p.x+1)*innerWidth/2>menu.right:(1-p.y)*innerHeight/2<menu.top)}));
   await phone.screenshot({path:path.join(artifacts,'home-'+size+'.png')});
   await phone.locator('#help-open').tap();
   check(size+' help panel fits the viewport',await phone.evaluate(()=>{const p=$('help').querySelector('.panel').getBoundingClientRect();return p.top>=0&&p.bottom<=innerHeight&&p.left>=0&&p.right<=innerWidth}));
   await phone.locator('#help-close').tap();check(size+' help can be closed',await phone.locator('#help').isHidden());
   await phone.locator('#start').tap();
   check(size+' HUD and touch buttons fit without overlap',await phone.evaluate(()=>{const stage=document.querySelector('.stage-panel').getBoundingClientRect(),counters=document.querySelector('.counters').getBoundingClientRect(),header=document.querySelector('.topbar').getBoundingClientRect(),touch=$('touch').getBoundingClientRect();return stage.right<counters.left&&stage.top>=header.bottom&&touch.top>Math.max(stage.bottom,counters.bottom)&&[...document.querySelectorAll('[data-action]')].every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})}));
   await phone.evaluate(()=>$('toast').classList.remove('show'));await renderView(phone);
   await phone.screenshot({path:path.join(artifacts,'playing-'+size+'.png')});
   await phone.locator('#pause').tap();check(size+' touch pause works',await phone.evaluate(()=>game.mode),'paused');
   await phone.locator('#quit').tap();check(size+' can return to home and GitHub',await phone.locator('#github').isVisible());
  }
  check('mobile introduces no JavaScript errors',errors,[]);
  check('complete original offline flow requests only its HTML',requests.every(url=>url===target));
  await verifyFeatures({browser,target,check,errors});
  await verifyUpgrades({browser,target,check,errors,artifacts});
  await verifyControlsUi({browser,target,check,errors});
  await verifySettingsUi({browser,target,check,errors});
  check('all feature checks introduce no JavaScript errors',errors,[]);
  fs.writeFileSync(path.join(artifacts,'verification.json'),JSON.stringify({checks:report,stages,mobileBounds,requests,errors},null,2));
  console.log(report.join('\n'));console.log('STAGES',JSON.stringify(stages));console.log(report.length+' checks passed');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
