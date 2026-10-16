/* Margin Tags v0.1.9 | MIT License | See src/ for editable source. */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => MarginTagsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var import_view3 = require("@codemirror/view");

// src/editor.ts
var import_state = require("@codemirror/state");
var import_language = require("@codemirror/language");
var import_view = require("@codemirror/view");

// src/model.ts
var DEFAULT_TYPOGRAPHY = {
  tagFontFamily: "",
  tagFontSize: 0,
  tagAutoPercent: 78,
  tagFontWeight: 400,
  tagItalic: false,
  tagUnderline: false
};
function tagFontSizeCss(size, percent = 78) {
  return size === 0 ? `calc(var(--font-text-size, 16px) * ${percent / 100})` : `${size}px`;
}
var DEFAULTS = { ...DEFAULT_TYPOGRAPHY, mode: "paragraph", width: 200, tagPaddingX: 7, tagPaddingY: 1, marginGap: 12, enabled: true, tagsOutside: true, showInlineWhileEditing: true, keepInlineFieldTags: true, priority: "left-to-right" };
function boundedPixels(value, fallback, maximum) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(maximum, Math.round(value))) : fallback;
}
function sanitizeSettings(raw) {
  return {
    tagFontFamily: typeof raw?.tagFontFamily === "string" && !/[;{}<>]/.test(raw.tagFontFamily) ? raw.tagFontFamily.trim().slice(0, 200) : "",
    tagFontSize: typeof raw?.tagFontSize === "number" && Number.isFinite(raw.tagFontSize) && raw.tagFontSize !== 0 ? Math.max(8, Math.min(32, Math.round(raw.tagFontSize))) : 0,
    tagAutoPercent: typeof raw?.tagAutoPercent === "number" && Number.isFinite(raw.tagAutoPercent) ? Math.max(25, Math.min(200, Math.round(raw.tagAutoPercent))) : 78,
    tagFontWeight: typeof raw?.tagFontWeight === "number" && Number.isFinite(raw.tagFontWeight) ? Math.max(100, Math.min(900, Math.round(raw.tagFontWeight / 100) * 100)) : 400,
    tagItalic: raw?.tagItalic === true,
    tagUnderline: raw?.tagUnderline === true,
    mode: raw?.mode === "line" ? "line" : "paragraph",
    width: typeof raw?.width === "number" && Number.isFinite(raw.width) ? Math.max(80, Math.min(360, Math.round(raw.width))) : DEFAULTS.width,
    tagPaddingX: boundedPixels(raw?.tagPaddingX, DEFAULTS.tagPaddingX, 24),
    tagPaddingY: boundedPixels(raw?.tagPaddingY, DEFAULTS.tagPaddingY, 12),
    marginGap: boundedPixels(raw?.marginGap, DEFAULTS.marginGap, 80),
    tagsOutside: typeof raw?.tagsOutside === "boolean" ? raw.tagsOutside : true,
    enabled: typeof raw?.enabled === "boolean" ? raw.enabled : true,
    showInlineWhileEditing: typeof raw?.showInlineWhileEditing === "boolean" ? raw.showInlineWhileEditing : true,
    keepInlineFieldTags: typeof raw?.keepInlineFieldTags === "boolean" ? raw.keepInlineFieldTags : true,
    priority: raw?.priority === "right-to-left" ? "right-to-left" : "left-to-right"
  };
}
function quoteDepth(text) {
  return (text.match(/^\s*(?:>\s*)+/)?.[0].match(/>/g) ?? []).length;
}
function content(text) {
  return text.replace(/^\s*(?:>\s*)+/, "");
}
function boundary(text) {
  const s = content(text);
  return /^\s*$/.test(s) || /^\s*(?:#{1,6}(?:\s|$)|`{3,}|~{3,}|(?:[-*_]\s*){3,}$|\|)/.test(s);
}
function startsItem(text) {
  return /^\s*(?:[-+*]|\d+[.)])\s+/.test(content(text));
}
function setext(text) {
  return /^\s*(?:=+|-+)\s*$/.test(text);
}
function collectBlocks(doc, tags, mode) {
  const byLine = /* @__PURE__ */ new Map();
  for (const tag of tags) {
    const n = doc.lineAt(tag.from).number;
    if (!byLine.has(n)) byLine.set(n, []);
    byLine.get(n).push(tag);
  }
  const result = [];
  let block = null;
  let prev = "";
  for (let n = 1; n <= doc.lines; n++) {
    const line = doc.line(n);
    const table = line.text.includes("|") && (/^\s*\|/.test(line.text) || /\|\s*:?-{3,}/.test(line.text) || n < doc.lines && /\|\s*:?-{3,}/.test(doc.line(n + 1).text) || n > 1 && /\|/.test(prev));
    if (table) {
      if (block?.tags.length) result.push(block);
      block = null;
      prev = line.text;
      continue;
    }
    const split = mode === "line" || !block || boundary(line.text) || boundary(prev) || startsItem(line.text) || quoteDepth(line.text) !== quoteDepth(prev) || setext(line.text) || setext(prev);
    if (split) {
      if (block?.tags.length) result.push(block);
      block = { from: line.from, to: line.to, firstLine: n, lastLine: n, tags: [] };
    }
    block.to = line.to;
    block.lastLine = n;
    if (!table) block.tags.push(...byLine.get(n) ?? []);
    prev = line.text;
  }
  if (block?.tags.length) result.push(block);
  return result;
}
function touchesSelection(block, selection) {
  return selection.ranges.some((r) => r.empty ? r.head >= block.from && r.head <= block.to : r.from <= block.to && r.to > block.from);
}
function visibleCount(widths, available, overflowWidth, gap = 4) {
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
function prioritizeTags(tags, priority) {
  return [...new Set(priority === "right-to-left" ? [...tags].reverse() : tags)];
}
function availableMargin(contentRight, viewportRight, gap = 12) {
  const space = Math.floor(viewportRight - contentRight - gap - 8);
  return Number.isFinite(space) && space >= 64 ? Math.min(360, space) : 0;
}
function inlineFieldRanges(text) {
  const whole = text.match(/^\s*(?:>\s*)*(?:(?:[-+*]|\d+[.)])\s+(?:\[[ xX-]\]\s+)?)?(?:\*\*|__)?[\p{L}\p{N}_][\p{L}\p{N}_ /-]*?(?:\*\*|__)?\s*::(?!:)[ \t]*/u);
  if (whole) return [{ from: whole[0].length, to: text.length }];
  const result = [];
  const pattern = /[\[(](?:\*\*|__)?[\p{L}\p{N}_][\p{L}\p{N}_ /-]*?(?:\*\*|__)?\s*::(?!:)[ \t]*/gu;
  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    let backslashes = 0;
    for (let j = start - 1; j >= 0 && text[j] === "\\"; j--) backslashes++;
    if (backslashes % 2) continue;
    const from = start + match[0].length;
    const stack = [text[start] === "[" ? "]" : ")"];
    for (let i = from; i < text.length; i++) {
      const ch = text[i];
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === "[" || ch === "(") stack.push(ch === "[" ? "]" : ")");
      else if (ch === stack[stack.length - 1]) {
        stack.pop();
        if (!stack.length) {
          result.push({ from, to: i });
          break;
        }
      }
    }
  }
  return result;
}

