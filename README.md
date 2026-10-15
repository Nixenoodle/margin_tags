# Margin Tags

An Obsidian plugin inspired by Logseq DB’s tag layout. In Live Preview, tags move to the right margin while you read and, by default, return inline when you edit their paragraph.

## Features

- Toggle **Place tags outside text area** on (default) to use the outside margin and preserve paragraph width. Turn it off to place tags inside the right edge of the text column, reserving space to avoid overlap.
- Toggle **Show tags inline while editing** off to keep tags in the margin even on the active line or paragraph. Turn it on to restore inline editing (the default). Source mode always shows the original tags.
- **Keep inline-field tags inline** (on by default) preserves tags in `tags:: #source/book #status/reading` and other `key:: value` fields, including `[key:: value]` and `(key:: value)`. Turn it off to allow those tags into the margin.
- Extra tags collapse into an expandable **+N** button.
- Choose **left-to-right** or **right-to-left** tag priority.
- Customize tag font family, size, weight (including bold), italic, and underline.
- Click a tag to open Obsidian’s tag search.
- Adjust the margin width, tag horizontal/vertical padding, and text-to-margin gap. Choose paragraph or line editing scope.

Your Markdown stays unchanged. In outside mode, tags remain inline when there isn’t enough margin space. Inside mode works without spare outer margin space.

## Installation

### Using BRAT

1. Install and enable [BRAT](https://github.com/TfTHacker/obsidian42-brat) from **Settings → Community plugins → Browse**.
2. Open BRAT’s settings and select **Add beta plugin**.
3. Enter `Nixenoodle/margin_tags`, select the latest release, and confirm the installation.
4. Enable **Margin Tags** under **Settings → Community plugins** if it is not already enabled.

### Manual installation

1. Create a `margin-tags` folder inside your vault’s `.obsidian/plugins/` directory.
2. Copy `main.js`, `manifest.json`, and `styles.css` into it.
3. Restart Obsidian and enable **Margin Tags** under **Settings → Community plugins**.
4. Open a note in **Live Preview**. Configure the plugin under **Settings → Margin Tags**.

Requires Obsidian 1.6 or later. A wide editor pane with **Readable line length** enabled provides room for the outside margin. Inside placement does not require that spare space.

## Tag typography

Under **Settings → Margin Tags**, set a font family installed on your device (for example, `Georgia` or `Arial`), or leave it blank to use Obsidian’s interface font. Comma-separated font fallback lists are supported; the plugin does not download fonts.

Choose **Automatic** sizing or **8–32 px**. When Automatic is selected, **Automatic font size percentage** controls the scale from **25–200%** of the note font size (default **78%**). At 100%, tags match the note font size; fixed pixel sizes ignore this percentage. Font weights range from **Thin (100)** to **Black (900)**; choose **Bold (700)** for bold tags. Italic and underline have separate toggles. Font rendering depends on the fonts available on each device.

These controls style margin tags and tags in the expanded overflow panel. Inline tags retain Obsidian’s styling. Larger text can push more tags into overflow and increases the tagged line’s minimum height to prevent overlap. Settings apply immediately and are saved automatically.

## Tag spacing

Under **Settings → Margin Tags**:

| Setting | Default | Range |
| --- | --- | --- |
| Tag horizontal padding | 7 px per side | 0–24 px |
| Tag vertical padding | 1 px per side | 0–12 px |
| Distance from text | 12 px | 0–80 px |

**Distance from text** controls how close the tags sit to the text column: lower values bring them closer, and 0 removes the extra gap. Your existing gap setting is preserved. Every slider has a numeric input beside it, including automatic font percentage, both padding settings, distance, and maximum width. Type an exact whole number and press Enter or leave the field to apply; values outside the supported range are clamped. Press Escape to cancel an unfinished edit.

Padding applies to tag chips in the margin and expanded overflow panel. The +N button stays compact. Larger horizontal padding causes tags to enter overflow sooner. Larger vertical padding increases the tagged line’s minimum height to avoid overlapping the next line. Outside placement uses the text-to-margin gap in existing spare space without reducing paragraph width. Inside placement measures each tag group and reserves only the width of its displayed tags (plus the overflow button when needed) and the configured gap. **Maximum margin width** is a cap, not a fixed reservation: a single short tag no longer takes up the full lane. The lane is also capped at 38% of the text column and the gap at 10%. Widths update after changes to tags, fonts, padding, or pane size. Changes apply immediately and are saved automatically.

## Tag spacing

Under **Settings → Margin Tags**:

| Setting | Default | Range |
| --- | --- | --- |
| Tag horizontal padding | 7 px per side | 0–24 px |
| Tag vertical padding | 1 px per side | 0–12 px |
| Text-to-margin gap | 12 px | 0–80 px |

Padding applies to tag chips in the margin and expanded overflow panel. The +N button stays compact. Larger horizontal padding causes tags to enter overflow sooner. Larger vertical padding increases the tagged line’s minimum height to avoid overlapping the next line. The text-to-margin gap uses existing outside space without reducing paragraph width. Changes apply immediately and are saved automatically.

## Development

```sh
npm ci
npm test
npm run typecheck
npm run build
```

For BRAT installation and updates, publish a GitHub release with `main.js`, `manifest.json`, and `styles.css` attached as individual release assets. Match the release tag to the version in `manifest.json`.

## Made with AI

This plugin was created with AI using OpenAI’s ChatGPT/Codex, with human direction and testing in Obsidian. It is experimental, and feedback and contributions are welcome.

## License

MIT — see [LICENSE](LICENSE).
