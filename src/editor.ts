import { StateEffect, StateField, type EditorState, type Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Decoration, EditorView, ViewPlugin, type ViewUpdate, type DecorationSet, type WidgetType } from '@codemirror/view';
import { collectBlocks, touchesSelection, prioritizeTags, availableMargin, inlineFieldRanges, tagFontSizeCss, type Block, type Settings, type Tag } from './model';

export const configure = StateEffect.define<Settings>();
export const marginSpace = StateEffect.define<number>();
export interface LaneIdentity { blockFrom: number; revision: number }
export const measuredLane = StateEffect.define<LaneIdentity & { width: number }>();
export interface Host {
  settings: Settings;
  isLivePreview(state: EditorState): boolean;
  widget(tags: string[], width: number, settings: Settings, measurement?: LaneIdentity): WidgetType;
}

/** Only accept tokens classified as hashtags by Obsidian's Markdown parser. */
export function readTags(state: EditorState): Tag[] {
  const spans: { from: number; to: number }[] = [];
  syntaxTree(state).iterate({ enter(node) {
    if (node.name.toLowerCase().includes('hashtag')) {
      spans.push({ from: node.from, to: node.to });
    }
  } });
  spans.sort((a, b) => a.from - b.from || a.to - b.to);
  const merged: { from: number; to: number }[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    // Merge the separate '#' and tag-name tokens, including nested nodes.
    if (last && span.from <= last.to && !state.sliceDoc(span.from, span.to).startsWith('#')) {
      last.to = Math.max(last.to, span.to);
    } else if (!last || span.from >= last.to) merged.push({ ...span });
  }
  return merged.map(r => ({ ...r, text: state.sliceDoc(r.from, r.to) }))
    .filter(r => r.text.startsWith('#') && r.text.length > 1 && !/\s/.test(r.text));
}

function sameBlocks(a: Block[], b: Block[]): boolean {
  return a === b || a.length === b.length && a.every((block, i) => {
    const other = b[i];
    return block.from === other.from && block.to === other.to
      && block.firstLine === other.firstLine && block.lastLine === other.lastLine
      && block.tags.length === other.tags.length && block.tags.every((tag, j) => {
        const otherTag = other.tags[j];
        return tag.from === otherTag.from && tag.to === otherTag.to && tag.text === otherTag.text;
      });
  });
}

