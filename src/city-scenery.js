import * as T from 'three';
import { LEVELS } from './levels.js';

function createSailGeometry() {
  const vertices = [-.55, 1, -.1], indices = [], segments = 8, rows = 4;
  for (let row = 1; row <= rows; row++) {
    const t = row / rows;
    for (let i = 0; i <= segments; i++) {
      const angle = i * Math.PI / segments;
      vertices.push(-.55 * (1 - t) + Math.cos(angle) * t, 1 - t + Math.sin(t * Math.PI) * .12, -.1 + Math.sin(angle) * .9 * t);
    }
  }
  for (let i = 0; i < segments; i++) indices.push(0, i + 1, i + 2);
  for (let row = 0; row < rows - 1; row++) for (let i = 0; i < segments; i++) {
    const a = 1 + row * (segments + 1) + i, b = a + segments + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geometry = new T.BufferGeometry();
  geometry.name = 'pointed-city-sail';
  geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

// Static city scenery shares the world's primitives and is disposed with the world.
export function createCityScenery({ box, orb, rod, mesh }) {
  const roofGeometry = new T.CylinderGeometry(.62, 1, 1, 4);
  function tokyo(g) {
    g.name = 'tokyo-tower';
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      rod('#d95645', [x * 5, 0, z * 4], [x * 1.2, 20, z], { radius: .45, parent: g });
      rod('#f6e6cb', [x * 1.2, 20, z], [0, 31, 0], { radius: .24, parent: g });
    }
    for (let y = 4; y < 22; y += 4) {
      const width = 5 - y * .17;
      box(y % 8 ? '#f6e6cb' : '#d95645', [0, y, 0], [width * 2, .65, width * 1.6], g);
      for (const side of [-1, 1]) rod('#d95645', [-width, y, side * width * .8], [width - .65, y + 4, side * (width - .65) * .8], { radius: .16, parent: g });
    }
    box('#d95645', [0, 15, 0], [7, 2, 5.5], g);
    box('#f5edcf', [0, 15.2, 2.8], [5.8, .8, .15], g);
    for (const x of [-2.2, -1.1, 0, 1.1, 2.2]) box('#748b8c', [x, 15.2, 2.91], [.65, .5, .07], g);
    box('#f3d9b2', [0, 6.8, 0], [9, .35, 6.6], g);
    rod('#d95645', [0, 27, 0], [0, 35, 0], { radius: .15, parent: g });
  }

  function paris(g) {
    g.name = 'eiffel-tower';
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      rod('#89715c', [x * 6, 0, z * 4], [x * 2.7, 10, z * 1.9], { radius: .55, parent: g });
      rod('#89715c', [x * 2.7, 10, z * 1.9], [x * 1.1, 20, z * .8], { radius: .35, parent: g });
      rod('#89715c', [x * 1.1, 20, z * .8], [0, 30, 0], { radius: .22, parent: g });
    }
    for (const [y, width] of [[9, 8], [18, 4.5], [27, 2]]) box('#b7966d', [0, y, 0], [width, .8, width * .7], g);
    for (let y = 10; y < 25; y += 3) {
      const width = 3.3 - y * .1;
      for (const side of [-1, 1]) rod('#89715c', [-width, y, side * width * .7], [width - .3, y + 3, side * (width - .3) * .7], { radius: .12, parent: g });
    }
    rod('#89715c', [0, 29, 0], [0, 33, 0], { radius: .13, parent: g });
    mesh('torus', '#a08463', { p: [0, 3.3, 2.1], s: [3.4, 2.7, .7], parent: g });
    box('#89715c', [0, .35, 0], [13, .7, 9], g);
  }

  function london(g) {
    g.name = 'big-ben';
    box('#b9a47e', [0, 11, 0], [5, 22, 5], g);
    for (const x of [-2.25, 2.25]) box('#ddc59a', [x, 11, 2.6], [.45, 22, .5], g);
    for (let y = 3; y < 18; y += 3) for (const x of [-1.1, 1.1]) box('#655e52', [x, y, 2.55], [.5, 1.6, .12], g);
    box('#ddc59a', [0, 20, 0], [6.2, 4.5, 6.2], g);
    const clock = mesh('cylinder', '#fff0c9', { p: [0, 20, 3.2], s: [1.7, .12, 1.7], r: [Math.PI / 2, 0, 0], parent: g });
    clock.name = 'clock-face';
    rod('#4b5554', [0, 20, 3.3], [0, 21.2, 3.3], { radius: .085, parent: g });
    rod('#4b5554', [0, 20, 3.3], [1, 19.5, 3.3], { radius: .085, parent: g });
    mesh('torus', '#d4b982', { p: [0, 20, 3.3], s: [1.78, 1.78, .5], parent: g });
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      rod('#776e57', [Math.sin(angle) * 1.27, 20 + Math.cos(angle) * 1.27, 3.32], [Math.sin(angle) * 1.5, 20 + Math.cos(angle) * 1.5, 3.32], { radius: .04, parent: g });
    }
    mesh('cone', '#577471', { p: [0, 26, 0], s: [4, 7, 4], r: [0, Math.PI / 4, 0], parent: g });
    rod('#d9ba73', [0, 28, 0], [0, 32, 0], { radius: .17, parent: g });
  }

  function newyork(g) {
    g.name = 'statue-of-liberty';
    box('#b9a48b', [0, 3, 0], [7, 6, 6], g);
    box('#cbb999', [0, 6, 0], [8, 1, 7], g);
    box('#bba988', [0, .3, 0], [9, .6, 8], g);
    for (const x of [-2.2, 0, 2.2]) box('#887f6d', [x, 3, 3.05], [.8, 2.6, .1], g);
    mesh('cone', '#73a99b', { p: [0, 12, 0], s: [3.2, 12, 2.8], parent: g });
    orb('#73a99b', [0, 19, 0], [1.55, 2, 1.35], g);
    for (let i = 0; i < 7; i++) {
      const angle = (i - 3) * .4;
      rod('#73a99b', [Math.sin(angle), 20, .3], [Math.sin(angle) * 2.8, 20 + Math.cos(angle) * 2, .3], { radius: .13, parent: g });
    }
    rod('#73a99b', [1.2, 16, 0], [4, 24, 0], { radius: .65, parent: g });
    rod('#73a99b', [-1.2, 16, 0], [-2.1, 12, 1], { radius: .65, parent: g });
    box('#558c83', [-1.8, 12, 1.5], [2.2, 3.2, .6], g);
    for (const x of [-1.4, -.6, .3, 1.1]) rod('#589083', [x * 1.5, 6.8, 1.4], [x * .65, 15.1, 1], { radius: .1, parent: g });
    box('#c39753', [4, 24.5, 0], [2.2, 1, 2.2], g);
    const flame = orb('#ffd376', [4, 26, 0], [.85, 1.5, .85], g);
    flame.material = flame.material.clone(); flame.material.emissive.set('#e8b347'); flame.material.emissiveIntensity = .65;
  }

  const sailGeometry = createSailGeometry();
  function sydney(g) {
    g.name = 'sydney-opera-house';
    box('#c4a17c', [0, 1, 0], [22, 2, 11], g);
    for (let j = 0; j < 3; j++) box('#d4bd97', [0, .2 + j * .35, 6.2 - j * .45], [23 - j * .5, .35, .9], g);
    for (let i = 0; i < 5; i++) {
      const height = 7 + (2 - Math.abs(i - 2)) * 3;
      const sail = mesh(sailGeometry, i % 2 ? '#faf3dc' : '#e4e8de', { p: [(i - 2) * 3.5, 2, i % 2 ? -1.5 : 1], s: [4.5, height, 6], parent: g });
      // The open shell is visible from both sides as the camera moves along the harbour.
      sail.material = sail.material.clone(); sail.material.side = T.DoubleSide;
      box('#4f737d', [(i - 2) * 3.5, 2.8, 4], [2.8, 1.5, .2], g);
      for (const x of [-.8, 0, .8]) box('#d4d7c2', [(i - 2) * 3.5 + x, 2.8, 4.15], [.06, 1.5, .08], g);
    }
  }

  function dubai(g) {
    g.name = 'burj-khalifa';
    for (let i = 0; i < 7; i++) {
      const width = 8 - i;
      box(i % 2 ? '#8aacb6' : '#aec7ca', [i % 2 * .7, 2.5 + i * 5, 0], [width, 5.2, width * .75], g);
      box('#d4ddd5', [i % 2 * .7, 5 + i * 5, 0], [width + .25, .35, width * .75 + .25], g);
      for (const x of [-.3, .3]) box('#648b9c', [i % 2 * .7 + x * width, 2.5 + i * 5, width * .375 + .04], [.15, 4.7, .08], g);
    }
    rod('#dce2d8', [0, 34, 0], [0, 45, 0], { radius: .2, parent: g });
    box('#d1bd9d', [13, .5, 0], [9, 1, 9], g);
    const sail = mesh(sailGeometry, '#f4ead7', { p: [11, 1, 0], s: [6, 19, 4], r: [0, 0, -.13], parent: g });
    sail.material = sail.material.clone(); sail.material.side = T.DoubleSide;
    rod('#b3c6cb', [11, 1, 0], [11, 23, 0], { radius: .3, parent: g });
    for (const y of [4, 7, 10, 13]) box('#779ea5', [12.5, y, 1.4], [3.6, .18, .2], g);
    mesh('cylinder', '#c8d6ca', { p: [10.2, 18, 1], s: [2, .22, 2], parent: g });
  }

  function parkedVehicle(g, id, x) {
    const bus = id === 'london', height = bus ? 3.7 : 1.6;
    const platform = box(LEVELS.find(level => level.id === id).ground, [x, -1.9, 0], [4.4, .9, 8], g);
    platform.name = 'vehicle-platform';
    const vehicle = new T.Group(); vehicle.name = bus ? 'roadside-bus' : 'roadside-taxi'; g.add(vehicle);
    box(bus ? '#ca4949' : '#edbc46', [x, height / 2, 0], [2.8, height, 6], vehicle);
    for (const y of bus ? [1.4, 2.9] : [1.25]) {
      box('#83b1ba', [x, y, 3.04], [2.3, .7, .1], vehicle);
      for (const z of [-1.9, 0, 1.9]) box('#83b1ba', [x - Math.sign(x) * 1.43, y, z], [.1, .7, 1.1], vehicle);
    }
    for (const z of [-1.8, 1.8]) for (const side of [-1, 1]) mesh('cylinder', '#3e4d55', { p: [x + side * 1.35, .1, z], s: [.5, .25, .5], r: [0, 0, Math.PI / 2], parent: vehicle });
    if (!bus) box('#fff0a1', [x, 2, 0], [.9, .35, .7], vehicle);
    box('#536064', [x, .15, 3.07], [2.4, .2, .16], vehicle);
    for (const side of [-1, 1]) box('#ffe4b0', [x + side * .95, .52, 3.08], [.38, .25, .08], vehicle);
    box('#f2ddb8', [x, .6, 3.09], [.55, .22, .05], vehicle);
    vehicle.position.y = new T.Box3().setFromObject(platform).max.y - new T.Box3().setFromObject(vehicle).min.y;
  }

  function roadside(g, id, i) {
    const x = i % 2 ? -10 : 10;
    if (id === 'tokyo') {
      rod('#826651', [x, -1.4, 0], [x, 4, 0], { radius: .22, parent: g });
      for (const side of [-1, 1]) rod('#826651', [x, 2.5, 0], [x + side * 1.7, 4, 0], { radius: .12, parent: g });
      for (const side of [-1, 0, 1]) orb(side ? '#efa9bd' : '#f7c3d0', [x + side * 1.6, 4 + (side === 0 ? 1 : 0), 0], [2.2, 1.7, 2], g);
      for (const side of [-1, 1]) rod('#c45749', [-x + side * 1.5, -1.4, -4], [-x + side * 1.5, 4.5, -4], { radius: .2, parent: g });
      box('#d86754', [-x, 4.5, -4], [4.4, .5, .65], g);
      box('#454a50', [-x, 5, -4], [5, .25, .8], g);
      box('#a95344', [-x, 3.6, -4], [3.7, .22, .45], g);
      for (const side of [-1, 1]) {
        box('#776d5c', [-x + side * 1.5, -1.25, -4], [.75, .4, .75], g);
        rod('#564d48', [-x + side * .8, 3.65, -4], [-x + side * .8, 2.9, -4], { radius: .035, parent: g });
        orb('#e88e75', [-x + side * .8, 2.65, -4], [.29, .46, .29], g);
      }
    } else if (id === 'london' || id === 'newyork') {
      parkedVehicle(g, id, x);
    } else if (id === 'paris') {
      box('#cfbca5', [x, 2.6, 0], [4, 8, 4], g);
      mesh(roofGeometry, '#697a84', { p: [x, 7.4, 0], s: [3.1, 1.6, 3.1], r: [0, Math.PI / 4, 0], parent: g });
      box('#988974', [x + 1.1, 8.4, -.5], [.55, 1.6, .65], g);
      box('#6a7776', [x, -.35, 2.04], [.9, 2.1, .1], g);
      for (const y of [2.5, 4.3, 6]) for (const offset of [-1.1, 1.1]) {
        box('#76939c', [x + offset, y, 2.05], [.75, 1.2, .1], g);
        box('#dfcaa9', [x + offset, y + .67, 2.12], [.95, .13, .2], g);
      }
      for (let j = 0; j < 3; j++) box(['#537a9c', '#eee7d4', '#c96962'][j], [x + j - 1, 1.3, 2.3], [1, .35, 1.5], g);
      rod('#4d6261', [-x, -1.4, 0], [-x, 5.5, 0], { radius: .13, parent: g });
      orb('#ffdc91', [-x, 5.5, 0], [.6, .85, .6], g);
    } else {
      box(id === 'dubai' ? '#c6b299' : '#d2bb94', [x, -.6, 0], [5, 1.4, 5], g);
      rod('#ac8960', [x, 0, 0], [x + .5, 5, 0], { radius: .2, parent: g });
      for (let j = 0; j < 5; j++) mesh('sphere', '#52987b', { p: [x + .5, 5, 0], s: [.4, .18, 2.7], r: [.15, j * Math.PI / 5, 0], parent: g });
      if (id === 'sydney') {
        box('#f4e4c3', [-x, -1.5, 0], [1.8, .5, 4], g);
        rod('#8c755b', [-x, -1.3, 0], [-x, 3.5, 0], { radius: .07, parent: g });
        mesh('cone', '#fff1d7', { p: [-x + .55, 1, 0], s: [1.25, 4, .1], parent: g });
      } else {
        box('#9eb5ba', [-x, 4, 0], [4, 11, 4], g);
        for (const y of [0, 2, 4, 6, 8]) box('#698b95', [-x, y, 2.04], [3.6, .2, .1], g);
        for (const offset of [-1, 1]) box('#c0cecb', [-x + offset, 4, 2.1], [.1, 10.8, .1], g);
      }
    }
  }

  const landmarks = { tokyo, paris, london, newyork, sydney, dubai };
  function skyline(parent, id) {
    const g = new T.Group(); g.position.set(id === 'sydney' ? -24 : -21, -1.4, -115); parent.add(g);
    landmarks[id](g);
    if (id === 'sydney') g.scale.setScalar(1.25);
    if (id === 'dubai') g.scale.setScalar(.72);
    for (let i = 0; i < 6; i++) {
      const x = 13 + i * 9, height = 9 + i % 3 * 4;
      box(id === 'dubai' ? '#9cb5ba' : '#879ca2', [x, 3 + i % 3 * 2, -145], [5, height, 6], parent);
      for (const offset of [-1.3, 1.3]) box('#b4c2be', [x + offset, 3 + i % 3 * 2, -141.95], [.17, height - 1, .08], parent);
      box('#b5c3bb', [x, 7.7 + i % 3 * 4, -145], [4, .35, 5], parent);
    }
  }
  return { roadside, skyline };
}