// src/editor.ts
var configure = import_state.StateEffect.define();
var marginSpace = import_state.StateEffect.define();
var measuredLane = import_state.StateEffect.define();
function readTags(state) {
  const spans = [];
  (0, import_language.syntaxTree)(state).iterate({ enter(node) {
    if (node.name.toLowerCase().includes("hashtag")) {
      spans.push({ from: node.from, to: node.to });
    }
  } });
  spans.sort((a, b) => a.from - b.from || a.to - b.to);
  const merged = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span.from <= last.to && !state.sliceDoc(span.from, span.to).startsWith("#")) {
      last.to = Math.max(last.to, span.to);
    } else if (!last || span.from >= last.to) merged.push({ ...span });
  }
  return merged.map((r) => ({ ...r, text: state.sliceDoc(r.from, r.to) })).filter((r) => r.text.startsWith("#") && r.text.length > 1 && !/\s/.test(r.text));
}
function sameBlocks(a, b) {
  return a === b || a.length === b.length && a.every((block, i) => {
    const other = b[i];
    return block.from === other.from && block.to === other.to && block.firstLine === other.firstLine && block.lastLine === other.lastLine && block.tags.length === other.tags.length && block.tags.every((tag, j) => {
      const otherTag = other.tags[j];
      return tag.from === otherTag.from && tag.to === otherTag.to && tag.text === otherTag.text;
    });
  });
}
function createMarginField(host) {
  function decorate(state, blocks, settings, space, widths, revision) {
    if (!settings.enabled || !host.isLivePreview(state) || settings.tagsOutside && space < 64) return import_view.Decoration.none;
    const ranges = [];
    const width = settings.tagsOutside ? Math.min(settings.width, space) : settings.width;
    const lane = settings.tagsOutside ? `${width}px` : `min(${width}px, 38%)`;
    const gap = settings.tagsOutside ? `${settings.marginGap}px` : `min(${settings.marginGap}px, 10%)`;
    const fieldRanges = /* @__PURE__ */ new Map();
    for (const block of blocks) {
      if (settings.showInlineWhileEditing && touchesSelection(block, state.selection)) continue;
      const tags = settings.keepInlineFieldTags ? block.tags.filter((tag) => {
        const line = state.doc.lineAt(tag.from);
        let fields = fieldRanges.get(line.number);
        if (!fields) {
          fields = inlineFieldRanges(line.text);
          fieldRanges.set(line.number, fields);
        }
        return !fields.some((field) => tag.from >= line.from + field.from && tag.to <= line.from + field.to);
      }) : block.tags;
      if (!tags.length) continue;
      for (const tag of tags) ranges.push(import_view.Decoration.replace({}).range(tag.from, tag.to));
      const measured = widths.get(block.from);
      const fittedLane = !settings.tagsOutside && measured !== void 0 ? `min(${measured}px, ${lane})` : lane;
      const style = `--margin-tags-limit:${lane};--margin-tags-width:${fittedLane};--margin-tags-gap:${gap};--margin-tags-padding-y:${settings.tagPaddingY}px;--margin-tags-font-size:${tagFontSizeCss(settings.tagFontSize, settings.tagAutoPercent)}`;
      const lastLine = settings.tagsOutside ? block.firstLine : block.lastLine;
      for (let n = block.firstLine; n <= lastLine; n++) {
        const classes = [
          n === block.firstLine ? "margin-tags-line" : "",
          settings.tagsOutside ? "" : "margin-tags-inside-line"
        ].filter(Boolean).join(" ");
        ranges.push(import_view.Decoration.line({ attributes: { class: classes, style } }).range(state.doc.line(n).from));
      }
      const names = prioritizeTags(tags.map((t) => t.text), settings.priority);
      ranges.push(import_view.Decoration.widget({ widget: host.widget(names, width, settings, settings.tagsOutside ? void 0 : { blockFrom: block.from, revision }), side: 1 }).range(state.doc.line(block.firstLine).to));
    }
    return import_view.Decoration.set(ranges, true);
  }
  return import_state.StateField.define({
    create(state) {
      const settings = { ...host.settings };
      const blocks = collectBlocks(state.doc, readTags(state), settings.mode);
      const widths = /* @__PURE__ */ new Map();
      return {
        settings,
        blocks,
        space: 0,
        widths,
        revision: 0,
        decorations: decorate(state, blocks, settings, 0, widths, 0)
      };
    },
    update(value, tr) {
      let settings = value.settings;
      let space = value.space;
      for (const effect of tr.effects) {
        if (effect.is(configure)) settings = effect.value;
        if (effect.is(marginSpace)) space = effect.value;
      }
      const reparse = tr.docChanged || (0, import_language.syntaxTree)(tr.state) !== (0, import_language.syntaxTree)(tr.startState) || settings.mode !== value.settings.mode;
      const blocks = reparse ? collectBlocks(tr.state.doc, readTags(tr.state), settings.mode) : value.blocks;
      const reset = tr.docChanged || settings !== value.settings || !sameBlocks(blocks, value.blocks);
      const revision = reset ? value.revision + 1 : value.revision;
      let widths = reset ? /* @__PURE__ */ new Map() : value.widths;
      for (const effect of tr.effects) {
        if (!effect.is(measuredLane) || settings.tagsOutside) continue;
        const report = effect.value;
        if (report.revision !== revision || !Number.isFinite(report.width) || report.width < 0 || !blocks.some((block) => block.from === report.blockFrom)) continue;
        const width = Math.min(settings.width, Math.ceil(report.width));
        if (widths.get(report.blockFrom) === width) continue;
        if (widths === value.widths) widths = new Map(widths);
        widths.set(report.blockFrom, width);
      }
      if (reparse || tr.selection || settings !== value.settings || space !== value.space || widths !== value.widths || host.isLivePreview(tr.state) !== host.isLivePreview(tr.startState)) {
        return { settings, blocks, space, widths, revision, decorations: decorate(tr.state, blocks, settings, space, widths, revision) };
      }
      return value;
    },
    provide: (field) => import_view.EditorView.decorations.from(field, (value) => value.decorations)
  });
}
var MarginLayout = class {
  constructor(view, getGap = () => 12) {
    this.view = view;
    this.getGap = getGap;
    __publicField(this, "lastSpace", -1);
    __publicField(this, "destroyed", false);
    __publicField(this, "observer");
    this.observer = new view.dom.ownerDocument.defaultView.ResizeObserver(() => this.measure());
    this.observer.observe(view.scrollDOM);
    this.observer.observe(view.contentDOM);
    this.measure();
  }
  update(update) {
    if (update.geometryChanged || update.viewportChanged || update.docChanged || update.transactions.some((tr) => tr.effects.some((effect) => effect.is(configure)))) this.measure();
  }
  measure() {
    if (this.destroyed) return;
    this.view.requestMeasure({
      key: this,
      read: (view) => {
        const content2 = view.contentDOM.getBoundingClientRect();
        const scroll = view.scrollDOM;
        const right = scroll.getBoundingClientRect().left + scroll.clientLeft + scroll.clientWidth;
        return availableMargin(content2.right, right, this.getGap());
      },
      write: (space) => {
        if (this.destroyed || space === this.lastSpace) return;
        this.lastSpace = space;
        this.view.dom.ownerDocument.defaultView.queueMicrotask(() => {
          if (!this.destroyed && this.lastSpace === space) {
            this.view.dispatch({ effects: marginSpace.of(space) });
          }
        });
      }
    });
  }
  destroy() {
    this.destroyed = true;
    this.observer.disconnect();
  }
};
function createMarginLayout(getGap) {
  return import_view.ViewPlugin.define((view) => new MarginLayout(view, getGap));
}
var marginLayout = createMarginLayout(() => 12);

