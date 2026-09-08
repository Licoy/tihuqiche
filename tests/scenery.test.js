import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { LEVELS } from '../src/levels.js';
import { createModelPrimitives } from '../src/rider-primitives.js';
import { createScenery } from '../src/scenery.js';
import { createGameCamera } from '../src/game-camera.js';
import { initialGameState } from '../src/rules.js';

test('twelve routes preserve old progress indexes and provide complete city scenes', () => {
  assert.deepEqual(LEVELS.map(level => level.id), ['coast', 'jungle', 'temple', 'desert', 'skull', 'shanghai', 'tokyo', 'paris', 'london', 'newyork', 'sydney', 'dubai']);
  const scene = new T.Scene();
  const { decor, skyline } = createScenery({ scene, ...createModelPrimitives(scene) });
  assert.equal(decor.length, 11);
  for (const segment of decor) {
    assert.equal(segment.userData.themes.length, LEVELS.length);
    for (const theme of segment.userData.themes) {
      assert.ok(theme.children.length > 0, `${theme.name} has roadside scenery`);
      const bounds = new T.Box3().setFromObject(theme);
      assert.ok([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite));
    }
  }
  const landmarks = ['tokyo-tower', 'eiffel-tower', 'big-ben', 'statue-of-liberty', 'sydney-opera-house', 'burj-khalifa'];
  for (const [offset, name] of landmarks.entries()) {
    const city = skyline.userData.themes[offset + 6];
    const landmark = city.getObjectByName(name);
    assert.ok(landmark, `${city.name} has its landmark`);
    const bounds = new T.Box3().setFromObject(landmark);
    assert.ok(bounds.max.y - bounds.min.y >= 15, `${name} remains visible on the horizon`);
    assert.ok(bounds.max.z < -80, `${name} stays beyond the playable road`);
    assert.match(LEVELS[offset + 6].ground, /^#[\da-f]{6}$/i);
  }
  scene.traverse(object => {
    if (!object.isMesh) return;
    assert.ok(object.geometry.getAttribute('position').count > 0);
    assert.ok(object.material.isMeshStandardMaterial);
  });
});

test('city vehicles touch supporting platforms and pointed sail geometry is shared', () => {
  const scene = new T.Scene();
  const { decor } = createScenery({ scene, ...createModelPrimitives(scene) });
  for (const segment of decor) for (const [index, name] of [[8, 'roadside-bus'], [9, 'roadside-taxi']]) {
    const theme = segment.userData.themes[index];
    const platform = theme.getObjectByName('vehicle-platform');
    const ground = new T.Box3().setFromObject(platform);
    const vehicle = new T.Box3().setFromObject(theme.getObjectByName(name));
    assert.ok(Math.abs(vehicle.min.y - ground.max.y) < 1e-8, `${name} wheels meet the platform`);
    assert.ok(ground.min.x < vehicle.min.x && ground.max.x > vehicle.max.x);
    assert.ok(ground.min.z < vehicle.min.z && ground.max.z > vehicle.max.z);
    assert.ok(ground.max.x < -5.6 || ground.min.x > 5.6, 'platform stays outside the road railing');
    assert.equal(platform.material.color.getHexString(), LEVELS[index].ground.slice(1));
  }
  const sails = [];
  scene.traverse(node => { if (node.geometry?.name === 'pointed-city-sail') sails.push(node); });
  assert.equal(sails.length, 6);
  assert.ok(sails.every(sail => sail.geometry === sails[0].geometry));
  const positions = sails[0].geometry.attributes.position, peaks = [];
  for (let i = 0; i < positions.count; i++) if (positions.getY(i) === 1) peaks.push(i);
  assert.equal(peaks.length, 1, 'sails rise to one sharp point');
  assert.ok(positions.getX(peaks[0]) < -.5, 'the point leans to one side');
  assert.ok([...sails[0].geometry.attributes.normal.array].every(Number.isFinite));
});

test('Dubai spire fits the normal desktop game camera with top breathing room', () => {
  const width = Object.getOwnPropertyDescriptor(globalThis, 'innerWidth');
  const height = Object.getOwnPropertyDescriptor(globalThis, 'innerHeight');
  try {
    Object.defineProperty(globalThis, 'innerWidth', { value: 1280, configurable: true });
    Object.defineProperty(globalThis, 'innerHeight', { value: 720, configurable: true });
    const scene = new T.Scene();
    createScenery({ scene, ...createModelPrimitives(scene) });
    const camera = new T.PerspectiveCamera(48, 1280 / 720, .1, 340);
    const game = initialGameState(); game.mode = 'playing';
    const control = createGameCamera({ camera }, game, { wardrobeOpen: { value: false } });
    for (const x of [-3.4, 0, 3.4]) {
      game.players[0].x = x; control.updateCamera(10); camera.updateMatrixWorld(); scene.updateMatrixWorld(true);
      scene.getObjectByName('burj-khalifa').traverse(node => {
        if (!node.isMesh) return;
        const positions = node.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          const point = new T.Vector3().fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld).project(camera);
          const px = (point.x + 1) * 640, py = (1 - point.y) * 360;
          assert.ok(px >= 24 && px <= 1256 && py >= 24 && py <= 696, `Dubai vertex at ${px}, ${py}`);
        }
      });
    }
  } finally {
    if (width) Object.defineProperty(globalThis, 'innerWidth', width); else delete globalThis.innerWidth;
    if (height) Object.defineProperty(globalThis, 'innerHeight', height); else delete globalThis.innerHeight;
  }
});

