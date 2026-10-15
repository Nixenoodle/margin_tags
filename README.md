# Margin Tags

An Obsidian plugin inspired by Logseq DB’s tag layout. In Live Preview, tags move to the right margin while you read and, by default, return inline when you edit their paragraph.

## Features

- Tags appear outside the text column, preserving paragraph width.
- Toggle **Show tags inline while editing** off to keep tags in the margin even on the active line or paragraph. Turn it on to restore inline editing (the default). Source mode always shows the original tags.
- **Keep inline-field tags inline** (on by default) preserves tags in `tags:: #source/book #status/reading` and other `key:: value` fields, including `[key:: value]` and `(key:: value)`. Turn it off to allow those tags into the margin.
- Extra tags collapse into an expandable **+N** button.
- Choose **left-to-right** or **right-to-left** tag priority.
- Click a tag to open Obsidian’s tag search.
- Adjust the margin width, tag horizontal/vertical padding, and text-to-margin gap. Choose paragraph or line editing scope.

Your Markdown stays unchanged. When there isn’t enough margin space, tags remain inline.

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

Requires Obsidian 1.6 or later. A wide editor pane with **Readable line length** enabled provides room for the outside margin.

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
