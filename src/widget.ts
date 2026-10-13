import { WidgetType, type EditorView } from '@codemirror/view';
import { visibleCount } from './model';

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
  constructor(readonly tags: string[], readonly width: number, readonly actions: TagActions) { super(); }
  eq(other: TagRail): boolean {
    return other.width === this.width && other.tags.length === this.tags.length
      && other.tags.every((tag, i) => tag === this.tags[i]);
  }
  toDOM(view: EditorView): HTMLElement {
    const doc = view.dom.ownerDocument;
    const win = doc.defaultView!;
    const root = doc.createElement('span');
    root.className = 'margin-tags-rail';
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
    const fit = () => {
      if (!root.isConnected) return;
      chips.forEach(chip => { chip.hidden = false; });
      more.hidden = false;
      // Measuring +total is a safe upper bound for any smaller overflow count.
      more.textContent = `+${this.tags.length}`;
      const count = visibleCount(chips.map(c => c.getBoundingClientRect().width),
        root.getBoundingClientRect().width, more.getBoundingClientRect().width);
      chips.forEach((chip, i) => { chip.hidden = i >= count; });
      const nextHidden = this.tags.slice(count);
      if (nextHidden.length !== hidden.length) close();
      hidden = nextHidden;
      more.hidden = !hidden.length;
      more.textContent = `+${hidden.length}`;
      more.setAttribute('aria-label', `Show ${hidden.length} more tags`);
      more.title = hidden.join(', ');
      reposition();
    };
    let frame = 0;
    const schedule = () => {
      win.cancelAnimationFrame(frame);
      frame = win.requestAnimationFrame(fit);
    };
    const observer = new win.ResizeObserver(schedule);
    observer.observe(root);
    // Also observe chip sizes so theme/font changes update overflow.
    chips.forEach(chip => observer.observe(chip));
    schedule();
    mounts.set(root, { observer, close, cancel: () => win.cancelAnimationFrame(frame) });
    return root;
  }
  ignoreEvent(): boolean { return true; }
  destroy(dom: HTMLElement): void {
    const mounted = mounts.get(dom);
    mounted?.observer.disconnect(); mounted?.cancel(); mounted?.close();
    mounts.delete(dom);
  }
}
