# Changes

## 0.1.9

- Clarify the existing gap slider as **Distance from text**, retaining saved values and supporting zero extra gap.
- Add synchronized numeric inputs beside every slider, with Enter/blur to apply and Escape to cancel.
- Allow maximum margin width in one-pixel increments.

## 0.1.8

- Make inside tag lanes fit the actual displayed tag-group width. Maximum margin width now acts as a cap instead of reserving its full width for every paragraph.
- Include visible tags, inter-tag spacing, and the +N button in each measurement; share the compact width across the paragraph’s continuation lines.
- Recalculate on edits, appearance changes, and resizing; discard stale measurements and avoid feedback loops when lanes shrink.

## 0.1.7

- Add **Place tags outside text area**, enabled by default. Turn it off to place tags inside the right edge of the text column.
- Inside placement reserves space across all source lines in the tagged paragraph, capped at 38% for the lane plus 10% for the gap. It works without spare outside space.
- Preserve typography, overflow, field exemptions, and inline-editing settings in both placements.

## 0.1.6

- Add **Automatic font size percentage**, adjustable from 25–200% of the note font size, defaulting to the existing 78%.
- Apply the percentage to automatic tag sizing in the margin and overflow panel, including tagged-line height. Fixed pixel sizes remain unchanged.

## 0.1.5

- Add tag font family, automatic or 8–32 px font size, font weight (100–900, including Bold), italic, and underline settings.
- Apply typography to margin tags and overflow-panel tags; refresh widgets and overflow when settings change.
- Adjust minimum tagged-line height for the chosen font size and padding. Existing settings retain automatic sizing and regular styling.

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
