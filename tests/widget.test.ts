import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { TagRail } from '../src/widget';
import { DEFAULT_TYPOGRAPHY } from '../src/model';

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
  const typography = { tagFontFamily: 'Georgia, serif', tagFontSize: 20, tagAutoPercent: 120, tagFontWeight: 700, tagItalic: true, tagUnderline: true };
  const padded = new TagRail(['#a', '#b', '#c'], 140, actions, 24, 12, typography);
  assert.equal(compact.eq(padded), false);
  assert.equal(padded.eq(new TagRail(['#a', '#b', '#c'], 140, actions, 24, 12, typography)), true);
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
  for (const element of [second, panel]) {
    assert.equal(element.style.getPropertyValue('--margin-tags-font-family'), 'Georgia, serif');
    assert.equal(element.style.getPropertyValue('--margin-tags-font-size'), '20px');
    assert.equal(element.style.getPropertyValue('--margin-tags-font-weight'), '700');
    assert.equal(element.style.getPropertyValue('--margin-tags-font-style'), 'italic');
    assert.equal(element.style.getPropertyValue('--margin-tags-text-decoration'), 'underline');
  }
  for (const [key, value] of Object.entries(DEFAULT_TYPOGRAPHY)) {
    const changed = new TagRail(['#a', '#b', '#c'], 140, actions, 24, 12, { ...typography, [key]: value });
    assert.equal(padded.eq(changed), false, `${key} must refresh the rendered widget`);
  }
  padded.destroy(second);
  win.close();
});

test('Inside rails measure actual used width against the cap and expand again after narrowing', async () => {
  const dom = new JSDOM('<!doctype html><body><div class="cm-line"></div></body>', { pretendToBeVisual: true });
  const win = dom.window;
  let resized: () => void = () => {};
  win.ResizeObserver = class {
    constructor(callback: () => void) { resized = callback; }
    observe() {} unobserve() {} disconnect() {}
  } as any;
  let cap = 190, compact = 190;
  win.HTMLElement.prototype.getBoundingClientRect = function () {
    const width = this.classList.contains('margin-tags-rail')
      ? this.style.width === 'var(--margin-tags-limit)' ? cap : compact
      : this.tagName === 'A' ? (this.textContent === '#first' ? 60 : 70) : 30;
    return { width, height: 24, left: 200, right: 200 + width, top: 20, bottom: 44, x: 200, y: 20, toJSON() {} };
  };
  const reports: number[] = [];
  const widget = new TagRail(['#first', '#second'], 190, { href: t => t, search: () => {} },
    7, 1, DEFAULT_TYPOGRAPHY, { blockFrom: 0, revision: 1 });
  const view: any = { dom: win.document.body, contentDOM: win.document.body,
    dispatch: (tr: any) => { compact = tr.effects.value.width; reports.push(compact); } };
  const root = widget.toDOM(view);
  win.document.querySelector('.cm-line')!.append(root);
  const settle = () => new Promise(resolve => win.setTimeout(resolve, 40));
  await settle();
  assert.equal(compact, 134); // 60 + 4px gap + 70, not the full 190px cap
  resized(); await settle();
  assert.deepEqual(reports, [134]); // no shrinking feedback loop
  cap = 100; resized(); await settle();
  assert.equal(compact, 94); // first tag + gap + overflow button
  cap = 70; resized(); await settle();
  assert.equal(compact, 30); // only the overflow button
  cap = 190; resized(); await settle();
  assert.equal(compact, 134); // fits against the cap, not the previous 30px width
  assert.deepEqual(reports, [134, 94, 30, 134]);
  widget.destroy(root);
  win.close();
});

test('New and remounted rails fit before the first animation frame can paint them', async () => {
  const dom = new JSDOM('<!doctype html><body><div class="cm-line"></div></body>', { pretendToBeVisual: true });
  const win = dom.window;
  win.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any;
  // Do not run animation frames: initial sizing must finish before that paint.
  win.requestAnimationFrame = () => 1;
  let compact = 190;
  win.HTMLElement.prototype.getBoundingClientRect = function () {
    const width = this.classList.contains('margin-tags-rail')
      ? this.style.width === 'var(--margin-tags-limit)' ? 190 : compact
      : this.tagName === 'A' ? 50 : 30;
    return { width, height: 24, left: 200, right: 200 + width, top: 20, bottom: 44, x: 200, y: 20, toJSON() {} };
  };
  const view: any = { dom: win.document.body, contentDOM: win.document.body,
    dispatch: (tr: any) => { compact = tr.effects.value.width; } };
  for (let revision = 0; revision < 3; revision++) {
    compact = 190;
    const widget = new TagRail(['#flashcard', '#word'], 190, { href: t => t, search: () => {} },
      7, 1, DEFAULT_TYPOGRAPHY, { blockFrom: 0, revision });
    const root = widget.toDOM(view);
    win.document.querySelector('.cm-line')!.append(root);
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(compact, 104, 'The initial wide lane must shrink before the browser paints');
    assert.equal(root.querySelector<HTMLButtonElement>('button')!.hidden, true, 'No empty overflow button flashes');
    widget.destroy(root);
    root.remove();
  }
  win.close();
});
