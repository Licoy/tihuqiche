import * as T from 'three';
import { LEVELS } from './levels.js';

export function createSceneryLife({ scene, box, orb, rod, mesh }) {
  const actors = LEVELS.map(() => []), signals = LEVELS.map(() => []), birds = [];
  const flock = new T.Group(); flock.name = 'ambient-birds'; scene.add(flock);
  let enabled = true, themeIndex = 0, lastTime = -1;
  let featherMaterial, wingMaterial;

  function bird(i) {
    const g = new T.Group(); g.name = 'flying-bird'; flock.add(g);
    const body = orb('#f8edcd', [0, 0, 0], [.22, .22, .62], g);
    if (!featherMaterial) featherMaterial = body.material.clone(); body.material = featherMaterial;
    const head = orb('#f8edcd', [0, .12, -.53], [.18, .18, .2], g); head.material = featherMaterial;
    mesh('cone', '#ddb56b', { p: [0, .1, -.8], s: [.09, .32, .09], r: [Math.PI / 2, 0, 0], parent: g });
    const wings = [];
    for (const side of [-1, 1]) {
      const hinge = new T.Group(); hinge.position.x = side * .13; g.add(hinge);
      const wing = orb('#d8e1d4', [side * .62, 0, .03], [.85, .055, .28], hinge);
      if (!wingMaterial) wingMaterial = wing.material.clone(); wing.material = wingMaterial;
      wings.push(hinge);
    }
    g.scale.setScalar(.8 + i % 3 * .2); g.rotation.y = -Math.PI / 2;
    g.traverse(node => { if (node.isMesh) node.castShadow = false; });
    birds.push({ g, wings, phase: i * 19.7, height: 9 + i % 3 * 3, depth: -48 - i % 4 * 18 });
  }
  for (let i = 0; i < 7; i++) bird(i);

  function pedestrian(parent, options) {
    const { index, x, z, phase, playing = false } = options;
    const g = new T.Group(); g.name = playing ? 'park-ball-player' : 'city-pedestrian';
    g.position.set(x, playing ? -1.25 : -1.45, z); parent.add(g);
    const shirt = ['#d78162', '#638db0', '#d3b866', '#79a684'][Math.floor(phase) % 4];
    box(shirt, [0, 1.05, 0], [.55, .68, .33], g);
    orb('#d9ad83', [0, 1.64, 0], [.24, .25, .23], g);
    orb('#554a40', [0, 1.79, .025], [.25, .13, .24], g);
    box('#e6c294', [0, 1.58, -.24], [.11, .11, .1], g);
    const legs = [], arms = [];
    for (const side of [-1, 1]) {
      const leg = new T.Group(); leg.position.set(side * .15, .7, 0); g.add(leg); legs.push(leg);
      rod('#586575', [0, 0, 0], [0, -.53, 0], { radius: .1, parent: leg });
      box('#514d44', [0, -.61, -.06], [.22, .18, .38], leg);
      const arm = new T.Group(); arm.position.set(side * .33, 1.31, 0); g.add(arm); arms.push(arm);
      rod(shirt, [0, 0, 0], [0, -.31, 0], { radius: .095, parent: arm });
      orb('#d9ad83', [0, -.46, 0], [.09, .17, .09], arm);
    }
    const actor = { g, legs, arms, x, z, phase, playing, kind: 'person' };
    actors[index].push(actor); return actor;
  }
  function bench(parent, x, z) {
    const g = new T.Group(); g.name = 'park-bench'; g.position.set(x, -1.25, z); parent.add(g);
    for (let j = 0; j < 3; j++) box('#b68d60', [0, .62, (j - 1) * .25], [2.8, .12, .19], g);
    for (const y of [.95, 1.2]) box('#b68d60', [0, y, .42], [2.8, .19, .12], g);
    for (const x of [-1, 1]) {
      for (const z of [-.25, .3]) rod('#4d6765', [x, 0, z], [x, .65, z], { radius: .065, parent: g });
      rod('#4d6765', [x, .35, .4], [x, 1.35, .4], { radius: .06, parent: g });
    }
  }
  function park(parent, index, i) {
    const lawn = box('#8ba779', [12.8, -1.35, 8], [10, .2, 7], parent); lawn.name = 'city-pocket-park';
    bench(parent, 15.7, 8.3);
    for (const z of [5.6, 10.4]) {
      box('#bd9b77', [17, -.92, z], [1.2, .66, 1.2], parent);
      orb('#5d9469', [17, -.36, z], [.8, .55, .8], parent);
      for (const x of [16.6, 17.3]) orb(i % 2 ? '#eaa488' : '#eacb6e', [x, -.03, z], [.16, .18, .16], parent);
    }
    pedestrian(parent, { index, x: 10.7, z: 6.3, phase: i + .4, playing: true });
    const second = pedestrian(parent, { index, x: 10.7, z: 9.7, phase: i + Math.PI, playing: true });
    second.g.rotation.y = Math.PI;
    const ball = orb('#e5ad63', [10.7, -.9, 8], [.28, .28, .28], parent); ball.name = 'park-bouncing-ball';
    actors[index].push({ kind: 'ball', g: ball, phase: i });
  }
  function setSignal(signal, active) {
    if (signal.active === active) return;
    signal.active = active; signal.g.userData.active = active;
    for (let i = 0; i < signal.bulbs.length; i++) {
      const bulb = signal.bulbs[i], on = i === active;
      bulb.material.color.setHex(on ? signal.colors[i] : 0x384845);
      bulb.material.emissiveIntensity = on ? 1.25 : 0;
    }
  }
  function trafficLight(parent, index, i) {
    const x = i % 2 ? -6.85 : 6.85, g = new T.Group(); g.name = 'traffic-light';
    g.position.set(x, -1.45, -9); parent.add(g);
    box('#8c9991', [0, .13, 0], [.6, .26, .6], g);
    rod('#4d605b', [0, .2, 0], [0, 3.8, 0], { radius: .09, parent: g });
    box('#344c49', [0, 3.02, .05], [.63, 1.72, .5], g);
    const colors = [0xe36455, 0xeab64b, 0x70c786], bulbs = [];
    for (let j = 0; j < 3; j++) {
      const bulb = orb(colors[j], [0, 3.56 - j * .54, .33], [.19, .19, .08], g);
      bulb.name = ['traffic-red', 'traffic-yellow', 'traffic-green'][j];
      bulb.material = bulb.material.clone(); bulb.material.emissive.setHex(colors[j]); bulbs.push(bulb);
      box('#344c49', [0, 3.79 - j * .54, .35], [.53, .07, .37], g);
    }
    const signal = { g, colors, bulbs, phase: i * .7, active: -1 };
    setSignal(signal, 2); signals[index].push(signal);
  }
  function addCity(parent, index, i) {
    if (i % 4 === 0) pedestrian(parent, { index, x: i % 8 ? -7.3 : 7.3, z: 6, phase: i });
    if (i % 4 === 1) trafficLight(parent, index, i);
    if (i % 4 === 2) park(parent, index, i);
  }
  function updateBirds(time) {
    for (let i = 0; i < birds.length; i++) {
      const bird = birds[i], flap = Math.sin(time * 5 + i * .8);
      bird.g.position.set((time * (2.4 + i % 2 * .6) + bird.phase) % 160 - 80, bird.height + Math.sin(time * .7 + i) * .7, bird.depth);
      bird.wings[0].rotation.z = -.18 - flap * .48;
      bird.wings[1].rotation.z = .18 + flap * .48;
      bird.g.rotation.z = Math.sin(time * .4 + i) * .07;
    }
  }
  function updatePeople(time) {
    const current = actors[themeIndex];
    for (let i = 0; i < current.length; i++) {
      const actor = current[i], phase = time * 3 + actor.phase;
      if (actor.kind === 'ball') {
        actor.g.position.y = -1 + Math.abs(Math.sin(phase)) * 1.1;
        actor.g.position.z = 8 + Math.sin(phase * .5) * 1.1;
        actor.g.rotation.x = phase; continue;
      }
      const stride = actor.playing ? Math.sin(phase) * .1 : Math.sin(phase) * .45;
      actor.legs[0].rotation.x = stride; actor.legs[1].rotation.x = -stride;
      actor.arms[0].rotation.x = actor.playing ? -.7 + Math.sin(phase) * .45 : -stride;
      actor.arms[1].rotation.x = actor.playing ? -.7 - Math.sin(phase) * .45 : stride;
      if (!actor.playing) {
        actor.g.position.z = actor.z + Math.sin(time * .4 + actor.phase) * 2;
        actor.g.rotation.y = Math.cos(time * .4 + actor.phase) > 0 ? Math.PI : 0;
      }
    }
  }
  function update(time) {
    if (!enabled || time === lastTime) return;
    lastTime = time; updateBirds(time); updatePeople(time);
    const current = signals[themeIndex];
    for (let i = 0; i < current.length; i++) {
      const phase = (time + current[i].phase) % 12;
      setSignal(current[i], phase < 6 ? 2 : phase < 8 ? 1 : 0);
    }
  }
  function setEnabled(value) {
    if (typeof value !== 'boolean') throw new TypeError('Ambient life setting must be boolean');
    if (value === enabled) return;
    enabled = value; flock.visible = value; lastTime = -1;
    for (let theme = 0; theme < actors.length; theme++) {
      for (let i = 0; i < actors[theme].length; i++) actors[theme][i].g.visible = value;
      if (!value) for (let i = 0; i < signals[theme].length; i++) setSignal(signals[theme][i], 2);
    }
  }
  function setTheme(index) {
    themeIndex = index; lastTime = -1;
    featherMaterial.color.set(index === 1 ? '#68a885' : index === 3 ? '#8d8169' : index === 4 ? '#85959a' : '#f8edcd');
    wingMaterial.color.set(index === 1 ? '#619c6e' : index === 3 || index === 4 ? '#53645e' : '#d8e1d4');
  }
  update(0);
  return { addCity, update, setEnabled, setTheme, flock };
}
