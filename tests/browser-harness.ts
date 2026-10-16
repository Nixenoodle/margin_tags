import { EditorState, StateEffect, StateField } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { createMarginField, configure, marginLayout } from '../src/editor';
import { TagRail } from '../src/widget';
import { DEFAULTS } from '../src/model';
import { testLanguage } from './parser';
const toggleLP = StateEffect.define<boolean>();
const lp = StateField.define({ create: () => true, update: (v, tr) => tr.effects.find(e => e.is(toggleLP))?.value ?? v });
const clicks: string[] = [];
const source = `Editing this paragraph keeps its tags inline. #editing\n\nPrepare the launch notes and send them for review. #product #design #release #team/europe #follow-up #long-tag-that-needs-to-be-folded\n\nThis paragraph spans two source lines. #research\nIts tags share the same margin and editing scope. #writing\n\n- First task #todo #planning\n- Second task #done\n\nInline code stays untouched: \`#not-a-tag\`.\n\n#tags-only #another #third #fourth\n\nLast paragraph.`;
const field = createMarginField({ settings: DEFAULTS, isLivePreview: s => s.field(lp),
  widget: (tags, width, settings, measurement) => new TagRail(tags, width, { href: t => `#search-${t}`, search: t => { clicks.push(t); } }, settings.tagPaddingX, settings.tagPaddingY, settings, measurement) });
const view = new EditorView({ parent: document.querySelector('#editor')!, state: EditorState.create({
  doc: source, extensions: [testLanguage, lp, field, marginLayout, EditorView.lineWrapping]
}) });
Object.assign(window, { harness: { view, source, clicks,
  move: (text: string) => view.dispatch({ selection: { anchor: source.indexOf(text) } }),
  disable: () => view.dispatch({ effects: configure.of({ ...DEFAULTS, enabled: false }) }),
  reverse: () => view.dispatch({ effects: configure.of({ ...DEFAULTS, priority: 'right-to-left' }) }),
  sourceMode: () => view.dispatch({ effects: toggleLP.of(false) }),
  enable: () => view.dispatch({ effects: [configure.of(DEFAULTS), toggleLP.of(true)] }),
  inside: () => view.dispatch({ effects: [configure.of({ ...DEFAULTS, tagsOutside: false, showInlineWhileEditing: false }), toggleLP.of(true)] }),
} });