// src/widget.ts
var import_view2 = require("@codemirror/view");
var mounts = /* @__PURE__ */ new WeakMap();
var TagRail = class extends import_view2.WidgetType {
  constructor(tags, width, actions, paddingX = 7, paddingY = 1, typography = DEFAULT_TYPOGRAPHY, measurement) {
    super();
    this.tags = tags;
    this.width = width;
    this.actions = actions;
    this.paddingX = paddingX;
    this.paddingY = paddingY;
    this.typography = typography;
    this.measurement = measurement;
  }
  eq(other) {
    return other.measurement?.blockFrom === this.measurement?.blockFrom && other.measurement?.revision === this.measurement?.revision && other.width === this.width && other.paddingX === this.paddingX && other.paddingY === this.paddingY && other.typography.tagFontFamily === this.typography.tagFontFamily && other.typography.tagFontSize === this.typography.tagFontSize && other.typography.tagAutoPercent === this.typography.tagAutoPercent && other.typography.tagFontWeight === this.typography.tagFontWeight && other.typography.tagItalic === this.typography.tagItalic && other.typography.tagUnderline === this.typography.tagUnderline && other.tags.length === this.tags.length && other.tags.every((tag, i) => tag === this.tags[i]);
  }
  toDOM(view) {
    const doc = view.dom.ownerDocument;
    const win = doc.defaultView;
    const root = doc.createElement("span");
    root.className = "margin-tags-rail";
    this.applyAppearance(root);
    root.setAttribute("aria-label", "Paragraph tags");
    root.contentEditable = "false";
    root.addEventListener("pointerdown", (e) => e.preventDefault());
    root.addEventListener("mousedown", (e) => e.preventDefault());
    const link = (tag) => {
      const a = doc.createElement("a");
      a.className = "tag margin-tags-tag";
      a.textContent = tag;
      a.href = this.actions.href(tag);
      a.title = `Search ${tag}`;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.actions.search(tag, e.ctrlKey || e.metaKey);
      });
      a.addEventListener("auxclick", (e) => {
        if (e.button === 1) {
          e.preventDefault();
          this.actions.search(tag, true);
        }
      });
      return a;
    };
    const chips = this.tags.map(link);
    root.append(...chips);
    const more = doc.createElement("button");
    more.type = "button";
    more.className = "margin-tags-more";
    more.hidden = true;
    more.setAttribute("aria-haspopup", "dialog");
    more.setAttribute("aria-expanded", "false");
    root.append(more);
    let hidden = [], popover = null;
    const close = (restoreFocus = false) => {
      if (!popover) return;
      popover.remove();
      popover = null;
      more.setAttribute("aria-expanded", "false");
      doc.removeEventListener("pointerdown", outside, true);
      doc.removeEventListener("keydown", escape, true);
      win.removeEventListener("resize", reposition);
      doc.removeEventListener("scroll", reposition, true);
      if (restoreFocus && more.isConnected) more.focus();
    };
    const outside = (event) => {
      const target = event.target;
      if (!popover?.contains(target) && !root.contains(target)) close();
    };
    const escape = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close(true);
      }
    };
    const reposition = () => {
      if (!popover) return;
      const rect = more.getBoundingClientRect();
      const p = popover.getBoundingClientRect();
      popover.style.left = `${Math.max(8, Math.min(rect.right - p.width, win.innerWidth - p.width - 8))}px`;
      const below = rect.bottom + 6;
      popover.style.top = `${Math.max(8, below + p.height <= win.innerHeight - 8 ? below : rect.top - p.height - 6)}px`;
    };
    more.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (popover) {
        close();
        return;
      }
      popover = doc.createElement("div");
      popover.className = "margin-tags-popover";
      this.applyAppearance(popover);
      popover.setAttribute("role", "dialog");
      popover.setAttribute("aria-label", `${hidden.length} more tags`);
      popover.addEventListener("mousedown", (e2) => e2.preventDefault());
      const title = doc.createElement("div");
      title.className = "margin-tags-popover-title";
      title.textContent = "More tags";
      const dismiss = doc.createElement("button");
      dismiss.type = "button";
      dismiss.textContent = "\xD7";
      dismiss.className = "margin-tags-dismiss";
      dismiss.setAttribute("aria-label", "Close more tags");
      dismiss.addEventListener("click", () => close(true));
      title.append(dismiss);
      popover.append(title, ...hidden.map((tag) => {
        const a = link(tag);
        a.addEventListener("click", () => close());
        return a;
      }));
      popover.addEventListener("keydown", (e2) => {
        if (e2.key !== "ArrowDown" && e2.key !== "ArrowUp") return;
        const items = Array.from(popover.querySelectorAll("a, button"));
        const i = items.indexOf(doc.activeElement);
        items[(i + (e2.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
        e2.preventDefault();
      });
      popover.addEventListener("focusout", () => win.setTimeout(() => {
        if (popover && !popover.contains(doc.activeElement) && doc.activeElement !== more) close();
      }, 0));
      doc.body.append(popover);
      more.setAttribute("aria-expanded", "true");
      reposition();
      popover.querySelector("a")?.focus();
      doc.addEventListener("pointerdown", outside, true);
      doc.addEventListener("keydown", escape, true);
      win.addEventListener("resize", reposition);
      doc.addEventListener("scroll", reposition, true);
    });
    let disposed = false;
    let lastMeasured = -1;
    let measuredAnchor = null;
    const fit = () => {
      if (disposed || !root.isConnected) return;
      if (this.measurement) {
        const line = root.closest(".cm-line");
        if (line !== measuredAnchor) {
          if (measuredAnchor) observer.unobserve(measuredAnchor);
          if (line) observer.observe(line);
          measuredAnchor = line;
        }
      }
      chips.forEach((chip) => {
        chip.hidden = false;
      });
      more.hidden = false;
      more.textContent = `+${this.tags.length}`;
      const previousWidth = root.style.width;
      if (this.measurement) root.style.width = "var(--margin-tags-limit)";
      const cap = root.getBoundingClientRect().width;
      const chipWidths = chips.map((c) => c.getBoundingClientRect().width);
      const count = visibleCount(chipWidths, cap, more.getBoundingClientRect().width);
      chips.forEach((chip, i) => {
        chip.hidden = i >= count;
      });
      const nextHidden = this.tags.slice(count);
      if (nextHidden.length !== hidden.length) close();
      hidden = nextHidden;
      more.hidden = !hidden.length;
      more.textContent = `+${hidden.length}`;
      more.setAttribute("aria-label", `Show ${hidden.length} more tags`);
      more.title = hidden.join(", ");
      if (this.measurement) {
        const shown = count + (hidden.length ? 1 : 0);
        const used = chipWidths.slice(0, count).reduce((sum, width) => sum + width, 0) + (hidden.length ? more.getBoundingClientRect().width : 0) + Math.max(0, shown - 1) * 4;
        const fitted = Math.ceil(Math.min(cap, used));
        root.style.width = previousWidth;
        if (fitted !== lastMeasured) {
          lastMeasured = fitted;
          win.queueMicrotask(() => {
            if (!disposed && root.isConnected && lastMeasured === fitted) {
              view.dispatch({ effects: measuredLane.of({ ...this.measurement, width: fitted }) });
            }
          });
        }
      }
      reposition();
    };
    let frame = 0;
    const schedule = () => {
      win.cancelAnimationFrame(frame);
      frame = win.requestAnimationFrame(fit);
    };
    const observer = new win.ResizeObserver(schedule);
    observer.observe(root);
    if (this.measurement) {
      observer.observe(view.contentDOM);
    }
    chips.forEach((chip) => observer.observe(chip));
    win.queueMicrotask(fit);
    mounts.set(root, { observer, close, cancel: () => {
      disposed = true;
      win.cancelAnimationFrame(frame);
    } });
    return root;
  }
  applyAppearance(element) {
    element.style.setProperty("--margin-tags-font-family", this.typography.tagFontFamily || "var(--font-interface)");
    element.style.setProperty("--margin-tags-font-size", tagFontSizeCss(this.typography.tagFontSize, this.typography.tagAutoPercent));
    element.style.setProperty("--margin-tags-font-weight", String(this.typography.tagFontWeight));
    element.style.setProperty("--margin-tags-font-style", this.typography.tagItalic ? "italic" : "normal");
    element.style.setProperty("--margin-tags-text-decoration", this.typography.tagUnderline ? "underline" : "none");
    element.style.setProperty("--margin-tags-padding-x", `${this.paddingX}px`);
    element.style.setProperty("--margin-tags-padding-y", `${this.paddingY}px`);
  }
  ignoreEvent() {
    return true;
  }
  destroy(dom) {
    const mounted = mounts.get(dom);
    mounted?.observer.disconnect();
    mounted?.cancel();
    mounted?.close();
    mounts.delete(dom);
  }
};

