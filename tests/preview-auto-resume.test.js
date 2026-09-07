import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewAutoResume } from '../src/preview-auto-resume.js';

test('drag holds pause, release resumes only after 10 seconds, new input resets the deadline', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const changes = [];
  const timer = createPreviewAutoResume({ delay: 10000, onAuto: value => changes.push(value) });
  timer.pause();
  t.mock.timers.tick(30000);
  assert.deepEqual(changes, [false]);
  timer.idle();
  t.mock.timers.tick(9999);
  assert.deepEqual(changes, [false]);
  timer.pause(); timer.idle();
  t.mock.timers.tick(9999);
  assert.deepEqual(changes, [false, false]);
  t.mock.timers.tick(1);
  assert.deepEqual(changes, [false, false, true]);
  timer.pause(); timer.idle();
  t.mock.timers.tick(5000);
  timer.pause();
  t.mock.timers.tick(30000);
  assert.equal(changes.at(-1), false);
});

test('hide, cancel or unmount clears pending resume and reuse starts a fresh deadline', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const changes = [];
  const timer = createPreviewAutoResume({ delay: 10000, onAuto: value => changes.push(value) });
  timer.pause(); timer.idle(); timer.clear(); timer.clear();
  t.mock.timers.tick(20000);
  assert.deepEqual(changes, [false]);
  timer.pause(); timer.idle();
  t.mock.timers.tick(10000);
  assert.deepEqual(changes, [false, false, true]);
});
