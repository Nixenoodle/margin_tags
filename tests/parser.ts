// A small test tokenizer emitting the same hashtag token names consumed by the extension.
// Obsidian's Markdown parser itself is host-provided and is not distributed in its API package.
import { StreamLanguage } from '@codemirror/language';
import { tags } from '@lezer/highlight';
export const testLanguage = StreamLanguage.define({
  startState: () => ({ code: false, tag: false }),
  token(stream, state) {
    if (stream.sol() && stream.match('```')) { state.code = !state.code; stream.skipToEnd(); return 'comment'; }
    if (state.code) { stream.skipToEnd(); return 'comment'; }
    if (stream.match(/`[^`]*`/)) return 'comment';
    if (state.tag) { state.tag = false; if (stream.match(/[\p{L}\p{N}_\/-]+/u)) return 'hashtag-end'; }
    if (stream.match(/#(?=[\p{L}_])/u)) { state.tag = true; return 'hashtag-begin'; }
    stream.next(); return null;
  },
  tokenTable: { 'hashtag-begin': tags.tagName, 'hashtag-end': tags.tagName }
});
