import type { Text, EditorSelection } from '@codemirror/state';

export interface Settings {
  mode: 'paragraph' | 'line';
  width: number;
  enabled: boolean;
  showInlineWhileEditing: boolean;
  keepInlineFieldTags: boolean;
  priority: 'left-to-right' | 'right-to-left';
}
export const DEFAULTS: Settings = { mode: 'paragraph', width: 200, enabled: true, showInlineWhileEditing: true, keepInlineFieldTags: true, priority: 'left-to-right' };
export function sanitizeSettings(raw: Partial<Settings> | null | undefined): Settings {
  return {
    mode: raw?.mode === 'line' ? 'line' : 'paragraph',
    width: typeof raw?.width === 'number' && Number.isFinite(raw.width)
      ? Math.max(80, Math.min(360, Math.round(raw.width))) : DEFAULTS.width,
    enabled: typeof raw?.enabled === 'boolean' ? raw.enabled : true,
    showInlineWhileEditing: typeof raw?.showInlineWhileEditing === 'boolean'
      ? raw.showInlineWhileEditing : true,
    keepInlineFieldTags: typeof raw?.keepInlineFieldTags === 'boolean'
      ? raw.keepInlineFieldTags : true,
    priority: raw?.priority === 'right-to-left' ? 'right-to-left' : 'left-to-right',
  };
}
export interface Tag { from: number; to: number; text: string }
export interface Block { from: number; to: number; firstLine: number; lastLine: number; tags: Tag[] }

function quoteDepth(text: string): number {
  return (text.match(/^\s*(?:>\s*)+/)?.[0].match(/>/g) ?? []).length;
}
function content(text: string): string { return text.replace(/^\s*(?:>\s*)+/, ''); }
function boundary(text: string): boolean {
  const s = content(text);
  return /^\s*$/.test(s) || /^\s*(?:#{1,6}(?:\s|$)|`{3,}|~{3,}|(?:[-*_]\s*){3,}$|\|)/.test(s);
}
function startsItem(text: string): boolean { return /^\s*(?:[-+*]|\d+[.)])\s+/.test(content(text)); }
function setext(text: string): boolean { return /^\s*(?:=+|-+)\s*$/.test(text); }

/** Conservative source-paragraph grouping; each new list item starts its own block. */
export function collectBlocks(doc: Text, tags: Tag[], mode: Settings['mode']): Block[] {
  const byLine = new Map<number, Tag[]>();
  for (const tag of tags) {
    const n = doc.lineAt(tag.from).number;
    if (!byLine.has(n)) byLine.set(n, []);
    byLine.get(n)!.push(tag);
  }
  const result: Block[] = [];
  let block: Block | null = null;
  let prev = '';
  for (let n = 1; n <= doc.lines; n++) {
    const line = doc.line(n);
    // Tables are kept inline: padding inside rendered cells corrupts their layout.
    const table = line.text.includes('|') && (
      /^\s*\|/.test(line.text) || /\|\s*:?-{3,}/.test(line.text)
      || (n < doc.lines && /\|\s*:?-{3,}/.test(doc.line(n + 1).text))
      || (n > 1 && /\|/.test(prev))
    );
    if (table) {
      if (block?.tags.length) result.push(block);
      block = null; prev = line.text; continue;
    }
    const split = mode === 'line' || !block || boundary(line.text) || boundary(prev)
      || startsItem(line.text) || quoteDepth(line.text) !== quoteDepth(prev)
      || setext(line.text) || setext(prev);
    if (split) {
      if (block?.tags.length) result.push(block);
      block = { from: line.from, to: line.to, firstLine: n, lastLine: n, tags: [] };
    }
    block!.to = line.to;
    block!.lastLine = n;
    if (!table) block!.tags.push(...(byLine.get(n) ?? []));
    prev = line.text;
  }
  if (block?.tags.length) result.push(block);
  return result;
}

export function touchesSelection(block: Pick<Block, 'from' | 'to'>, selection: EditorSelection): boolean {
  return selection.ranges.some(r => r.empty
    ? r.head >= block.from && r.head <= block.to
    : r.from <= block.to && r.to > block.from);
}

/** Fit an ordered prefix; reserve the measured +N button only when needed. */
export function visibleCount(widths: number[], available: number, overflowWidth: number, gap = 4): number {
  const total = widths.reduce((a, b) => a + b, 0) + Math.max(0, widths.length - 1) * gap;
  if (total <= available) return widths.length;
  let used = 0, count = 0;
  for (const width of widths) {
    if (used + width + gap + overflowWidth > available) break;
    used += width + gap;
    count++;
  }
  return count;
}

/** Prioritize before deduplication, so the nearest occurrence wins at either end. */
export function prioritizeTags(tags: string[], priority: Settings['priority']): string[] {
  return [...new Set(priority === 'right-to-left' ? [...tags].reverse() : tags)];
}

/** Leave a 12px gap and 8px edge clearance. Never take width from the text. */
export function availableMargin(contentRight: number, viewportRight: number): number {
  const space = Math.floor(viewportRight - contentRight - 12 - 8);
  return Number.isFinite(space) && space >= 64 ? Math.min(360, space) : 0;
}

/** Value ranges for key:: fields; offsets are local to one source line. */
export function inlineFieldRanges(text: string): { from: number; to: number }[] {
  // Whole-line fields, optionally in a quote, list, or task. A single ':' is not a field.
  const whole = text.match(/^\s*(?:>\s*)*(?:(?:[-+*]|\d+[.)])\s+(?:\[[ xX-]\]\s+)?)?(?:\*\*|__)?[\p{L}\p{N}_][\p{L}\p{N}_ /-]*?(?:\*\*|__)?\s*::(?!:)[ \t]*/u);
  if (whole) return [{ from: whole[0].length, to: text.length }];

  const result: { from: number; to: number }[] = [];
  const pattern = /[\[(](?:\*\*|__)?[\p{L}\p{N}_][\p{L}\p{N}_ /-]*?(?:\*\*|__)?\s*::(?!:)[ \t]*/gu;
  for (const match of text.matchAll(pattern)) {
    const start = match.index!;
    // An escaped bracket is ordinary prose.
    let backslashes = 0;
    for (let j = start - 1; j >= 0 && text[j] === '\\'; j--) backslashes++;
    if (backslashes % 2) continue;
    const from = start + match[0].length;
    const stack = [text[start] === '[' ? ']' : ')'];
    for (let i = from; i < text.length; i++) {
      const ch = text[i];
      if (ch === '\\') { i++; continue; }
      if (ch === '[' || ch === '(') stack.push(ch === '[' ? ']' : ')');
      else if (ch === stack[stack.length - 1]) {
        stack.pop();
        if (!stack.length) { result.push({ from, to: i }); break; }
      }
    }
  }
  return result;
}
