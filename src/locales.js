import { upgradeMessages } from './locales-upgrade.js';
import { settingsMessages } from './locales-settings.js';
export const messages = {
  zh: {
    brand: '鹈鹕骑车', logo: '鹈鹕骑单车', title: '鹈鹕骑车 · 免费 3D 骑车游戏',
    description: '骑上小单车，和鹈鹕一起穿越珊瑚海岸、雨林遗迹、落日神庙、荒漠、骷髅岛与上海滩；免费 3D 骑行闯关游戏，支持键盘、触屏和离线游玩',
    headline: ['鹈鹕', '骑车'], intro: ['长嘴巴，小单车，还有一路好风景', '迎着海风出发，下一站是自由'],
    routes: '选择你的骑行路线', locked: '尚未解锁', unlockHint: '通关前一关解锁', ready: '等待出发',
    start: '出发，去兜风', best: '本关最佳 {score} 分', journey: '十二段旅程 · 一路顺风', helpOpen: '第一次骑？看这里',
    github: 'GitHub 源码仓库（新窗口打开）', soundOn: '音效：开', soundOff: '音效：关', pause: '暂停游戏',
    theme: '外观', system: '跟随系统', light: '浅色', dark: '深色', language: '语言', switchLanguage: 'Switch to English',
    canvas: '鹈鹕骑车 3D 游戏，方向键变道，上或空格跳跃，下键低头',
    hp: '剩余 {hp} 点体力', shield: '护盾已就绪 · 抵挡一次碰撞', move: '变道', jump: '跳跃', duck: '低头', space: '空格', pauseShort: '暂停', left: '向左变道', right: '向右变道',
    pauseTag: '稍作休息', pauseTitle: '歇一会，再出发', pauseDesc: '好风景会等你，旅程暂停在这里', resume: '继续骑行', restart: '重新挑战本关', home: '返回骑行地图',
    allTag: '全程抵达', wonTag: '本站完成', lostTag: '再骑一程', allTitle: '十二段风景，都骑过啦', wonTitle: '这一站，漂亮抵达', lostTitle: '拍拍翅膀，再来一次',
    allDesc: '从珊瑚海岸到迪拜天际线，你完成了整段旅程；回到地图，还可以挑战每一关的三星纪录',
    wonDesc: '已解锁下一站「{name}」，小鱼和好风景还在前面等你', lostDesc: '高木箱要变道，矮木栏要跳跃，蓝色横杆下记得低头；每次重试都从本关开始',
    rideStat: '骑行 / 米', fishStat: '收集 / 小鱼', scoreStat: '本关得分', again: '再游一程', next: '下一站，继续冒险', retry: '再骑一次',
    helpTag: '第一次骑行', helpTitle: '骑得开心，也要看路',
    helpRows: [['左右变道', '← → / A D，或向左、向右滑动'], ['跳过路障', '↑ / W / 空格，或向上滑动；矮木栏可以跳过，高木箱要绕开'], ['低头穿过', '↓ / S，或向下滑动；蓝色横杆下，把长嘴巴收一收'], ['小鱼与护盾', '金色小鱼加分，青色圆环提供一次保护']],
    helpNote: '自动向前骑行，体力用尽可重试；到达终点即可解锁下一关，保留 3 点体力并收集 25 条小鱼可获三星；P / Esc 暂停，手机也可点击底部按钮', understood: '明白了',
    loadingTitle: '正在把单车推到海边…', loading: '正在准备 3D 世界', errorTitle: '游戏启动遇到问题', errorHelp: '请使用支持 WebGL 的浏览器并启用硬件加速，然后刷新页面',
    contextLost: '3D 画面连接中断', contextHelp: '请刷新页面恢复游戏；已完成的关卡会保留',
    readError: '无法读取存档，本次将从海岸出发', writeError: '浏览器未允许保存进度，本次游玩不受影响', preferencesError: '浏览器未允许保存设置，刷新后将恢复默认设置',
    audioError: '浏览器无法启用音效', audioResume: '音效未能启动，请再次点击音效按钮',
    stageToast: '第 {number} 关 · {name}', firstTip: '← → 变道 · ↑ 跳跃 · ↓ 低头', rideTip: '保持节奏，向终点出发', shieldHit: '护盾挡住了碰撞', hit: '哎哟！还剩 {hp} 点体力', exhausted: '单车需要休息一下', pickup: '获得护盾 · 抵挡一次碰撞', finish: '终点',
  },
  en: {
    brand: 'Pelican Pedal', logo: 'A pelican riding a bicycle', title: 'Pelican Pedal Run · Free 3D Cycling Game',
    description: 'Ride with a pelican through Coral Coast, Jungle Ruins, Sunset Temple, Desert Dunes, Skull Island and the Bund in Shanghai; a free 3D cycling game with keyboard, touch and offline play',
    headline: ['Pelican', 'Pedal Run'], intro: ['A long beak, a little bike, a world to explore', 'Catch the sea breeze and see where it takes you'],
    routes: 'Choose your cycling route', locked: 'Locked', unlockHint: 'Complete the previous route to unlock', ready: 'Ready to ride',
    start: 'Let’s go for a ride', best: 'Personal best · {score}', journey: 'Twelve routes · One little bike', helpOpen: 'Your first ride? Start here',
    github: 'GitHub source repository (opens a new tab)', soundOn: 'Sound: on', soundOff: 'Sound: off', pause: 'Pause game',
    theme: 'Appearance', system: 'System', light: 'Light', dark: 'Dark', language: 'Language', switchLanguage: '切换到中文',
    canvas: 'Pelican cycling 3D game; use arrow keys to steer, up or space to jump, down to duck',
    hp: '{hp} health remaining', shield: 'Shield ready · Blocks one collision', move: 'Steer', jump: 'Jump', duck: 'Duck', space: 'Space', pauseShort: 'Pause', left: 'Steer left', right: 'Steer right',
    pauseTag: 'Take a little breather', pauseTitle: 'A moment by the road', pauseDesc: 'The scenery can wait; your ride is paused here', resume: 'Keep riding', restart: 'Restart this route', home: 'Back to the route map',
    allTag: 'The whole journey', wonTag: 'Route complete', lostTag: 'One more ride', allTitle: 'Twelve routes, all yours', wonTitle: 'A lovely place to arrive', lostTitle: 'Shake your wings, try again',
    allDesc: 'From Coral Coast to Dubai, you have ridden the whole journey; head back to the map and chase three stars on every route',
    wonDesc: 'Next stop unlocked: {name}; more fish and fresh scenery are waiting up ahead', lostDesc: 'Steer around tall crates, jump over low hurdles, and duck under blue bars; each retry starts at the beginning of this route',
    rideStat: 'Distance / m', fishStat: 'Fish collected', scoreStat: 'Route score', again: 'Ride the world again', next: 'On to the next stop', retry: 'Ride again',
    helpTag: 'Your first ride', helpTitle: 'Enjoy the ride, watch the road',
    helpRows: [['Change lanes', '← → / A D, or swipe left and right'], ['Jump obstacles', '↑ / W / Space, or swipe up; jump over low hurdles and steer around tall crates'], ['Duck under bars', '↓ / S, or swipe down; tuck that long beak under the blue bars'], ['Fish & shields', 'Golden fish add points; a teal ring protects you from one collision']],
    helpNote: 'You ride forward automatically; retry if your health runs out, and finish to unlock the next route; keep all 3 health and collect 25 fish for three stars; P / Esc pauses, or use the touch buttons on your phone', understood: 'Got it',
    loadingTitle: 'Wheeling the bike to the coast…', loading: 'Preparing your 3D world', errorTitle: 'The game could not start', errorHelp: 'Use a WebGL-compatible browser with hardware acceleration, then reload the page',
    contextLost: 'The 3D connection was lost', contextHelp: 'Reload to restore the game; completed routes are saved',
    readError: 'Your save could not be read; this ride starts at the coast', writeError: 'Your browser could not save progress; you can keep playing', preferencesError: 'Your browser could not save settings; defaults will return after a reload',
    audioError: 'Your browser could not start audio', audioResume: 'Audio could not resume; click the sound button again',
    stageToast: 'Route {number} · {name}', firstTip: '← → Steer · ↑ Jump · ↓ Duck', rideTip: 'Find your rhythm and ride to the finish', shieldHit: 'Your shield blocked the collision', hit: 'Ouch! {hp} health left', exhausted: 'This little bike needs a rest', pickup: 'Shield collected · Blocks one collision', finish: 'FINISH',
  },
};

for (const locale of ['zh', 'en']) Object.assign(messages[locale], upgradeMessages[locale], settingsMessages[locale]);

export function translate(locale, key, values = {}) {
  return messages[locale][key].replace(/\{(\w+)\}/g, (_, name) => String(values[name]));
}