test('each natural route has its requested details outside the playable lanes', () => {
  const scene = new T.Scene();
  const { decor } = createScenery({ scene, ...createModelPrimitives(scene) });
  const expected = [
    ['coastal-dock', 'moored-boat', 'beach-umbrella'],
    ['rainforest-fern', 'jungle-fallen-log', 'hanging-vines'],
    ['temple-carved-shrine', 'temple-prayer-flags'],
    ['desert-spiny-cactus', 'lost-desert-boots', 'desert-scorpion'],
    ['shipwreck', 'pirate-treasure'],
  ];
  for (const [index, names] of expected.entries()) for (const name of names) {
    const props = decor.map(segment => segment.userData.themes[index].getObjectByName(name)).filter(Boolean);
    assert.ok(props.length > 0, `${LEVELS[index].id} includes ${name}`);
    for (const prop of props) {
      const bounds = new T.Box3().setFromObject(prop);
      assert.ok(bounds.max.x < -6 || bounds.min.x > 6, `${name} leaves the road and railings clear`);
    }
  }
});

test('city life moves only with its clock, switches off completely and keeps a fixed scene graph', () => {
  const scene = new T.Scene();
  const { decor, life } = createScenery({ scene, ...createModelPrimitives(scene) });
  const graph = [], geometries = new Set(), materials = new Set();
  scene.traverse(node => { graph.push(node); if (node.geometry) geometries.add(node.geometry); if (node.material) materials.add(node.material); });
  const names = new Set(['city-pedestrian', 'park-ball-player', 'park-bouncing-ball', 'flying-bird']);
  const movers = graph.filter(node => names.has(node.name));
  const poses = () => movers.map(node => [node.visible, ...node.position.toArray(), ...node.rotation.toArray()]);
  const lamp = decor[1].userData.themes[5].getObjectByName('traffic-light');
  life.setTheme(5); life.update(0);
  assert.equal(lamp.userData.active, 2);
  const initial = poses(); life.update(5.5);
  assert.notDeepEqual(poses(), initial);
  assert.equal(lamp.userData.active, 1);
  const frozen = poses(); life.update(5.5); life.setEnabled(true); life.update(5.5);
  assert.deepEqual(poses(), frozen, 'paused clock and unchanged setting preserve every pose');
  life.update(8); assert.equal(lamp.userData.active, 0);
  life.setEnabled(false);
  assert.equal(life.flock.visible, false);
  assert.ok(movers.filter(node => node.name !== 'flying-bird').every(node => !node.visible));
  assert.equal(lamp.userData.active, 2, 'disabled traffic light stays green');
  const disabled = poses(); life.update(100); life.setEnabled(false); life.update(200);
  assert.deepEqual(poses(), disabled);
  assert.equal(lamp.userData.active, 2);
  life.setEnabled(true); life.update(201);
  assert.equal(life.flock.visible, true);
  assert.ok(movers.every(node => node.visible));
  for (let index = 0; index < LEVELS.length; index++) {
    life.setTheme(index);
    for (let tick = 0; tick < 120; tick++) life.update(tick / 60);
  }
  const after = []; scene.traverse(node => after.push(node));
  assert.deepEqual(after, graph, 'animation reuses the same nodes');
  assert.ok(after.every(node => !node.geometry || geometries.has(node.geometry)));
  assert.ok(after.every(node => !node.material || materials.has(node.material)));
  assert.throws(() => life.setEnabled('false'), /boolean/);
});

test('every city has grounded street life which remains outside the railings throughout animation', () => {
  const scene = new T.Scene();
  const { decor, life } = createScenery({ scene, ...createModelPrimitives(scene) });
  const names = ['city-pedestrian', 'park-ball-player', 'park-bouncing-ball', 'park-bench', 'city-pocket-park', 'traffic-light'];
  for (let index = 5; index < LEVELS.length; index++) {
    life.setTheme(index);
    for (const name of names) assert.ok(decor.some(segment => segment.userData.themes[index].getObjectByName(name)), `${LEVELS[index].id} includes ${name}`);
    for (const time of [0, .7, 3, 6, 9]) {
      life.update(time);
      for (const segment of decor) segment.userData.themes[index].traverse(node => {
        if (!names.includes(node.name)) return;
        const bounds = new T.Box3().setFromObject(node);
        assert.ok(bounds.max.x < -6 || bounds.min.x > 6, `${node.name} remains outside the road`);
        assert.ok(bounds.min.y >= -1.56, `${node.name} stays on the riverside surface`);
      });
    }
  }
});
