# Margin Tags

An Obsidian community plugin inspired by Logseq DB's tag presentation.

In **Live Preview**, inactive paragraphs show their tags in a compact lane on the right. Move the caret into a paragraph to restore its original inline tags for editing. The plugin changes the editor's presentation only: it never rewrites Markdown or moves tags inside your files.

## Install

1. Extract this archive. Copy the **margin-tags** folder into your vault's `.obsidian/plugins/` folder. The resulting paths must include `.obsidian/plugins/margin-tags/main.js`, `manifest.json`, and `styles.css`.
2. Restart Obsidian, or reload community plugins. In **Settings → Community plugins**, enable **Margin Tags**. Turn on community plugins if they are currently restricted.
3. Open a Markdown note in **Live Preview**. Inactive tagged paragraphs now show a right-hand tag lane. `DEMO.md` provides sample content you can copy into a note.

No build step is needed to install. Source code and tests are included for customization.

## Update from 0.1.0

Disable Margin Tags, replace `main.js`, `manifest.json`, and `styles.css` in the existing plugin folder with the files in this archive, then re-enable the plugin (or restart Obsidian). Keep your existing `data.json` to preserve settings. The new Tag priority setting defaults to Left to right.

## Behavior

- Click or move the caret into any line of a paragraph to reveal all its inline tags. Selecting multiple paragraphs reveals tags in every selected paragraph, including multiple cursors.
- Inactive paragraphs collect their tags **outside the text column**, beside their first source line. Paragraphs retain their full normal width; no right padding is added.
- The lane defaults to a maximum of **200 pixels**, limited by existing space between the text column and the editor’s right edge. A 12 px gap separates tags from text. If less than 64 px is available for tags, they remain inline. A wider pane with Obsidian’s **Readable line length** enabled generally provides more outside space. Visible tags are fitted using their rendered widths.
- **Tag priority** chooses which source tags are shown first: Left to right preserves `#a #b #c`; Right to left displays `#c #b #a`. This also decides which tags go into overflow. It never reorders your Markdown.
- When tags do not fit, **+N** shows how many remain. Click it to expand a floating panel containing the remaining clickable tags. Click outside, press Escape, click +N again, or use the close button to dismiss it.
- Clicking a tag opens Obsidian's built-in Search with `tag:#name`. Ctrl/Cmd-click or middle-click opens a search tab. The Search core plugin must be enabled.
- Repeated copies of the same tag appear once in a paragraph's lane; all occurrences remain in the source.
- Headings and successive list items are separate blocks. Ordinary continuation lines share their paragraph/list item's scope. Use **Line** mode for independent source-line behavior.
- Source mode and Reading view retain their normal appearance. Tags in rendered tables are kept inline. Frontmatter properties and code are not reinterpreted as inline tags.

## Settings

**Settings → Margin Tags** provides:

| Setting | Default | Effect |
| --- | --- | --- |
| Enable margin tags | On | Toggle the presentation without changing notes. |
| Editing scope | Paragraph | Choose paragraph/list-item or source-line grouping. |
| Tag priority | Left to right | Show first tags first, or choose Right to left for last tags first. |
| Maximum margin width | 200 px | Adjust from 80–360 px, bounded by the existing outside margin. |

The command palette also offers **Margin Tags: Toggle margin tags**.

## Compatibility and validation

Version **0.1.1**, targeting Obsidian **1.6+** and its CodeMirror 6 editor. Runtime dependencies are supplied by Obsidian; the plugin has no network calls, telemetry, or vault-writing code.

Completed checks:

- TypeScript type checking and production bundling.
- Fourteen automated tests covering margin measurement and cleanup, no-padding layout decorations, narrow-pane fallback, priority changes, settings migration, parser-token extraction, paragraph/list grouping, selections, mode changes, editing, overflow fitting, settings normalization, and the overflow panel's event handling and cleanup.
- Editor-state tests run against CodeMirror 6. DOM control tests use jsdom and deterministic dimensions.

**The original release was confirmed working by the user; this update still needs a live Obsidian check.** The test tokenizer mimics Obsidian's hashtag token names; it does not replace an integration test against Obsidian's bundled Markdown parser. A real-browser layout test is included, but could not run in the build environment because the Chromium download failed. Mobile, pop-out windows, custom themes, folding, and interaction with other editor plugins still need live-vault checks. Themes overriding line layout or other plugins replacing the same tags may require adjustments.

Paragraph grouping intentionally follows conservative source-line boundaries rather than implementing another Markdown parser. For unusual nested Markdown, choose Line mode. The plugin uses existing space beyond the text column; it does not manufacture a margin by shrinking the text. Third-party overrides of native tag-click behavior are not reproduced; tag activation uses built-in tag search.

### Suggested live-vault check

Open `DEMO.md` in Live Preview, move between its paragraphs and list items, select several paragraphs, toggle Tag priority, narrow the editor pane to check the inline fallback, widen it again, open +N, and click a tag. Confirm Search opens with the expected query. Switch to Source mode, then disable the plugin: the original Markdown should remain unchanged.

## Develop

Use Node.js 20 or later:

```sh
npm ci
npm test
npm run typecheck
npm run build
```

Optional real-browser layout/interaction test:

```sh
npx playwright install chromium --only-shell
npm run test:browser
```

This test uses a standalone CodeMirror editor and emits a local `browser-check.png`; it is not a full Obsidian integration test.

Files:

- `src/main.ts`: plugin lifecycle, settings, native Search integration.
- `src/editor.ts`: Live Preview decorations and parser-token extraction.
- `src/model.ts`: paragraph grouping, selection checks, width fitting.
- `src/widget.ts`: right-margin tags, overflow panel, accessibility and cleanup.
- `styles.css`: theme-aware styling scoped to this plugin.

Obsidian and CodeMirror packages remain external in the bundle, as required by Obsidian editor extensions.

API references:

- https://docs.obsidian.md/Plugins/Editor/Decorations
- https://docs.obsidian.md/Reference/TypeScript+API/editorLivePreviewField
- https://docs.obsidian.md/Reference/TypeScript+API/Workspace
- https://codemirror.net/docs/ref/

MIT licensed. This is an independent plugin, not an official Logseq or Obsidian product.
