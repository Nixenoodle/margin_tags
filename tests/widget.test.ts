import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { TagRail } from '../src/widget';

test('Overflow opens, searches, closes with Escape, and cleans up on widget destruction', async () => {
  const dom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true });
  const win = dom.window;
  let disconnected = false;
  win.ResizeObserver = class {
    observe() {} unobserve() {} disconnect() { disconnected = true; }
  } as any;
  win.HTMLElement.prototype.getBoundingClientRect = function () {
    const width = this.classList.contains('margin-tags-rail') ? 150 : (this.textContent?.length ?? 0) * 8 + 14;
    return { width, height: 24, left: 200, right: 200 + width, top: 20, bottom: 44, x: 200, y: 20, toJSON() {} };
  };
  const clicked: string[] = [];
  const widget = new TagRail(['#alpha', '#beta', '#gamma', '#delta'], 150, {
    href: tag => `obsidian://search?query=${encodeURIComponent(`tag:${tag}`)}`,
    search: tag => clicked.push(tag),
  });
  const root = widget.toDOM({ dom: win.document.body } as any);
  win.document.body.append(root);
  await new Promise(resolve => win.setTimeout(resolve, 40));
  const more = root.querySelector<HTMLButtonElement>('button')!;
  assert.equal(more.hidden, false);
  assert.equal(more.textContent, '+3');
  more.click();
  assert.equal(more.getAttribute('aria-expanded'), 'true');
  assert.equal(win.document.querySelectorAll('.margin-tags-popover a').length, 3);
  (win.document.querySelector('.margin-tags-popover a') as HTMLElement).click();
  assert.deepEqual(clicked, ['#beta']);
  assert.equal(win.document.querySelector('.margin-tags-popover'), null);
  more.click();
  win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(win.document.querySelector('.margin-tags-popover'), null);
  more.click();
  widget.destroy(root);
  assert.equal(disconnected, true);
  assert.equal(win.document.querySelector('.margin-tags-popover'), null);
  dom.window.close();
});
