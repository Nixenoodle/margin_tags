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

test('Padding changes refresh widgets, affect overflow, and carry into the expanded panel', async () => {
  const dom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true });
  const win = dom.window;
  win.ResizeObserver = class { observe() {} disconnect() {} } as any;
  win.HTMLElement.prototype.getBoundingClientRect = function () {
    const rail = this.closest('.margin-tags-rail, .margin-tags-popover') as HTMLElement | null;
    const x = Number.parseFloat(rail?.style.getPropertyValue('--margin-tags-padding-x') || '7');
    const width = this.classList.contains('margin-tags-rail') ? 140
      : this.tagName === 'A' ? 16 + 2 * x : 30;
    return { width, height: 24, left: 200, right: 200 + width, top: 20, bottom: 44, x: 200, y: 20, toJSON() {} };
  };
  const actions = { href: (tag: string) => tag, search: () => {} };
  const compact = new TagRail(['#a', '#b', '#c'], 140, actions, 0, 0);
  const padded = new TagRail(['#a', '#b', '#c'], 140, actions, 24, 12);
  assert.equal(compact.eq(padded), false);
  assert.equal(padded.eq(new TagRail(['#a', '#b', '#c'], 140, actions, 24, 12)), true);
  const first = compact.toDOM({ dom: win.document.body } as any);
  win.document.body.append(first);
  await new Promise(resolve => win.setTimeout(resolve, 40));
  assert.equal(first.querySelector<HTMLButtonElement>('button')!.hidden, true);
  compact.destroy(first); first.remove();
  const second = padded.toDOM({ dom: win.document.body } as any);
  win.document.body.append(second);
  await new Promise(resolve => win.setTimeout(resolve, 40));
  assert.equal(second.style.getPropertyValue('--margin-tags-padding-x'), '24px');
  assert.equal(second.style.getPropertyValue('--margin-tags-padding-y'), '12px');
  const more = second.querySelector<HTMLButtonElement>('button')!;
  assert.equal(more.textContent, '+2');
  more.click();
  const panel = win.document.querySelector<HTMLElement>('.margin-tags-popover')!;
  assert.equal(panel.style.getPropertyValue('--margin-tags-padding-x'), '24px');
  assert.equal(panel.style.getPropertyValue('--margin-tags-padding-y'), '12px');
  padded.destroy(second);
  win.close();
});
