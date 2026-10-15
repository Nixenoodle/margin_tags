# Changes

## 0.1.4

- Add horizontal and vertical padding controls for margin tags and the expanded overflow panel. Preserve the original 7 px horizontal / 1 px vertical padding by default.
- Add a text-to-margin gap control, defaulting to 12 px; recalculate available margin space when it changes.
- Recalculate overflow after padding changes and allow enough line height for taller tags.

## 0.1.3

- Add **Keep inline-field tags inline**, enabled by default. Tags in `key:: value` lines and bracketed fields remain beside their field name.
- Support field lines within lists, tasks, and blockquotes. Ordinary tags outside field values still move to the margin.
- Apply the exemption regardless of the cursor-position setting; turning it off restores normal margin behavior for field tags.

## 0.1.2

- Add **Show tags inline while editing**. On preserves existing behavior; off keeps tags in the margin on active lines, paragraphs, and selections.
- Preserve the inline fallback when there is insufficient outside margin.
- Existing settings migrate with the new toggle enabled.

## 0.1.1

- Move the tag lane outside the text column and remove the width reservation from paragraphs.
- Measure the existing margin on resize. Keep tags inline when there is not enough space outside the text.
- Add Tag priority: Left to right (default) or Right to left. Priority controls display order and which tags remain visible before +N.
- Preserve existing saved settings and source Markdown.

## 0.1.0

- Initial Live Preview tag lane, paragraph/line editing scopes, expandable overflow, and tag search.
