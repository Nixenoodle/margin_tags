import { Plugin, PluginSettingTab, Setting, Notice, editorLivePreviewField, type App } from 'obsidian';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { createMarginField, configure, marginLayout } from './editor';
import { DEFAULTS, sanitizeSettings, type Settings } from './model';
import { TagRail } from './widget';

export default class MarginTagsPlugin extends Plugin {
  settings: Settings = { ...DEFAULTS };
  private views = new Set<EditorView>();

  async onload(): Promise<void> {
    this.settings = sanitizeSettings(await this.loadData());
    const plugin = this;
    this.registerEditorExtension([
      createMarginField({
        get settings() { return plugin.settings; },
        isLivePreview: state => state.field(editorLivePreviewField, false) === true,
        widget: (tags, width) => new TagRail(tags, width, {
          search: (tag, newPane) => { void plugin.openTag(tag, newPane); },
          href: tag => `obsidian://search?vault=${encodeURIComponent(plugin.app.vault.getName())}&query=${encodeURIComponent(`tag:${tag}`)}`,
        }),
      }),
      marginLayout,
      ViewPlugin.fromClass(class {
        constructor(readonly view: EditorView) { plugin.views.add(view); }
        destroy() { plugin.views.delete(this.view); }
      }),
    ]);
    this.addSettingTab(new MarginTagsSettings(this.app, this));
    this.addCommand({ id: 'toggle-margin-tags', name: 'Toggle margin tags', callback: async () => {
      this.settings.enabled = !this.settings.enabled;
      await this.applySettings();
      new Notice(`Margin tags ${this.settings.enabled ? 'enabled' : 'disabled'}`);
    } });
  }

  async applySettings(): Promise<void> {
    this.settings = sanitizeSettings(this.settings);
    for (const view of this.views) view.dispatch({ effects: configure.of({ ...this.settings }) });
    await this.saveData(this.settings);
  }

  private async openTag(tag: string, newPane: boolean): Promise<void> {
    try {
      const workspace = this.app.workspace;
      const leaf = newPane ? workspace.getLeaf('tab')
        : workspace.getLeavesOfType('search')[0] ?? workspace.getLeftLeaf(false);
      if (!leaf) { new Notice('Unable to open Search. Enable the Search core plugin.'); return; }
      await leaf.setViewState({ type: 'search', state: { query: `tag:${tag}` }, active: true });
      if (leaf.view.getViewType() !== 'search') {
        new Notice('Enable the Search core plugin to search tags.');
        return;
      }
      await workspace.revealLeaf(leaf);
    } catch (error) {
      console.error('Margin Tags: unable to open tag search', error);
      new Notice('Could not open tag search. Check that the Search core plugin is enabled.');
    }
  }
}

class MarginTagsSettings extends PluginSettingTab {
  constructor(app: App, private plugin: MarginTagsPlugin) { super(app, plugin); }
  display(): void {
    this.containerEl.empty();
    this.containerEl.createEl('h2', { text: 'Margin Tags' });
    new Setting(this.containerEl).setName('Enable margin tags')
      .setDesc('Show tags in a right-hand lane in Live Preview.')
      .addToggle(toggle => toggle.setValue(this.plugin.settings.enabled).onChange(async enabled => {
        this.plugin.settings.enabled = enabled;
        await this.plugin.applySettings();
      }));
    new Setting(this.containerEl).setName('Show tags inline while editing')
      .setDesc('On: reveal tags inline when the cursor or selection is in their line or paragraph. Off: keep them in the margin. You can edit tag text in Source mode. Tags still stay inline if there is no room for a margin.')
      .addToggle(toggle => toggle.setValue(this.plugin.settings.showInlineWhileEditing)
        .onChange(async showInlineWhileEditing => {
          this.plugin.settings.showInlineWhileEditing = showInlineWhileEditing;
          await this.plugin.applySettings();
        }));
    new Setting(this.containerEl).setName('Editing scope')
      .setDesc('Group tags by paragraph/list item or source line. This also controls where tags are revealed when Show tags inline while editing is on.')
      .addDropdown(dropdown => dropdown.addOption('paragraph', 'Paragraph').addOption('line', 'Line')
        .setValue(this.plugin.settings.mode).onChange(async mode => {
          this.plugin.settings.mode = mode === 'line' ? 'line' : 'paragraph';
          await this.plugin.applySettings();
        }));
    new Setting(this.containerEl).setName('Tag priority')
      .setDesc('Choose which end of the paragraph’s tag order is shown first. Lower-priority tags go into +N.')
      .addDropdown(dropdown => dropdown
        .addOption('left-to-right', 'Left to right (first tags first)')
        .addOption('right-to-left', 'Right to left (last tags first)')
        .setValue(this.plugin.settings.priority).onChange(async priority => {
          this.plugin.settings.priority = priority === 'right-to-left' ? 'right-to-left' : 'left-to-right';
          await this.plugin.applySettings();
        }));
    new Setting(this.containerEl).setName('Maximum margin width')
      .setDesc('Maximum width outside the text column. Uses existing right-hand space; tags stay inline when that space is too narrow. Readable line length can provide more margin in wide panes.')
      .addSlider(slider => slider.setLimits(80, 360, 10).setValue(this.plugin.settings.width)
        .setDynamicTooltip().onChange(async width => {
          this.plugin.settings.width = width;
          await this.plugin.applySettings();
        }));
  }
}
