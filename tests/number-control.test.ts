import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { bindNumberControl } from '../src/number-control';

function fixture(min = 80, max = 360, initial = 200) {
  const { window } = new JSDOM('<input type="range"><input>');
  const [slider, input] = Array.from(window.document.querySelectorAll('input'));
  slider.min = String(min); slider.max = String(max); slider.step = '1';
  const saved: number[] = [];
  bindNumberControl(slider, input, min, max, initial, value => saved.push(value));
  return { slider, input, saved, fire: (element: HTMLInputElement, type: string) => element.dispatchEvent(new window.Event(type)),
    key: (key: string) => input.dispatchEvent(new window.KeyboardEvent('keydown', { key, cancelable: true })) };
}

test('slider and exact field synchronize, including widths between old ten-pixel steps', () => {
  const f = fixture();
  f.slider.value = '190'; f.fire(f.slider, 'input');
  assert.equal(f.input.value, '190');
  f.input.value = '197'; f.key('Enter'); f.fire(f.input, 'blur');
  assert.equal(f.slider.value, '197');
  assert.deepEqual(f.saved, [190, 197]);
});

test('typing is uninterrupted; commit clamps and rounds, blank restores, Escape cancels', () => {
  const f = fixture(25, 200, 78);
  f.input.value = '1'; f.fire(f.input, 'input');
  assert.equal(f.input.value, '1'); assert.deepEqual(f.saved, []);
  f.input.value = '125'; f.fire(f.input, 'change');
  f.input.value = ''; f.fire(f.input, 'blur'); assert.equal(f.input.value, '125');
  f.input.value = '12'; f.key('Enter'); assert.equal(f.input.value, '25');
  f.input.value = '999'; f.key('Enter'); assert.equal(f.input.value, '200');
  f.input.value = '90.6'; f.key('Enter'); assert.equal(f.input.value, '91');
  f.input.value = '42'; f.key('Escape'); assert.equal(f.input.value, '91');
  assert.deepEqual(f.saved, [125, 25, 200, 91]);
});

test('distance supports an explicit zero gap', () => {
  const f = fixture(0, 80, 12);
  f.input.value = '0'; f.fire(f.input, 'change');
  assert.equal(f.slider.value, '0'); assert.deepEqual(f.saved, [0]);
});
