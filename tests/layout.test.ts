import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MarginLayout, marginSpace } from '../src/editor';

test('Margin measurement dispatches after the editor update, and cancels on destruction', async () => {
  let measured: any;
  let disconnected = false;
  let right = 920;
  const changes: number[] = [];
  const view: any = {
    dom: { ownerDocument: { defaultView: {
      ResizeObserver: class { observe() {} disconnect() { disconnected = true; } },
      queueMicrotask,
    } } },
    contentDOM: { getBoundingClientRect: () => ({ right: 700 }) },
    scrollDOM: { getBoundingClientRect: () => ({ left: 0 }), clientLeft: 0, get clientWidth() { return right; } },
    requestMeasure: (request: any) => { measured = request; },
    dispatch: (transaction: any) => {
      assert.ok(transaction.effects.is(marginSpace));
      changes.push(transaction.effects.value);
    },
  };
  let gap = 12;
  const layout = new MarginLayout(view, () => gap);
  measured.write(measured.read(view));
  assert.deepEqual(changes, [], 'No nested editor update during the measurement write phase');
  await Promise.resolve();
  assert.deepEqual(changes, [200]);
  gap = 32;
  measured.write(measured.read(view));
  await Promise.resolve();
  assert.deepEqual(changes, [200, 180]);
  right = 740;
  measured.write(measured.read(view));
  await Promise.resolve();
  assert.deepEqual(changes, [200, 180, 0]);
  right = 920;
  measured.write(measured.read(view));
  layout.destroy();
  await Promise.resolve();
  assert.deepEqual(changes, [200, 180, 0]);
  assert.equal(disconnected, true);
});
