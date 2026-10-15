import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorState, EditorSelection, StateField, StateEffect, Text } from '@codemirror/state';
import { WidgetType } from '@codemirror/view';
import { createMarginField, readTags, configure, marginSpace } from '../src/editor';
import { collectBlocks, touchesSelection, visibleCount, sanitizeSettings, DEFAULTS, prioritizeTags, availableMargin } from '../src/model';
import { testLanguage } from './parser';

class Dummy extends WidgetType { toDOM(): HTMLElement { throw new Error('No DOM in state tests'); } }
const toggleLP = StateEffect.define<boolean>();
const lp = StateField.define({ create: () => true, update: (v, tr) => tr.effects.find(e => e.is(toggleLP))?.value ?? v });
const make = (doc: string, cursor = 0) => {
  const field = createMarginField({ settings: DEFAULTS, isLivePreview: s => s.field(lp), widget: () => new Dummy() });
  return { field, state: EditorState.create({ doc, selection: { anchor: cursor }, extensions: [testLanguage, lp, field, EditorState.allowMultipleSelections.of(true)] }).update({ effects: marginSpace.of(220) }).state };
};
test('Only parser-recognized tags, including split tokens, Unicode and nested names', () => {
  const { state } = make('intro\n\nHello #work/project #æble `#code`\n\n```\n#fenced\n```');
  assert.deepEqual(readTags(state).map(t => t.text), ['#work/project', '#æble']);
});
test('Moving into either line of a paragraph restores all its tags without changing Markdown', () => {
  const source = 'Cursor here\n\nText #alpha\ncontinued #beta\n\nOther #gamma';
  let { state, field } = make(source);
  assert.equal(state.field(field).blocks.length, 2);
  const initial = state.field(field).decorations.size;
  state = state.update({ selection: { anchor: source.indexOf('continued') + 2 } }).state;
  assert.ok(state.field(field).decorations.size < initial);
  assert.equal(state.field(field).decorations.size, 3); // one tag, line, widget for Other
  assert.equal(state.doc.toString(), source);
  state = state.update({ selection: { anchor: 0 } }).state;
  assert.equal(state.field(field).decorations.size, initial);
});
test('Multi-cursor and cross-block selections expose every touched block', () => {
  const source = 'Start\n\nOne #one\n\nTwo #two';
  let { state, field } = make(source);
  state = state.update({ selection: EditorSelection.create([
    EditorSelection.cursor(source.indexOf('One')), EditorSelection.cursor(source.indexOf('Two'))
  ]) }).state;
  assert.equal(state.field(field).decorations.size, 0);
  state = state.update({ selection: { anchor: source.indexOf('One'), head: source.length } }).state;
  assert.equal(state.field(field).decorations.size, 0);
});
test('Source mode and disabled plugin have no decorations', () => {
  let { state, field } = make('Start\n\nText #tag');
  assert.ok(state.field(field).decorations.size > 0);
  state = state.update({ effects: toggleLP.of(false) }).state;
  assert.equal(state.field(field).decorations.size, 0);
  state = state.update({ effects: [toggleLP.of(true), configure.of({ ...DEFAULTS, enabled: false })] }).state;
  assert.equal(state.field(field).decorations.size, 0);
});
test('Live settings switch grouping; document edits replace stale tag positions', () => {
  let { state, field } = make('Start\n\nA #one\nB #two');
  state = state.update({ effects: configure.of({ ...DEFAULTS, mode: 'line' }) }).state;
  assert.equal(state.field(field).blocks.length, 2);
  state = state.update({ changes: { from: state.doc.toString().indexOf('#one'), to: state.doc.toString().indexOf('#one') + 4, insert: '#new' } }).state;
  assert.deepEqual(state.field(field).blocks.flatMap(b => b.tags.map(t => t.text)), ['#new', '#two']);
});
test('Separate list items and headings; continuation belongs to its list item', () => {
  const { state, field } = make('Start\n\n- First #a\n  continuation #b\n- Second #c\n# Heading #d\nText #e');
  assert.deepEqual(state.field(field).blocks.map(b => b.tags.map(t => t.text)), [['#a', '#b'], ['#c'], ['#d'], ['#e']]);
});
test('Tables remain inline and are not padded as part of the preceding block', () => {
  const { state, field } = make('Start\n\nText #a\n| A #header | B |\n| --- | --- |\n| #cell | value |');
  assert.deepEqual(state.field(field).blocks.map(b => b.tags.map(t => t.text)), [['#a']]);
  assert.equal(state.field(field).blocks[0].firstLine, state.field(field).blocks[0].lastLine);
});
test('Overflow uses real widths and reserves the +N button', () => {
  assert.equal(visibleCount([40, 40, 40], 128, 28), 3);
  assert.equal(visibleCount([40, 40, 40], 127, 28), 2);
  assert.equal(visibleCount([300, 20], 120, 28), 0);
  assert.equal(visibleCount([], 120, 28), 0);
  assert.equal(visibleCount([50], 30, 28), 0);
});
test('Invalid saved settings are normalized', () => {
  assert.deepEqual(sanitizeSettings(null), DEFAULTS);
  assert.equal(sanitizeSettings({ width: Infinity }).width, 200);
  assert.equal(sanitizeSettings({ width: -100 }).width, 80);
  assert.equal(sanitizeSettings({ width: 900 }).width, 360);
});