export function createMarginField(host: Host) {
  function decorate(state: EditorState, blocks: Block[], settings: Settings, space: number, widths: Map<number, number>, revision: number): DecorationSet {
    if (!settings.enabled || !host.isLivePreview(state) || (settings.tagsOutside && space < 64)) return Decoration.none;
    const ranges: Range<Decoration>[] = [];
    const width = settings.tagsOutside ? Math.min(settings.width, space) : settings.width;
    const lane = settings.tagsOutside ? `${width}px` : `min(${width}px, 38%)`;
    const gap = settings.tagsOutside ? `${settings.marginGap}px` : `min(${settings.marginGap}px, 10%)`;
    const fieldRanges = new Map<number, { from: number; to: number }[]>();
    for (const block of blocks) {
      if (settings.showInlineWhileEditing && touchesSelection(block, state.selection)) continue;
      const tags = settings.keepInlineFieldTags ? block.tags.filter(tag => {
        const line = state.doc.lineAt(tag.from);
        let fields = fieldRanges.get(line.number);
        if (!fields) {
          fields = inlineFieldRanges(line.text);
          fieldRanges.set(line.number, fields);
        }
        return !fields.some(field => tag.from >= line.from + field.from && tag.to <= line.from + field.to);
      }) : block.tags;
      if (!tags.length) continue;
      for (const tag of tags) ranges.push(Decoration.replace({}).range(tag.from, tag.to));
      const measured = widths.get(block.from);
      const fittedLane = !settings.tagsOutside && measured !== undefined ? `min(${measured}px, ${lane})` : lane;
      const style = `--margin-tags-limit:${lane};--margin-tags-width:${fittedLane};--margin-tags-gap:${gap};--margin-tags-padding-y:${settings.tagPaddingY}px;--margin-tags-font-size:${tagFontSizeCss(settings.tagFontSize, settings.tagAutoPercent)}`;
      // Inside placement reserves the same lane on every source line of the block.
      // Only the anchor line needs widget positioning and minimum chip height.
      const lastLine = settings.tagsOutside ? block.firstLine : block.lastLine;
      for (let n = block.firstLine; n <= lastLine; n++) {
        const classes = [n === block.firstLine ? 'margin-tags-line' : '',
          settings.tagsOutside ? '' : 'margin-tags-inside-line'].filter(Boolean).join(' ');
        ranges.push(Decoration.line({ attributes: { class: classes, style } })
          .range(state.doc.line(n).from));
      }
      const names = prioritizeTags(tags.map(t => t.text), settings.priority);
      ranges.push(Decoration.widget({ widget: host.widget(names, width, settings, settings.tagsOutside ? undefined : { blockFrom: block.from, revision }), side: 1 })
        .range(state.doc.line(block.firstLine).to));
    }
    return Decoration.set(ranges, true);
  }
  return StateField.define<{
    settings: Settings; blocks: Block[]; space: number; widths: Map<number, number>; revision: number; decorations: DecorationSet;
  }>({
    create(state) {
      const settings = { ...host.settings };
      const blocks = collectBlocks(state.doc, readTags(state), settings.mode);
      const widths = new Map<number, number>();
      return { settings, blocks, space: 0, widths, revision: 0,
        decorations: decorate(state, blocks, settings, 0, widths, 0) };
    },
    update(value, tr) {
      let settings = value.settings;
      let space = value.space;
      for (const effect of tr.effects) {
        if (effect.is(configure)) settings = effect.value;
        if (effect.is(marginSpace)) space = effect.value;
      }
      const reparse = tr.docChanged || syntaxTree(tr.state) !== syntaxTree(tr.startState)
        || settings.mode !== value.settings.mode;
      const blocks = reparse ? collectBlocks(tr.state.doc, readTags(tr.state), settings.mode) : value.blocks;
      // Live Preview can refresh its syntax tree during cursor movement without
      // changing the tags. Keep compact widths and widget identities in that case.
      const reset = tr.docChanged || settings !== value.settings || !sameBlocks(blocks, value.blocks);
      const revision = reset ? value.revision + 1 : value.revision;
      let widths = reset ? new Map<number, number>() : value.widths;
      for (const effect of tr.effects) {
        if (!effect.is(measuredLane) || settings.tagsOutside) continue;
        const report = effect.value;
        if (report.revision !== revision || !Number.isFinite(report.width) || report.width < 0
          || !blocks.some(block => block.from === report.blockFrom)) continue;
        const width = Math.min(settings.width, Math.ceil(report.width));
        if (widths.get(report.blockFrom) === width) continue;
        if (widths === value.widths) widths = new Map(widths);
        widths.set(report.blockFrom, width);
      }
      if (reparse || tr.selection || settings !== value.settings || space !== value.space || widths !== value.widths
        || host.isLivePreview(tr.state) !== host.isLivePreview(tr.startState)) {
        return { settings, blocks, space, widths, revision, decorations: decorate(tr.state, blocks, settings, space, widths, revision) };
      }
      return value;
    },
    provide: field => EditorView.decorations.from(field, value => value.decorations),
  });
}

/** Measure only existing space beyond the text column; decorations never resize it. */
export class MarginLayout {
  private lastSpace = -1;
  private destroyed = false;
  private observer: ResizeObserver;
  constructor(readonly view: EditorView, private readonly getGap: () => number = () => 12) {
    this.observer = new view.dom.ownerDocument.defaultView!.ResizeObserver(() => this.measure());
    this.observer.observe(view.scrollDOM);
    this.observer.observe(view.contentDOM);
    this.measure();
  }
  update(update: ViewUpdate) {
    if (update.geometryChanged || update.viewportChanged || update.docChanged
      || update.transactions.some(tr => tr.effects.some(effect => effect.is(configure)))) this.measure();
  }
  private measure() {
    if (this.destroyed) return;
    this.view.requestMeasure({
      key: this,
      read: view => {
        const content = view.contentDOM.getBoundingClientRect();
        const scroll = view.scrollDOM;
        const right = scroll.getBoundingClientRect().left + scroll.clientLeft + scroll.clientWidth;
        return availableMargin(content.right, right, this.getGap());
      },
      write: space => {
        if (this.destroyed || space === this.lastSpace) return;
        this.lastSpace = space;
        // requestMeasure writes run inside a CodeMirror update. Dispatch afterwards.
        this.view.dom.ownerDocument.defaultView!.queueMicrotask(() => {
          if (!this.destroyed && this.lastSpace === space) {
            this.view.dispatch({ effects: marginSpace.of(space) });
          }
        });
      },
    });
  }
  destroy() { this.destroyed = true; this.observer.disconnect(); }
}
export function createMarginLayout(getGap: () => number) {
  return ViewPlugin.define(view => new MarginLayout(view, getGap));
}
export const marginLayout = createMarginLayout(() => 12);
