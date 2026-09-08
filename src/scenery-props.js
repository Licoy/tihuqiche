import * as T from 'three';

// Scattered details use the existing primitive pool, with solid props outside the railings.
export function createSceneryProps({ box, orb, rod, mesh }) {
  function group(parent, name, position) {
    const g = new T.Group(); g.name = name; g.position.set(...position); parent.add(g); return g;
  }
  function boat(parent, x, z, wreck = false) {
    const g = group(parent, wreck ? 'shipwreck' : 'moored-boat', [x, -2.05, z]);
    orb(wreck ? '#715847' : '#dfb478', [0, .12, 0], [1.45, .6, 3.5], g);
    box('#534e43', [0, .45, 0], [2.1, .17, 5.3], g);
    for (const y of [-1.4, 1.4]) box('#d7bb86', [0, .7, y], [2.15, .15, .55], g);
    for (const side of [-1, 1]) rod('#aa7651', [side * 1.15, .5, -2.1], [side * 1.15, .5, wreck ? .9 : 2.1], { radius: .12, parent: g });
    rod('#765d45', [0, .5, 0], [wreck ? .6 : 0, 4.2, 0], { radius: .1, parent: g });
    if (wreck) {
      box('#554e4e', [.95, 3.7, 0], [1.5, .85, .06], g);
      for (const x of [.35, .9]) mesh('cone', '#ded4b5', { p: [x, 3.7, .07], s: [.13, .3, .05], parent: g });
      rod('#d8cda4', [0, .5, 2], [.6, 4.2, 0], { radius: .025, parent: g });
    } else {
      mesh('cone', '#fff1d6', { p: [.65, 2.35, 0], s: [1.1, 3.2, .08], r: [0, 0, -.18], parent: g });
      mesh('torus', '#e67952', { p: [1.3, .65, .6], s: [.48, .48, .48], r: [0, Math.PI / 2, 0], parent: g });
    }
  }
  function dock(parent, i) {
    const g = group(parent, 'coastal-dock', [-10, -1.45, 4]);
    for (let j = 0; j < 8; j++) box(j % 2 ? '#b99060' : '#cca675', [0, .3, j * .7 - 2.5], [6, .22, .62], g);
    for (const x of [-2.5, 2.5]) for (const z of [-2.4, 2.4]) {
      rod('#896c4e', [x, -1, z], [x, 1.3, z], { radius: .16, parent: g });
      mesh('torus', '#d9c69a', { p: [x, .9, z], s: [.25, .25, .25], r: [Math.PI / 2, 0, 0], parent: g });
    }
    rod('#d9c69a', [-2.5, 1, -2.4], [-2.5, 1, 2.4], { radius: .035, parent: g });
    boat(parent, -15.3, 4 + i % 2);
  }
  function beach(parent, i) {
    const g = group(parent, 'beach-umbrella', [12, -1.45, 6]);
    rod('#b8956b', [0, 0, 0], [0, 3.8, 0], { radius: .09, parent: g });
    mesh('cone', i % 2 ? '#e98765' : '#78bcb0', { p: [0, 3.6, 0], s: [2.7, 1.1, 2.7], parent: g });
    for (let j = 0; j < 6; j++) {
      const a = j * Math.PI / 3;
      rod('#fff0cf', [0, 4.15, 0], [Math.cos(a) * 2.55, 3.07, Math.sin(a) * 2.55], { radius: .065, parent: g });
    }
    for (const x of [-1, 1]) {
      box('#fff0cd', [x, .4, .1], [.75, .13, 2.4], g);
      const back = box('#e59a74', [x, .86, -.75], [.7, 1.2, .11], g); back.rotation.x = -.3;
      for (const z of [-.8, .8]) box('#826d52', [x, .15, z], [.65, .3, .09], g);
    }
    box('#e7b985', [2, .03, 1], [1.4, .05, 1.8], g);
    orb('#e98565', [2, .26, 1], [.25, .25, .25], g);
  }
  function fern(parent, x, z) {
    const g = group(parent, 'rainforest-fern', [x, -1.45, z]);
    orb('#547e60', [0, -.2, 0], [2.2, .45, 2], g);
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7;
      rod('#59976c', [0, 0, 0], [Math.sin(a) * 1.7, 1.5, Math.cos(a) * 1.7], { radius: .04, parent: g });
      const leaf = orb(i % 2 ? '#5da277' : '#327d5c', [Math.sin(a), 1, Math.cos(a)], [.38, .12, 1.6], g);
      leaf.rotation.set(-.6, a, 0);
    }
  }
  function jungle(parent, i) {
    fern(parent, 9, 7); fern(parent, -11, -8);
    const g = group(parent, 'jungle-fallen-log', [13, -1.45, -5]);
    rod('#785c40', [-2.4, .5, 0], [2.4, .5, 0], { radius: .55, parent: g });
    mesh('cylinder', '#c7a779', { p: [-2.42, .5, 0], s: [.47, .04, .47], r: [0, 0, Math.PI / 2], parent: g });
    for (let j = 0; j < 3; j++) {
      const x = j - 1;
      rod('#e4cf9a', [x, .85, .15], [x, 1.2 + j * .1, .15], { radius: .07, parent: g });
      orb('#d98558', [x, 1.2 + j * .1, .15], [.32, .12, .28], g);
    }
    if (i % 2 === 0) {
      const vines = group(parent, 'hanging-vines', [-12, -1.45, 1]);
      orb('#65845f', [0, -.35, 0], [3.4, .35, 2.2], vines);
      rod('#796344', [-2.5, 0, 0], [-2.5, 6.3, 0], { radius: .23, parent: vines });
      rod('#796344', [-2.5, 6.1, 0], [2.5, 6.1, 0], { radius: .15, parent: vines });
      for (const x of [-2, 0, 2]) {
        rod('#497b4e', [x, 6, 0], [x + .4, 3.1, .2], { radius: .045, parent: vines });
        for (const y of [3.2, 4.2, 5.2]) orb('#558f60', [x + .3, y, .2], [.26, .12, .47], vines);
      }
    }
  }
  function templeDetail(parent, i) {
    const g = group(parent, 'temple-carved-shrine', [12, -1.45, 6]);
    for (let j = 0; j < 3; j++) box(j % 2 ? '#c6a775' : '#ddc496', [0, j * .3 + .15, 0], [4.4 - j * .7, .3, 3.6 - j * .5], g);
    box('#b39972', [0, 2.1, 0], [1.4, 2.5, 1.5], g);
    box('#e0c697', [0, 3.55, 0], [2.2, .4, 2.2], g);
    for (const x of [-.35, .35]) box('#756e55', [x, 2.35, .77], [.22, .22, .05], g);
    box('#8c7658', [0, 1.75, .79], [.65, .13, .07], g);
    for (const side of [-1, 1]) {
      mesh('cylinder', '#857459', { p: [side * 1.65, 1.4, 0], s: [.35, 1.5, .35], parent: g });
      mesh('cone', '#cf985a', { p: [side * 1.65, 2.2, 0], s: [.55, .5, .55], r: [0, 0, Math.PI], parent: g });
      const flame = mesh('ico', '#ffbb66', { p: [side * 1.65, 2.65, 0], s: [.23, .6, .23], parent: g });
      flame.material = flame.material.clone(); flame.material.emissive.set('#f09640'); flame.material.emissiveIntensity = .8;
    }
    if (i % 2 === 0) {
      const flags = group(parent, 'temple-prayer-flags', [-10.5, -1.45, 7]);
      orb('#c5b18b', [0, -.35, 0], [3, .35, 2], flags);
      for (const x of [-2, 2]) rod('#927455', [x, 0, 0], [x, 3.6, 0], { radius: .08, parent: flags });
      rod('#d7b990', [-2, 3.3, 0], [2, 3.3, 0], { radius: .025, parent: flags });
      for (let j = 0; j < 5; j++) box(['#d0825d', '#d8ba70', '#668f83'][j % 3], [j * .7 - 1.4, 2.95, 0], [.48, .65, .06], flags);
    }
  }
  function cactus(parent, i) {
    const g = group(parent, 'desert-spiny-cactus', [-12, -1.45, -4]);
    orb('#dcb676', [0, -.45, 0], [4.7, .45, 4], g);
    rod('#527b51', [0, 0, 0], [0, 5.4 + i % 2, 0], { radius: .48, parent: g });
    orb('#719358', [0, 5.4 + i % 2, 0], [.48, .48, .48], g);
    for (const side of [-1, 1]) {
      const h = side === 1 ? 3.1 : 2.1;
      rod('#638657', [0, h, 0], [side * 1.6, h, 0], { radius: .3, parent: g });
      rod('#638657', [side * 1.6, h, 0], [side * 1.6, h + 1.7, 0], { radius: .3, parent: g });
      orb('#789963', [side * 1.6, h + 1.7, 0], [.3, .3, .3], g);
    }
    for (let j = 0; j < 5; j++) for (const side of [-1, 1]) {
      rod('#e6d49a', [side * .38, 1 + j * .8, .26], [side * .65, 1.18 + j * .8, .34], { radius: .025, parent: g });
    }
    mesh('ico', '#d98273', { p: [0, 5.8 + i % 2, 0], s: [.3, .22, .3], parent: g });
  }
  function boots(parent) {
    const g = group(parent, 'lost-desert-boots', [8.2, -1.45, 8]);
    for (const x of [-.4, .4]) {
      box('#574c40', [x, .1, .1], [.55, .18, 1], g);
      box('#a8794d', [x, .55, -.15], [.5, .9, .55], g);
      orb('#ba925d', [x, .3, .26], [.28, .23, .55], g);
      box('#674f3c', [x, 1.01, -.15], [.39, .05, .4], g);
      for (const y of [.4, .58, .76]) box('#d5bd83', [x, y, .14], [.3, .035, .045], g);
    }
  }
  function scorpion(parent) {
    const g = group(parent, 'desert-scorpion', [8, -1.45, -8]);
    orb('#765138', [0, .2, 0], [.45, .23, .75], g);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) rod('#8b633e', [side * .25, .15, i * .35 - .25], [side * .9, .05, i * .5 - .4], { radius: .055, parent: g });
      rod('#8b633e', [side * .25, .2, -.4], [side * .65, .25, -1], { radius: .09, parent: g });
      orb('#765138', [side * .65, .25, -1.15], [.19, .14, .26], g);
    }
    for (let i = 0; i < 4; i++) orb('#986c42', [0, .3 + i * .25, .6 + Math.sin(i * .8) * .45], [.17 - i * .02, .2, .17], g);
    mesh('cone', '#624c37', { p: [0, 1.15, .55], s: [.1, .45, .1], r: [Math.PI / 3, 0, 0], parent: g });
  }
  function treasure(parent) {
    const g = group(parent, 'pirate-treasure', [8.5, -1.45, 7]);
    box('#75503a', [0, .45, 0], [1.8, .9, 1.3], g);
    const lid = box('#956d42', [0, 1.2, -.5], [1.8, .2, 1.3], g); lid.rotation.x = -.7;
    for (const x of [-.6, .6]) box('#c79c58', [x, .48, .67], [.16, .96, .09], g);
    for (let i = 0; i < 5; i++) orb('#eac56b', [(i % 3 - 1) * .4, .86 + i % 2 * .08, .2], [.22, .09, .22], g);
    for (const x of [-1.3, 1.4]) {
      rod('#d8cfb0', [x, .08, -.5], [x + .3, .08, 1.1], { radius: .12, parent: g });
      orb('#e1d7b6', [x + .3, .08, 1.1], [.2, .17, .17], g);
    }
  }
  function addNature(parent, id, i) {
    if (id === 'coast') { if (i % 2 === 0) dock(parent, i); else beach(parent, i); }
    if (id === 'jungle') jungle(parent, i);
    if (id === 'temple') templeDetail(parent, i);
    if (id === 'desert') {
      if (i % 2 === 0) cactus(parent, i);
      if (i % 3 === 0) boots(parent);
      if (i % 3 === 1) scorpion(parent);
      orb('#e2c58e', [9.4, -1.75, 8], [2.8, .3, 2.5], parent);
    }
    if (id === 'skull') { if (i % 2 === 0) boat(parent, -12, 5, true); else treasure(parent); }
  }
  return { addNature };
}
