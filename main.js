/* Margin Tags v0.1.1 | MIT License | See src/ for editable source. */
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
var DEFAULTS = { mode: "paragraph", width: 200, enabled: true, priority: "left-to-right" };
function sanitizeSettings(raw) {
  return {
    mode: raw?.mode === "line" ? "line" : "paragraph",
    width: typeof raw?.width === "number" && Number.isFinite(raw.width) ? Math.max(80, Math.min(360, Math.round(raw.width))) : DEFAULTS.width,
    enabled: typeof raw?.enabled === "boolean" ? raw.enabled : true,
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
function availableMargin(contentRight, viewportRight) {
  const space = Math.floor(viewportRight - contentRight - 12 - 8);
  return Number.isFinite(space) && space >= 64 ? Math.min(360, space) : 0;
}

// src/editor.ts
var configure = import_state.StateEffect.define();
var marginSpace = import_state.StateEffect.define();
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
function createMarginField(host) {
  function decorate(state, blocks, settings, space) {
    if (!settings.enabled || !host.isLivePreview(state) || space < 64) return import_view.Decoration.none;
    const ranges = [];
    const width = Math.min(settings.width, space);
    for (const block of blocks) {
      if (touchesSelection(block, state.selection)) continue;
      for (const tag of block.tags) ranges.push(import_view.Decoration.replace({}).range(tag.from, tag.to));
      ranges.push(import_view.Decoration.line({ attributes: {
        class: "margin-tags-line",
        style: `--margin-tags-width:${width}px`
      } }).range(state.doc.line(block.firstLine).from));
      const names = prioritizeTags(block.tags.map((t) => t.text), settings.priority);
      ranges.push(import_view.Decoration.widget({ widget: host.widget(names, width), side: 1 }).range(state.doc.line(block.firstLine).to));
    }
    return import_view.Decoration.set(ranges, true);
  }
  return import_state.StateField.define({
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
      const reparse = tr.docChanged || (0, import_language.syntaxTree)(tr.state) !== (0, import_language.syntaxTree)(tr.startState) || settings.mode !== value.settings.mode;
      const blocks = reparse ? collectBlocks(tr.state.doc, readTags(tr.state), settings.mode) : value.blocks;
      if (reparse || tr.selection || settings !== value.settings || space !== value.space || host.isLivePreview(tr.state) !== host.isLivePreview(tr.startState)) {
        return { settings, blocks, space, decorations: decorate(tr.state, blocks, settings, space) };
      }
      return value;
    },
    provide: (field) => import_view.EditorView.decorations.from(field, (value) => value.decorations)
  });
}
var MarginLayout = class {
  constructor(view) {
    this.view = view;
    __publicField(this, "lastSpace", -1);
    __publicField(this, "destroyed", false);
    __publicField(this, "observer");
    this.observer = new view.dom.ownerDocument.defaultView.ResizeObserver(() => this.measure());
    this.observer.observe(view.scrollDOM);
    this.observer.observe(view.contentDOM);
    this.measure();
  }
  update(update) {
    if (update.geometryChanged || update.viewportChanged || update.docChanged) this.measure();
  }
  measure() {
    if (this.destroyed) return;
    this.view.requestMeasure({
      key: this,
      read: (view) => {
        const content2 = view.contentDOM.getBoundingClientRect();
        const scroll = view.scrollDOM;
        const right = scroll.getBoundingClientRect().left + scroll.clientLeft + scroll.clientWidth;
        return availableMargin(content2.right, right);
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
var marginLayout = import_view.ViewPlugin.fromClass(MarginLayout);

// src/widget.ts
var import_view2 = require("@codemirror/view");
var mounts = /* @__PURE__ */ new WeakMap();
var TagRail = class extends import_view2.WidgetType {
  constructor(tags, width, actions) {
    super();
    this.tags = tags;
    this.width = width;
    this.actions = actions;
  }
  eq(other) {
    return other.width === this.width && other.tags.length === this.tags.length && other.tags.every((tag, i) => tag === this.tags[i]);
  }
  toDOM(view) {
    const doc = view.dom.ownerDocument;
    const win = doc.defaultView;
    const root = doc.createElement("span");
    root.className = "margin-tags-rail";
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
    const fit = () => {
      if (!root.isConnected) return;
      chips.forEach((chip) => {
        chip.hidden = false;
      });
      more.hidden = false;
      more.textContent = `+${this.tags.length}`;
      const count = visibleCount(
        chips.map((c) => c.getBoundingClientRect().width),
        root.getBoundingClientRect().width,
        more.getBoundingClientRect().width
      );
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
      reposition();
    };
    let frame = 0;
    const schedule = () => {
      win.cancelAnimationFrame(frame);
      frame = win.requestAnimationFrame(fit);
    };
    const observer = new win.ResizeObserver(schedule);
    observer.observe(root);
    chips.forEach((chip) => observer.observe(chip));
    schedule();
    mounts.set(root, { observer, close, cancel: () => win.cancelAnimationFrame(frame) });
    return root;
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
        widget: (tags, width) => new TagRail(tags, width, {
          search: (tag, newPane) => {
            void plugin.openTag(tag, newPane);
          },
          href: (tag) => `obsidian://search?vault=${encodeURIComponent(plugin.app.vault.getName())}&query=${encodeURIComponent(`tag:${tag}`)}`
        })
      }),
      marginLayout,
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
    new import_obsidian.Setting(this.containerEl).setName("Enable margin tags").setDesc("Show tags in a right-hand lane in Live Preview while their paragraph is inactive.").addToggle((toggle) => toggle.setValue(this.plugin.settings.enabled).onChange(async (enabled) => {
      this.plugin.settings.enabled = enabled;
      await this.plugin.applySettings();
    }));
    new import_obsidian.Setting(this.containerEl).setName("Editing scope").setDesc("Paragraph restores all tags in the current paragraph or list item. Line restores only the current source line.").addDropdown((dropdown) => dropdown.addOption("paragraph", "Paragraph").addOption("line", "Line").setValue(this.plugin.settings.mode).onChange(async (mode) => {
      this.plugin.settings.mode = mode === "line" ? "line" : "paragraph";
      await this.plugin.applySettings();
    }));
    new import_obsidian.Setting(this.containerEl).setName("Tag priority").setDesc("Choose which end of the paragraph\u2019s tag order is shown first. Lower-priority tags go into +N.").addDropdown((dropdown) => dropdown.addOption("left-to-right", "Left to right (first tags first)").addOption("right-to-left", "Right to left (last tags first)").setValue(this.plugin.settings.priority).onChange(async (priority) => {
      this.plugin.settings.priority = priority === "right-to-left" ? "right-to-left" : "left-to-right";
      await this.plugin.applySettings();
    }));
    new import_obsidian.Setting(this.containerEl).setName("Maximum margin width").setDesc("Maximum width outside the text column. Uses existing right-hand space; tags stay inline when that space is too narrow. Readable line length can provide more margin in wide panes.").addSlider((slider) => slider.setLimits(80, 360, 10).setValue(this.plugin.settings.width).setDynamicTooltip().onChange(async (width) => {
      this.plugin.settings.width = width;
      await this.plugin.applySettings();
    }));
  }
};
