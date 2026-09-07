const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const target=pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href;
const report=[];
const artifacts=path.resolve(__dirname,'../test-results');
fs.mkdirSync(artifacts,{recursive:true});
function check(name,actual,expected=true){assert.deepEqual(actual,expected,name);report.push('PASS '+name)}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.setOffline(true);
  // Hold the display clock; tests advance the real game's physics at 120 Hz.
  await context.addInitScript(()=>{window.requestAnimationFrame=callback=>{window.testFrame=callback;return 1}});
  const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto(target);
  check('offline file initialization',await page.evaluate(()=>game.mode==='home'&&$('loading').hidden&&renderer.getContext().getParameter(renderer.getContext().VERSION).includes('WebGL')));
  check('only the HTML file is requested',requests,[target]);
  check('later stages initially locked',await page.locator('.route:disabled').count(),2);
  await page.getByRole('button',{name:'第一次骑？看这里'}).click();check('help opens',await page.locator('#help').isVisible());
  await page.keyboard.press('Escape');check('help closes with Escape',await page.locator('#help').isHidden());
  await page.getByRole('button',{name:'出发，去兜风'}).click();
  await page.keyboard.press('ArrowLeft');check('keyboard moves left',await page.evaluate(()=>game.lane),0);
  await page.keyboard.press('ArrowLeft');check('left lane is bounded',await page.evaluate(()=>game.lane),0);
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
  check('right lane is bounded',await page.evaluate(()=>game.lane),2);
  await page.keyboard.press('Space');
  check('space jumps',await page.evaluate(()=>game.vy>0));
  check('jump rises then lands',await page.evaluate(()=>{for(let i=0;i<30;i++)step(1/120);const high=game.jumpY>1.18;for(let i=0;i<90;i++)step(1/120);return high&&game.jumpY===0&&game.vy===0}));
  await page.keyboard.press('ArrowDown');check('down key ducks',await page.evaluate(()=>game.duck>0));
  await page.keyboard.press('p');check('pause preserves position',await page.evaluate(()=>{const d=game.distance;step(1);return game.mode==='paused'&&game.distance===d}));
  await page.getByRole('button',{name:'继续骑行'}).click();check('resume',await page.evaluate(()=>game.mode),'playing');
  check('hurdle damages without a jump',await page.evaluate(()=>{startLevel(0);const e=entities.find(e=>e.type==='hurdle');game.distance=e.at;game.lane=e.lane;game.x=(e.lane-1)*3.4;collide();return game.hp}),2);
  check('jump clears a real hurdle',await page.evaluate(()=>{startLevel(0);const e=entities.find(e=>e.type==='hurdle');game.distance=e.at-6;game.lane=e.lane;game.x=(e.lane-1)*3.4;action('jump');for(let i=0;i<70;i++)step(1/120);return game.hp===3&&e.resolved}));
  check('blue bar damages without ducking',await page.evaluate(()=>{startLevel(0);const e=entities.find(e=>e.type==='gate');game.distance=e.at;game.lane=e.lane;game.x=(e.lane-1)*3.4;collide();return game.hp}),2);
  check('duck clears a real blue bar',await page.evaluate(()=>{startLevel(0);const e=entities.find(e=>e.type==='gate');game.distance=e.at-6;game.lane=e.lane;game.x=(e.lane-1)*3.4;action('duck');for(let i=0;i<65;i++)step(1/120);return game.hp===3&&e.resolved}));
  check('jumping cannot clear tall crates',await page.evaluate(()=>{startLevel(0);const e=entities.find(e=>e.type==='crate');game.distance=e.at-6;game.lane=e.lane;game.x=(e.lane-1)*3.4;action('jump');for(let i=0;i<65;i++)step(1/120);return game.hp}),2);
  check('fish pickup increments exactly once',await page.evaluate(()=>{startLevel(0);const e=entities.find(e=>e.type==='fish'&&e.lane===1&&e.at===18);game.distance=e.at;collide();collide();return game.fish}),1);
  check('shield pickup absorbs one collision',await page.evaluate(()=>{startLevel(0);const e=entities.find(e=>e.type==='shield');game.distance=e.at;game.x=(e.lane-1)*3.4;collide();const obtained=game.shield;const c=entities.find(e=>e.type==='crate');game.distance=c.at;game.x=(c.lane-1)*3.4;collide();return obtained&&!game.shield&&game.hp===3}));
  check('three separated collisions end the run',await page.evaluate(()=>{startLevel(0);for(const e of entities.filter(e=>e.type==='crate').slice(0,3)){game.invincible=0;game.distance=e.at;game.x=(e.lane-1)*3.4;collide()}return game.mode==='lost'&&game.hp===0}));
  await page.getByRole('button',{name:'再骑一次'}).click();check('retry resets this level',await page.evaluate(()=>game.mode==='playing'&&game.distance===0&&game.hp===3&&game.fish===0));
  const stages=[];
  for(let level=0;level<3;level++){
   const result=await page.evaluate(()=>{
    for(let ticks=0;ticks<20000&&game.mode==='playing';ticks++){
     const ahead=entities.filter(e=>!['fish','shield'].includes(e.type)&&e.at>game.distance-2).sort((a,b)=>a.at-b.at)[0];
     if(ahead&&ahead.at-game.distance<30){const blocked=entities.filter(e=>!['fish','shield'].includes(e.type)&&e.at===ahead.at).map(e=>e.lane);const safe=[0,1,2].find(lane=>!blocked.includes(lane));if(game.lane!==safe)action(game.lane<safe?'right':'left')}
     step(1/120);
    }
    return {mode:game.mode,level:game.level,distance:game.distance,hp:game.hp,fish:game.fish,unlocked:save.unlocked,stars:save.stars[game.level]};
   });
   check('stage '+(level+1)+' reaches finish with real physics',result.mode,'won');
   check('stage '+(level+1)+' has a collision-free route',result.hp,3);
   check('stage '+(level+1)+' grants three stars',result.stars,3);stages.push(result);
   if(level<2){await page.getByRole('button',{name:'下一站，继续冒险'}).click();check('next-stage button starts correct stage',await page.evaluate(()=>game.level),level+1)}
  }
  await page.evaluate(()=>{updateWorld(game.distance,20);updateEntities(20);updateCamera(20);renderer.render(scene,camera)});
  await page.screenshot({path:path.join(artifacts,'victory.png')});
  await page.reload();check('completed stages persist after reload',await page.evaluate(()=>save.unlocked===3&&save.stars.every(n=>n===3)&&save.best.every(n=>n>0)));
  check('unlocked route buttons persist',await page.locator('.route:disabled').count(),0);
  check('no JavaScript page errors',errors,[]);
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await mobile.setOffline(true);
  await mobile.addInitScript(()=>{window.requestAnimationFrame=callback=>{window.testFrame=callback;return 1}});
  const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));await phone.goto(target);
  await phone.getByRole('button',{name:'出发，去兜风'}).tap();
  await phone.getByRole('button',{name:'向左变道'}).tap();check('touch button changes lane',await phone.evaluate(()=>game.lane),0);
  await phone.getByRole('button',{name:'跳跃',exact:true}).tap();check('touch jump',await phone.evaluate(()=>game.vy>0));
  await phone.evaluate(()=>{for(let i=0;i<130;i++)step(1/120)});
  await phone.getByRole('button',{name:'低头',exact:true}).tap();check('touch duck',await phone.evaluate(()=>game.duck>0));
  const cdp=await mobile.newCDPSession(phone);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:120,y:420}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:260,y:420}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  check('real touch swipe changes lane',await phone.evaluate(()=>game.lane),1);
  const mobileBounds=await phone.evaluate(()=>{action('right');for(let i=0;i<60;i++)step(1/120);updateCamera(10);rider.position.x=game.x;renderer.render(scene,camera);const p=V(game.x,2,0).project(camera);return {x:p.x,y:p.y}});
  console.log('Mobile projection',mobileBounds);
  check('mobile right-lane rider stays in view',Math.abs(mobileBounds.x)<.85&&Math.abs(mobileBounds.y)<.85);
  check('mobile has no horizontal overflow',await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check('mobile introduces no JavaScript errors',errors,[]);
  fs.writeFileSync(path.join(artifacts,'verification.json'),JSON.stringify({checks:report,stages,mobileBounds,requests,errors},null,2));
  console.log(report.join('\n'));console.log('STAGES',JSON.stringify(stages));console.log(report.length+' checks passed');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
