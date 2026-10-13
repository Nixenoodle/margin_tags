import { StateEffect, StateField, type EditorState, type Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Decoration, EditorView, ViewPlugin, type ViewUpdate, type DecorationSet, type WidgetType } from '@codemirror/view';
import { collectBlocks, touchesSelection, prioritizeTags, availableMargin, type Block, type Settings, type Tag } from './model';

export const configure = StateEffect.define<Settings>();
export const marginSpace = StateEffect.define<number>();
export interface Host {
  settings: Settings;
  isLivePreview(state: EditorState): boolean;
  widget(tags: string[], width: number): WidgetType;
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

export function createMarginField(host: Host) {
  function decorate(state: EditorState, blocks: Block[], settings: Settings, space: number): DecorationSet {
    if (!settings.enabled || !host.isLivePreview(state) || space < 64) return Decoration.none;
    const ranges: Range<Decoration>[] = [];
    const width = Math.min(settings.width, space);
    for (const block of blocks) {
      if (touchesSelection(block, state.selection)) continue;
      for (const tag of block.tags) ranges.push(Decoration.replace({}).range(tag.from, tag.to));
      ranges.push(Decoration.line({ attributes: {
        class: 'margin-tags-line',
        style: `--margin-tags-width:${width}px`,
      } }).range(state.doc.line(block.firstLine).from));
      const names = prioritizeTags(block.tags.map(t => t.text), settings.priority);
      ranges.push(Decoration.widget({ widget: host.widget(names, width), side: 1 })
        .range(state.doc.line(block.firstLine).to));
    }
    return Decoration.set(ranges, true);
  }
  return StateField.define<{
    settings: Settings; blocks: Block[]; space: number; decorations: DecorationSet;
  }>({
    create(state) {
      const settings = { ...host.settings };
      const blocks = collectBlocks(state.doc, readTags(state), settings.mode);
      return { settings, blocks, space: 0, decorations: decorate(state, blocks, settings, 0) };
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
      if (reparse || tr.selection || settings !== value.settings || space !== value.space
        || host.isLivePreview(tr.state) !== host.isLivePreview(tr.startState)) {
        return { settings, blocks, space, decorations: decorate(tr.state, blocks, settings, space) };
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
  constructor(readonly view: EditorView) {
    this.observer = new view.dom.ownerDocument.defaultView!.ResizeObserver(() => this.measure());
    this.observer.observe(view.scrollDOM);
    this.observer.observe(view.contentDOM);
    this.measure();
  }
  update(update: ViewUpdate) {
    if (update.geometryChanged || update.viewportChanged || update.docChanged) this.measure();
  }
  private measure() {
    if (this.destroyed) return;
    this.view.requestMeasure({
      key: this,
      read: view => {
        const content = view.contentDOM.getBoundingClientRect();
        const scroll = view.scrollDOM;
        const right = scroll.getBoundingClientRect().left + scroll.clientLeft + scroll.clientWidth;
        return availableMargin(content.right, right);
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
export const marginLayout = ViewPlugin.fromClass(MarginLayout);
