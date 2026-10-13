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
    body{background:#18191c;color:#ddd;font-family:system-ui;margin:40px} #editor{width:760px;margin:0 auto} .cm-editor{font-size:16px;line-height:1.6} .cm-content{padding:10px 0;flex:0 1 520px;max-width:520px;min-width:0;width:100%} .cm-line{padding:0 4px} button{color:inherit} h1{font-size:24px}
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
    const geometry = await page.evaluate(() => [...document.querySelectorAll('.margin-tags-rail')].every(root => {
      const rail = root.getBoundingClientRect();
      const line = root.closest('.cm-line').getBoundingClientRect();
      const scroller = root.closest('.cm-scroller');
      const right = scroller.getBoundingClientRect().left + scroller.clientLeft + scroller.clientWidth;
      return rail.left >= line.right && rail.right <= right
        && getComputedStyle(root.closest('.cm-line')).paddingRight === '4px';
    }));
    assert.ok(geometry, 'Rails sit outside unpadded text and inside the viewport');
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
    await page.evaluate(() => window.harness.view.destroy());
    assert.deepEqual(errors, []);
    console.log('Browser checks passed: layout, overflow, clicks, Escape, active paragraphs, narrow panes, source mode, cleanup, unchanged source.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
