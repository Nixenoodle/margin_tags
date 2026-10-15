import { WidgetType, type EditorView } from '@codemirror/view';
import { measuredLane, type LaneIdentity } from './editor';
import { visibleCount, DEFAULT_TYPOGRAPHY, tagFontSizeCss, type TagTypography } from './model';

export interface TagActions {
  search(tag: string, newPane: boolean): void;
  href(tag: string): string;
}
interface Mounted {
  observer: ResizeObserver;
  close(): void;
  cancel(): void;
}
const mounts = new WeakMap<HTMLElement, Mounted>();
export class TagRail extends WidgetType {
  constructor(readonly tags: string[], readonly width: number, readonly actions: TagActions,
    readonly paddingX = 7, readonly paddingY = 1, readonly typography: TagTypography = DEFAULT_TYPOGRAPHY,
    readonly measurement?: LaneIdentity) { super(); }
  eq(other: TagRail): boolean {
    return other.measurement?.blockFrom === this.measurement?.blockFrom
      && other.measurement?.revision === this.measurement?.revision
      && other.width === this.width && other.paddingX === this.paddingX
      && other.paddingY === this.paddingY
      && other.typography.tagFontFamily === this.typography.tagFontFamily
      && other.typography.tagFontSize === this.typography.tagFontSize
      && other.typography.tagAutoPercent === this.typography.tagAutoPercent
      && other.typography.tagFontWeight === this.typography.tagFontWeight
      && other.typography.tagItalic === this.typography.tagItalic
      && other.typography.tagUnderline === this.typography.tagUnderline
      && other.tags.length === this.tags.length
      && other.tags.every((tag, i) => tag === this.tags[i]);
  }
  toDOM(view: EditorView): HTMLElement {
    const doc = view.dom.ownerDocument;
    const win = doc.defaultView!;
    const root = doc.createElement('span');
    root.className = 'margin-tags-rail';
    this.applyAppearance(root);
    root.setAttribute('aria-label', 'Paragraph tags');
    root.contentEditable = 'false';
    // Prevent pointer interaction from moving the text selection and destroying the rail.
    root.addEventListener('pointerdown', e => e.preventDefault());
    root.addEventListener('mousedown', e => e.preventDefault());
    const link = (tag: string) => {
      const a = doc.createElement('a');
      a.className = 'tag margin-tags-tag';
      a.textContent = tag;
      a.href = this.actions.href(tag);
      a.title = `Search ${tag}`;
      a.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        this.actions.search(tag, e.ctrlKey || e.metaKey);
      });
      a.addEventListener('auxclick', e => {
        if (e.button === 1) { e.preventDefault(); this.actions.search(tag, true); }
      });
      return a;
    };
    const chips = this.tags.map(link);
    root.append(...chips);
    const more = doc.createElement('button');
    more.type = 'button';
    more.className = 'margin-tags-more';
    more.setAttribute('aria-haspopup', 'dialog');
    more.setAttribute('aria-expanded', 'false');
    root.append(more);
    let hidden: string[] = [], popover: HTMLDivElement | null = null;
    const close = (restoreFocus = false) => {
      if (!popover) return;
      popover.remove(); popover = null;
      more.setAttribute('aria-expanded', 'false');
      doc.removeEventListener('pointerdown', outside, true);
      doc.removeEventListener('keydown', escape, true);
      win.removeEventListener('resize', reposition);
      doc.removeEventListener('scroll', reposition, true);
      if (restoreFocus && more.isConnected) more.focus();
    };
    const outside = (event: Event) => {
      const target = event.target as Node;
      if (!popover?.contains(target) && !root.contains(target)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
    };
    const reposition = () => {
      if (!popover) return;
      const rect = more.getBoundingClientRect();
      const p = popover.getBoundingClientRect();
      popover.style.left = `${Math.max(8, Math.min(rect.right - p.width, win.innerWidth - p.width - 8))}px`;
      const below = rect.bottom + 6;
      popover.style.top = `${Math.max(8, below + p.height <= win.innerHeight - 8 ? below : rect.top - p.height - 6)}px`;
    };
    more.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (popover) { close(); return; }
      popover = doc.createElement('div');
      popover.className = 'margin-tags-popover';
      this.applyAppearance(popover);
      popover.setAttribute('role', 'dialog');
      popover.setAttribute('aria-label', `${hidden.length} more tags`);
      popover.addEventListener('mousedown', e => e.preventDefault());
      const title = doc.createElement('div');
      title.className = 'margin-tags-popover-title';
      title.textContent = 'More tags';
      const dismiss = doc.createElement('button');
      dismiss.type = 'button'; dismiss.textContent = '×';
      dismiss.className = 'margin-tags-dismiss';
      dismiss.setAttribute('aria-label', 'Close more tags');
      dismiss.addEventListener('click', () => close(true));
      title.append(dismiss);
      popover.append(title, ...hidden.map(tag => {
        const a = link(tag);
        a.addEventListener('click', () => close());
        return a;
      }));
      popover.addEventListener('keydown', e => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        const items = Array.from(popover!.querySelectorAll<HTMLElement>('a, button'));
        const i = items.indexOf(doc.activeElement as HTMLElement);
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
        e.preventDefault();
      });
      popover.addEventListener('focusout', () => win.setTimeout(() => {
        if (popover && !popover.contains(doc.activeElement) && doc.activeElement !== more) close();
      }, 0));
      doc.body.append(popover);
      more.setAttribute('aria-expanded', 'true');
      reposition();
      popover.querySelector<HTMLElement>('a')?.focus();
      doc.addEventListener('pointerdown', outside, true);
      doc.addEventListener('keydown', escape, true);
      win.addEventListener('resize', reposition);
      doc.addEventListener('scroll', reposition, true);
    });
    let disposed = false;
    let lastMeasured = -1;
    let measuredAnchor: Element | null = null;
    const fit = () => {
      if (disposed || !root.isConnected) return;
      if (this.measurement) {
        const line = root.closest('.cm-line');
        if (line !== measuredAnchor) {
          if (measuredAnchor) observer.unobserve(measuredAnchor);
          if (line) observer.observe(line);
          measuredAnchor = line;
        }
      }
      chips.forEach(chip => { chip.hidden = false; });
      more.hidden = false;
      // Measuring +total is a safe upper bound for any smaller overflow count.
      more.textContent = `+${this.tags.length}`;
      // Always fit against the maximum lane, not its previous compact width.
      // This lets tags return after a resize without a shrinking feedback loop.
      const previousWidth = root.style.width;
      if (this.measurement) root.style.width = 'var(--margin-tags-limit)';
      const cap = root.getBoundingClientRect().width;
      const chipWidths = chips.map(c => c.getBoundingClientRect().width);
      const count = visibleCount(chipWidths, cap, more.getBoundingClientRect().width);
      chips.forEach((chip, i) => { chip.hidden = i >= count; });
      const nextHidden = this.tags.slice(count);
      if (nextHidden.length !== hidden.length) close();
      hidden = nextHidden;
      more.hidden = !hidden.length;
      more.textContent = `+${hidden.length}`;
      more.setAttribute('aria-label', `Show ${hidden.length} more tags`);
      more.title = hidden.join(', ');
      if (this.measurement) {
        const shown = count + (hidden.length ? 1 : 0);
        const used = chipWidths.slice(0, count).reduce((sum, width) => sum + width, 0)
          + (hidden.length ? more.getBoundingClientRect().width : 0)
          + Math.max(0, shown - 1) * 4;
        const fitted = Math.ceil(Math.min(cap, used));
        root.style.width = previousWidth;
        if (fitted !== lastMeasured) {
          lastMeasured = fitted;
          win.queueMicrotask(() => {
            if (!disposed && root.isConnected && lastMeasured === fitted) {
              view.dispatch({ effects: measuredLane.of({ ...this.measurement!, width: fitted }) });
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
    // The compact rail may stay the same width while the available cap grows.
    if (this.measurement) {
      observer.observe(view.contentDOM);
    }
    // Also observe chip sizes so theme/font changes update overflow.
    chips.forEach(chip => observer.observe(chip));
    schedule();
    mounts.set(root, { observer, close, cancel: () => { disposed = true; win.cancelAnimationFrame(frame); } });
    return root;
  }
  private applyAppearance(element: HTMLElement): void {
    element.style.setProperty('--margin-tags-font-family', this.typography.tagFontFamily || 'var(--font-interface)');
    element.style.setProperty('--margin-tags-font-size', tagFontSizeCss(this.typography.tagFontSize, this.typography.tagAutoPercent));
    element.style.setProperty('--margin-tags-font-weight', String(this.typography.tagFontWeight));
    element.style.setProperty('--margin-tags-font-style', this.typography.tagItalic ? 'italic' : 'normal');
    element.style.setProperty('--margin-tags-text-decoration', this.typography.tagUnderline ? 'underline' : 'none');
    element.style.setProperty('--margin-tags-padding-x', `${this.paddingX}px`);
    element.style.setProperty('--margin-tags-padding-y', `${this.paddingY}px`);
  }
  ignoreEvent(): boolean { return true; }
  destroy(dom: HTMLElement): void {
    const mounted = mounts.get(dom);
    mounted?.observer.disconnect(); mounted?.cancel(); mounted?.close();
    mounts.delete(dom);
  }
}