// src/number-control.ts
function bindNumberControl(slider, input, min, max, initial, save) {
  let value = initial;
  input.type = "number";
  input.min = String(min);
  input.max = String(max);
  input.step = "1";
  const render = () => {
    slider.value = input.value = String(value);
  };
  const commit = (raw) => {
    const parsed = raw.trim() === "" ? NaN : Number(raw);
    const next = Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : value;
    const changed = next !== value;
    value = next;
    render();
    if (changed) save(value);
  };
  render();
  slider.addEventListener("input", () => commit(slider.value));
  input.addEventListener("change", () => commit(input.value));
  input.addEventListener("blur", () => commit(input.value));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit(input.value);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      render();
    }
  });
}

// src/main.ts
var MarginTagsPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "settings", { ...DEFAULTS });
    __publicField(this, "views", /* @__PURE__ */ new Set());
  }
  async onload() {
    this.settings = sanitizeSettings(await this.loadData());
    const plugin = this;
    this.registerEditorExtension([
      createMarginField({
        get settings() {
          return plugin.settings;
        },
        isLivePreview: (state) => state.field(import_obsidian.editorLivePreviewField, false) === true,
        widget: (tags, width, settings, measurement) => new TagRail(tags, width, {
          search: (tag, newPane) => {
            void plugin.openTag(tag, newPane);
          },
          href: (tag) => `obsidian://search?vault=${encodeURIComponent(plugin.app.vault.getName())}&query=${encodeURIComponent(`tag:${tag}`)}`
        }, settings.tagPaddingX, settings.tagPaddingY, {
          tagFontFamily: settings.tagFontFamily,
          tagFontSize: settings.tagFontSize,
          tagAutoPercent: settings.tagAutoPercent,
          tagFontWeight: settings.tagFontWeight,
          tagItalic: settings.tagItalic,
          tagUnderline: settings.tagUnderline
        }, measurement)
      }),
      createMarginLayout(() => plugin.settings.marginGap),
      import_view3.ViewPlugin.fromClass(class {
        constructor(view) {
          this.view = view;
          plugin.views.add(view);
        }
        destroy() {
          plugin.views.delete(this.view);
        }
      })
    ]);
    this.addSettingTab(new MarginTagsSettings(this.app, this));
    this.addCommand({ id: "toggle-margin-tags", name: "Toggle margin tags", callback: async () => {
      this.settings.enabled = !this.settings.enabled;
      await this.applySettings();
      new import_obsidian.Notice(`Margin tags ${this.settings.enabled ? "enabled" : "disabled"}`);
    } });
  }
  async applySettings() {
    this.settings = sanitizeSettings(this.settings);
    for (const view of this.views) view.dispatch({ effects: configure.of({ ...this.settings }) });
    await this.saveData(this.settings);
  }
  async openTag(tag, newPane) {
    try {
      const workspace = this.app.workspace;
      const leaf = newPane ? workspace.getLeaf("tab") : workspace.getLeavesOfType("search")[0] ?? workspace.getLeftLeaf(false);
      if (!leaf) {
        new import_obsidian.Notice("Unable to open Search. Enable the Search core plugin.");
        return;
      }
      await leaf.setViewState({ type: "search", state: { query: `tag:${tag}` }, active: true });
      if (leaf.view.getViewType() !== "search") {
        new import_obsidian.Notice("Enable the Search core plugin to search tags.");
        return;
      }
      await workspace.revealLeaf(leaf);
    } catch (error) {
      console.error("Margin Tags: unable to open tag search", error);
      new import_obsidian.Notice("Could not open tag search. Check that the Search core plugin is enabled.");
    }
  }
};
var MarginTagsSettings = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    this.containerEl.empty();
    this.containerEl.createEl("h2", { text: "Margin Tags" });
    new import_obsidian.Setting(this.containerEl).setName("Enable margin tags").setDesc("Show tags in a right-hand lane in Live Preview.").addToggle((toggle) => toggle.setValue(this.plugin.settings.enabled).onChange(async (enabled) => {
      this.plugin.settings.enabled = enabled;
      await this.plugin.applySettings();
    }));
    new import_obsidian.Setting(this.containerEl).setName("Place tags outside text area").setDesc("On: use the existing margin outside the text column. Off: place tags inside the right edge, reserving space so they do not overlap text. Inside placement also works when no outside margin is available.").addToggle((toggle) => toggle.setValue(this.plugin.settings.tagsOutside).onChange(async (value) => {
      this.plugin.settings.tagsOutside = value;
      await this.plugin.applySettings();
    }));
    new import_obsidian.Setting(this.containerEl).setName("Show tags inline while editing").setDesc("On: reveal tags inline when the cursor or selection is in their line or paragraph. Off: keep them in the margin. You can edit tag text in Source mode. In outside placement, tags stay inline if there is no room for a margin.").addToggle((toggle) => toggle.setValue(this.plugin.settings.showInlineWhileEditing).onChange(async (showInlineWhileEditing) => {
      this.plugin.settings.showInlineWhileEditing = showInlineWhileEditing;
      await this.plugin.applySettings();
    }));
    new import_obsidian.Setting(this.containerEl).setName("Keep inline-field tags inline").setDesc("Keep tags in key:: value fields inline, such as tags:: #source/book #status/reading. Also supports [key:: value] and (key:: value). Turn off to allow these tags in the margin.").addToggle((toggle) => toggle.setValue(this.plugin.settings.keepInlineFieldTags).onChange(async (keepInlineFieldTags) => {
      this.plugin.settings.keepInlineFieldTags = keepInlineFieldTags;
      await this.plugin.applySettings();
    }));
    new import_obsidian.Setting(this.containerEl).setName("Editing scope").setDesc("Group tags by paragraph/list item or source line. This also controls where tags are revealed when Show tags inline while editing is on.").addDropdown((dropdown) => dropdown.addOption("paragraph", "Paragraph").addOption("line", "Line").setValue(this.plugin.settings.mode).onChange(async (mode) => {
      this.plugin.settings.mode = mode === "line" ? "line" : "paragraph";
      await this.plugin.applySettings();
    }));
    new import_obsidian.Setting(this.containerEl).setName("Tag priority").setDesc("Choose which end of the paragraph\u2019s tag order is shown first. Lower-priority tags go into +N.").addDropdown((dropdown) => dropdown.addOption("left-to-right", "Left to right (first tags first)").addOption("right-to-left", "Right to left (last tags first)").setValue(this.plugin.settings.priority).onChange(async (priority) => {
      this.plugin.settings.priority = priority === "right-to-left" ? "right-to-left" : "left-to-right";
      await this.plugin.applySettings();
    }));
    new import_obsidian.Setting(this.containerEl).setName("Tag font family").setDesc("Use a font installed on your device, such as Georgia or Arial. A comma-separated fallback list is supported. Leave blank for Obsidian\u2019s interface font.").addText((text) => text.setPlaceholder("Default interface font").setValue(this.plugin.settings.tagFontFamily).onChange(async (value) => {
      this.plugin.settings.tagFontFamily = value;
      await this.plugin.applySettings();
    }));
    new import_obsidian.Setting(this.containerEl).setName("Tag font size").setDesc("Choose a size in pixels, or Automatic to scale with the note font using the percentage below. Larger tags may move into +N sooner.").addDropdown((dropdown) => {
      dropdown.addOption("0", "Automatic (use percentage below)");
      for (let size = 8; size <= 32; size++) dropdown.addOption(String(size), `${size} px`);
      dropdown.setValue(String(this.plugin.settings.tagFontSize)).onChange(async (value) => {
        this.plugin.settings.tagFontSize = Number(value);
        await this.plugin.applySettings();
      });
    });
    this.numberSetting(
      "Automatic font size percentage",
      "Tag size as a percentage of the note font: 100% matches it, 78% is the default. Applies only when Tag font size is Automatic.",
      "tagAutoPercent",
      25,
      200,
      "%"
    );
    new import_obsidian.Setting(this.containerEl).setName("Tag font weight").setDesc("Choose Regular, Bold, or another weight. The available appearance depends on the selected font.").addDropdown((dropdown) => {
      const labels = ["Thin", "Extra light", "Light", "Regular", "Medium", "Semibold", "Bold", "Extra bold", "Black"];
      labels.forEach((label, i) => dropdown.addOption(String((i + 1) * 100), `${label} (${(i + 1) * 100})`));
      dropdown.setValue(String(this.plugin.settings.tagFontWeight)).onChange(async (value) => {
        this.plugin.settings.tagFontWeight = Number(value);
        await this.plugin.applySettings();
      });
    });
    new import_obsidian.Setting(this.containerEl).setName("Italic tags").addToggle((toggle) => toggle.setValue(this.plugin.settings.tagItalic).onChange(async (value) => {
      this.plugin.settings.tagItalic = value;
      await this.plugin.applySettings();
    }));
    new import_obsidian.Setting(this.containerEl).setName("Underline tags").addToggle((toggle) => toggle.setValue(this.plugin.settings.tagUnderline).onChange(async (value) => {
      this.plugin.settings.tagUnderline = value;
      await this.plugin.applySettings();
    }));
    this.numberSetting(
      "Tag horizontal padding",
      "Space inside each margin tag on the left and right. Default: 7 px. Larger padding fits fewer tags before +N.",
      "tagPaddingX",
      0,
      24,
      "px"
    );
    this.numberSetting(
      "Tag vertical padding",
      "Space inside each margin tag above and below the label. Default: 1 px. Larger padding increases the tagged line\u2019s minimum height to avoid overlap.",
      "tagPaddingY",
      0,
      12,
      "px"
    );
    this.numberSetting(
      "Distance from text",
      "Move tags closer to or farther from the text column. Lower values bring them closer; 0 removes the extra gap. Default: 12 px. Inside placement caps the gap at 10% of the text column.",
      "marginGap",
      0,
      80,
      "px"
    );
    this.numberSetting(
      "Maximum margin width",
      "Maximum tag lane width. Outside: limited by spare margin space. Inside: each group uses only the width its displayed tags need, up to this maximum and 38% of the text column.",
      "width",
      80,
      360,
      "px"
    );
  }
  numberSetting(name, description, key, min, max, unit) {
    const setting = new import_obsidian.Setting(this.containerEl).setName(name).setDesc(`${description} Drag the slider, or type a number and press Enter or leave the field to apply.`);
    setting.controlEl.classList.add("margin-tags-number-control");
    setting.addSlider((slider) => {
      slider.setLimits(min, max, 1).setValue(this.plugin.settings[key]).setDynamicTooltip();
      slider.sliderEl.setAttribute("aria-label", `${name} (${unit})`);
      setting.addText((text) => {
        text.inputEl.classList.add("margin-tags-number-input");
        text.inputEl.setAttribute("aria-label", `${name} (${unit}), exact value`);
        bindNumberControl(slider.sliderEl, text.inputEl, min, max, this.plugin.settings[key], (value) => {
          this.plugin.settings[key] = value;
          void this.plugin.applySettings();
        });
      });
    });
    setting.controlEl.createSpan({ text: unit, cls: "margin-tags-number-unit" });
  }
};
