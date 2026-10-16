const { chromium } = require('playwright');
const { build } = require('esbuild');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const bundle = await build({ entryPoints: ['tests/browser-harness.ts'], bundle: true, write: false, format: 'iife' });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 850 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setContent(`<html><head><style>
    :root{--background-primary:#18191c;--background-secondary:#25262b;--text-normal:#ddd;--text-muted:#a4a4af;--text-accent:#b6a0f6;--tag-background:#353047;--background-modifier-border:#41434a;--font-interface:system-ui;--font-ui-small:12px;--font-ui-medium:14px;--font-text-size:16px;--line-height-normal:1.6;--interactive-accent:#b6a0f6}
    body{background:#18191c;color:#ddd;font-family:system-ui;margin:40px} #editor{width:760px;margin:0 auto} .cm-editor{font-size:16px;line-height:1.6} .cm-content{padding:10px 0;flex:0 1 520px;max-width:520px;min-width:0;width:100%} .cm-editor .cm-content .cm-line{padding:0 4px} button{color:inherit} h1{font-size:24px}
    ${fs.readFileSync('styles.css', 'utf8')}
    </style></head><body><h1>Margin Tags — editor test</h1><div id="editor" class="markdown-source-view mod-cm6"></div></body></html>`);
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.waitForFunction(() => document.querySelectorAll('.margin-tags-rail').length === 5);
    const more = page.locator('.margin-tags-more').first();
    await more.waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelector('.margin-tags-more').textContent !== '');
    await more.click();
    assert.equal(await page.locator('.margin-tags-popover').count(), 1);
    const hiddenTag = await page.locator('.margin-tags-popover a').first().textContent();
    await page.locator('.margin-tags-popover a').first().click();
    assert.deepEqual(await page.evaluate(() => window.harness.clicks), [hiddenTag]);
    assert.equal(await page.locator('.margin-tags-popover').count(), 0);
    assert.equal(await page.evaluate(() => window.harness.view.state.selection.main.head), 0);
    await more.click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.margin-tags-popover').count(), 0);
    await page.evaluate(() => window.harness.move('Prepare'));
    assert.equal(await page.locator('.margin-tags-rail').count(), 5); // first paragraph now inactive, launch active
    assert.ok(await page.locator('.cm-line').filter({ hasText: 'Prepare' }).textContent().then(t => t.includes('#long-tag')));
    await page.evaluate(() => window.harness.move('Its tags'));
    const paragraphLines = page.locator('.cm-line').filter({ hasText: 'This paragraph spans' });
    assert.ok((await paragraphLines.textContent()).includes('#research'));
    await page.evaluate(() => window.harness.move('Editing'));
    await page.evaluate(() => document.querySelector('#editor').style.width = '320px');
    await page.waitForFunction(() => document.querySelectorAll('.margin-tags-rail').length === 0);
    assert.ok((await page.locator('.cm-line').filter({ hasText: 'Prepare' }).textContent()).includes('#product'));
    await page.evaluate(() => document.querySelector('#editor').style.width = '760px');
    await page.waitForFunction(() => document.querySelectorAll('.margin-tags-rail').length === 5);
    const geometry = await page.evaluate(() => [...document.querySelectorAll('.margin-tags-rail')].map(root => {
      const rail = root.getBoundingClientRect();
      const line = root.closest('.cm-line').getBoundingClientRect();
      const scroller = root.closest('.cm-scroller');
      const right = scroller.getBoundingClientRect().left + scroller.clientLeft + scroller.clientWidth;
      return { left: rail.left, right: rail.right, lineRight: line.right, viewportRight: right,
        paddingRight: getComputedStyle(root.closest('.cm-line')).paddingRight };
    }));
    assert.ok(geometry.every(rail => rail.left >= rail.lineRight && rail.right <= rail.viewportRight
      && rail.paddingRight === '4px'), `Rails sit outside unpadded text and inside the viewport: ${JSON.stringify(geometry)}`);
    await page.evaluate(() => window.harness.reverse());
    await page.waitForFunction(() => document.querySelector('.margin-tags-more').title.startsWith('#long-tag'));
    await page.locator('.margin-tags-more').first().click();
    assert.equal(await page.locator('.margin-tags-popover a').first().textContent(), '#long-tag-that-needs-to-be-folded');
    await page.keyboard.press('Escape');
    await page.screenshot({ path: 'browser-check.png' });
    await page.evaluate(() => window.harness.sourceMode());
    assert.equal(await page.locator('.margin-tags-rail').count(), 0);
    await page.evaluate(() => window.harness.enable());
    await page.locator('.margin-tags-more').first().click();
    await page.evaluate(() => window.harness.disable());
    assert.equal(await page.locator('.margin-tags-popover').count(), 0);
    assert.equal(await page.locator('.margin-tags-rail').count(), 0);
    assert.equal(await page.evaluate(() => window.harness.view.state.doc.toString() === window.harness.source), true);
    const firstPaints = await page.evaluate(async () => {
      const samples = [];
      // Recreate inside widgets during a frame, as host redraws can do during
      // cursor movement. Inspect after microtasks, before another frame runs.
      for (let i = 0; i < 4; i++) {
        samples.push(await new Promise(resolve => requestAnimationFrame(() => {
          window.harness.inside();
          queueMicrotask(() => queueMicrotask(() => {
            const tag = [...document.querySelectorAll('.margin-tags-rail a')].find(a => a.textContent === '#done');
            const rail = tag.closest('.margin-tags-rail');
            const rect = tag.getBoundingClientRect();
            resolve({ left: rect.left, chipWidth: rect.width, laneWidth: rail.getBoundingClientRect().width,
              moreHidden: rail.querySelector('button').hidden });
          }));
        })));
      }
      return samples;
    });
    for (const sample of firstPaints) {
      assert.equal(sample.moreHidden, true, 'No empty overflow button before the first paint');
      assert.ok(Math.abs(sample.laneWidth - sample.chipWidth) <= 1, 'Inside lanes are compact before the first paint');
      assert.ok(Math.abs(sample.left - firstPaints[0].left) <= 1, 'Tag position stays stable across widget remounts');
    }
    await page.evaluate(() => window.harness.view.destroy());
    assert.deepEqual(errors, []);
    console.log('Browser checks passed: layout, overflow, clicks, Escape, active paragraphs, narrow panes, source mode, cleanup, unchanged source, first-paint stability.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
