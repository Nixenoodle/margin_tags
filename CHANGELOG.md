# Changes

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