test('Priority keeps the first or last tags first without mutating source order', () => {
  const tags = ['#a', '#b', '#c', '#a'];
  assert.deepEqual(prioritizeTags(tags, 'left-to-right'), ['#a', '#b', '#c']);
  assert.deepEqual(prioritizeTags(tags, 'right-to-left'), ['#a', '#c', '#b']);
  assert.deepEqual(tags, ['#a', '#b', '#c', '#a']);
  assert.equal(sanitizeSettings({ enabled: true, width: 150 }).priority, 'left-to-right');
  assert.equal(sanitizeSettings({ priority: 'right-to-left' }).priority, 'right-to-left');
});
test('Changing priority rebuilds widgets while preserving Markdown', () => {
  let latest: string[] = [];
  const doc = 'Start\n\nExample #a #b #c';
  const field = createMarginField({ settings: DEFAULTS, isLivePreview: () => true,
    widget: names => { latest = names; return new Dummy(); } });
  let state = EditorState.create({ doc, extensions: [testLanguage, field] })
    .update({ effects: marginSpace.of(220) }).state;
  assert.deepEqual(latest, ['#a', '#b', '#c']);
  state = state.update({ effects: configure.of({ ...DEFAULTS, priority: 'right-to-left' }) }).state;
  assert.deepEqual(latest, ['#c', '#b', '#a']);
  assert.equal(state.doc.toString(), doc);
});
test('Outside margin uses only spare width and falls back inline in narrow panes', () => {
  assert.equal(availableMargin(700, 920), 200);
  assert.equal(availableMargin(700, 740), 0);
  assert.equal(availableMargin(700, 1600), 360);
  assert.equal(availableMargin(700, 700), 0);
  assert.equal(availableMargin(700, 600), 0);
  let { state, field } = make('Start\n\nText #tag');
  const source = state.doc.toString();
  state.field(field).decorations.between(0, state.doc.length, (_from, _to, value) => {
    assert.ok(!/(^|;)\s*padding(?:-[a-z]+)?\s*:/.test(value.spec.attributes?.style ?? ''));
  });
  state = state.update({ effects: marginSpace.of(0) }).state;
  assert.equal(state.field(field).decorations.size, 0);
  assert.equal(state.doc.toString(), source);
  state = state.update({ effects: marginSpace.of(120) }).state;
  assert.equal(state.field(field).decorations.size, 3);
});

test('Active tags can stay in the margin or return inline in both editing scopes', () => {
  const source = 'Start\n\nOne #one\nContinued #two\n\nOther #three';
  for (const mode of ['paragraph', 'line'] as const) {
    let { state, field } = make(source);
    const settings = { ...DEFAULTS, mode, showInlineWhileEditing: false };
    state = state.update({ effects: configure.of(settings) }).state;
    const allInMargin = state.field(field).decorations.size;
    state = state.update({ selection: { anchor: source.indexOf('Continued') } }).state;
    assert.equal(state.field(field).decorations.size, allInMargin);
    state = state.update({ effects: configure.of({ ...settings, showInlineWhileEditing: true }) }).state;
    assert.ok(state.field(field).decorations.size < allInMargin);
    state = state.update({ effects: configure.of(settings), selection: { anchor: 0, head: source.length } }).state;
    assert.equal(state.field(field).decorations.size, allInMargin);
    assert.equal(state.doc.toString(), source);
    state = state.update({ effects: marginSpace.of(0) }).state;
    assert.equal(state.field(field).decorations.size, 0);
    state = state.update({ effects: [marginSpace.of(220), toggleLP.of(false)] }).state;
    assert.equal(state.field(field).decorations.size, 0);
  }
});

