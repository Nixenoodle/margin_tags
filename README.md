# Margin Tags

An Obsidian plugin inspired by Logseq DB’s tag layout. In Live Preview, tags move to the right margin while you read and, by default, return inline when you edit their paragraph.

## Features

- Tags appear outside the text column, preserving paragraph width.
- Toggle **Show tags inline while editing** off to keep tags in the margin even on the active line or paragraph. Turn it on to restore inline editing (the default). Source mode always shows the original tags.
- Extra tags collapse into an expandable **+N** button.
- Choose **left-to-right** or **right-to-left** tag priority.
- Click a tag to open Obsidian’s tag search.
- Adjust the margin width and choose paragraph or line editing scope.

Your Markdown stays unchanged. When there isn’t enough margin space, tags remain inline.

## Installation

1. Create a `margin-tags` folder inside your vault’s `.obsidian/plugins/` directory.
2. Copy `main.js`, `manifest.json`, and `styles.css` into it.
3. Restart Obsidian and enable **Margin Tags** under **Settings → Community plugins**.
4. Open a note in **Live Preview**. Configure the plugin under **Settings → Margin Tags**.

Requires Obsidian 1.6 or later. A wide editor pane with **Readable line length** enabled provides room for the outside margin.

## Development

```sh
npm ci
npm test
npm run typecheck
npm run build
```

## Made with AI

This plugin was created with AI using OpenAI’s ChatGPT/Codex, with human direction and testing in Obsidian. It is experimental, and feedback and contributions are welcome.

## License

MIT — see [LICENSE](LICENSE).