test('Inline editing toggle defaults on for old settings and preserves saved false', () => {
  assert.equal(sanitizeSettings({ width: 160 }).showInlineWhileEditing, true);
  const saved = JSON.parse(JSON.stringify({ ...DEFAULTS, showInlineWhileEditing: false }));
  assert.equal(sanitizeSettings(saved).showInlineWhileEditing, false);
  assert.equal(sanitizeSettings({ showInlineWhileEditing: 'false' } as any).showInlineWhileEditing, true);
});

test('Inline-field exemption keeps the supplied tags inline, with immediate toggle updates', () => {
  const source = 'Start\n\ntags:: #source/book #status/reading #processing';
  let { state, field } = make(source);
  assert.equal(state.field(field).decorations.size, 0);
  state = state.update({ effects: configure.of({ ...DEFAULTS, keepInlineFieldTags: false }) }).state;
  assert.equal(state.field(field).decorations.size, 5); // three replacements, line, rail
  state = state.update({ effects: configure.of({ ...DEFAULTS, showInlineWhileEditing: false }),
    selection: { anchor: source.indexOf('tags::') } }).state;
  assert.equal(state.field(field).decorations.size, 0); // exemption also wins on active lines
  assert.equal(state.doc.toString(), source);
});

test('Only field values are exempt; normal tags still use the margin in both scopes', () => {
  const source = 'Start\n\ntags:: #source/book\nOrdinary #outside\n\nBefore #normal [status:: #reading] after #later (topic:: #science)';
  for (const mode of ['line', 'paragraph'] as const) {
    let { state, field } = make(source);
    state = state.update({ effects: configure.of({ ...DEFAULTS, mode }) }).state;
    const hidden: string[] = [];
    state.field(field).decorations.between(0, source.length, (from, to) => {
      if (from < to) hidden.push(source.slice(from, to));
    });
    assert.deepEqual(hidden, ['#outside', '#normal', '#later']);
  }
});

test('Field recognition covers quotes, tasks, nested links, and excludes ordinary punctuation', () => {
  for (const line of ['  tags:: #one', '> tags:: #one', '- tags:: #one', '- [ ] tags:: #one',
    '> 1. tags:: #one', '**tags**:: #one', '[tags:: [[Book]] #one]', '(tags:: #one)']) {
    const { state, field } = make(`Start\n\n${line}`);
    assert.equal(state.field(field).decorations.size, 0, line);
  }
  for (const line of ['Tags: #one', 'ordinary #one', 'tags::: #one', '[tags:: #one', '\\[tags:: #one]']) {
    const { state, field } = make(`Start\n\n${line}`);
    assert.ok(state.field(field).decorations.size > 0, line);
  }
});

test('Field edits re-evaluate exemption and old settings default to preserving fields', () => {
  let { state, field } = make('Start\n\ntags:: #one');
  assert.equal(state.field(field).decorations.size, 0);
  const colon = state.doc.toString().indexOf('::');
  state = state.update({ changes: { from: colon, to: colon + 1 } }).state;
  assert.ok(state.field(field).decorations.size > 0);
  assert.equal(sanitizeSettings({ width: 160 }).keepInlineFieldTags, true);
  assert.equal(sanitizeSettings(JSON.parse(JSON.stringify({ ...DEFAULTS, keepInlineFieldTags: false }))).keepInlineFieldTags, false);
});

test('Spacing settings migrate, persist zeros, and reject invalid pixel values', () => {
  const old = sanitizeSettings({ width: 160 });
  assert.deepEqual([old.tagPaddingX, old.tagPaddingY, old.marginGap], [7, 1, 12]);
  const zero = sanitizeSettings({ tagPaddingX: 0, tagPaddingY: 0, marginGap: 0 });
  assert.deepEqual([zero.tagPaddingX, zero.tagPaddingY, zero.marginGap], [0, 0, 0]);
  const invalid = sanitizeSettings({ tagPaddingX: Infinity, tagPaddingY: -5, marginGap: 999 });
  assert.deepEqual([invalid.tagPaddingX, invalid.tagPaddingY, invalid.marginGap], [7, 0, 80]);
  assert.equal(availableMargin(700, 920, 32), 180);
  assert.equal(availableMargin(700, 920, 0), 212);
});
