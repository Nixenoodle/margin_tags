import { Plugin, PluginSettingTab, Setting, Notice, editorLivePreviewField, type App } from 'obsidian';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { createMarginField, configure, createMarginLayout } from './editor';
import { DEFAULTS, sanitizeSettings, type Settings } from './model';
import { TagRail } from './widget';
import { bindNumberControl } from './number-control';

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
        widget: (tags, width, settings, measurement) => new TagRail(tags, width, {
          search: (tag, newPane) => { void plugin.openTag(tag, newPane); },
          href: tag => `obsidian://search?vault=${encodeURIComponent(plugin.app.vault.getName())}&query=${encodeURIComponent(`tag:${tag}`)}`,
        }, settings.tagPaddingX, settings.tagPaddingY, {
          tagFontFamily: settings.tagFontFamily, tagFontSize: settings.tagFontSize,
          tagAutoPercent: settings.tagAutoPercent, tagFontWeight: settings.tagFontWeight, tagItalic: settings.tagItalic,
          tagUnderline: settings.tagUnderline,
        }, measurement),
      }),
      createMarginLayout(() => plugin.settings.marginGap),
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
    new Setting(this.containerEl).setName('Place tags outside text area')
      .setDesc('On: use the existing margin outside the text column. Off: place tags inside the right edge, reserving space so they do not overlap text. Inside placement also works when no outside margin is available.')
      .addToggle(toggle => toggle.setValue(this.plugin.settings.tagsOutside).onChange(async value => {
        this.plugin.settings.tagsOutside = value;
        await this.plugin.applySettings();
      }));
    new Setting(this.containerEl).setName('Show tags inline while editing')
      .setDesc('On: reveal tags inline when the cursor or selection is in their line or paragraph. Off: keep them in the margin. You can edit tag text in Source mode. In outside placement, tags stay inline if there is no room for a margin.')
      .addToggle(toggle => toggle.setValue(this.plugin.settings.showInlineWhileEditing)
        .onChange(async showInlineWhileEditing => {
          this.plugin.settings.showInlineWhileEditing = showInlineWhileEditing;
          await this.plugin.applySettings();
        }));
    new Setting(this.containerEl).setName('Keep inline-field tags inline')
      .setDesc('Keep tags in key:: value fields inline, such as tags:: #source/book #status/reading. Also supports [key:: value] and (key:: value). Turn off to allow these tags in the margin.')
      .addToggle(toggle => toggle.setValue(this.plugin.settings.keepInlineFieldTags)
        .onChange(async keepInlineFieldTags => {
          this.plugin.settings.keepInlineFieldTags = keepInlineFieldTags;
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
    new Setting(this.containerEl).setName('Tag font family')
      .setDesc('Use a font installed on your device, such as Georgia or Arial. A comma-separated fallback list is supported. Leave blank for Obsidian’s interface font.')
      .addText(text => text.setPlaceholder('Default interface font').setValue(this.plugin.settings.tagFontFamily)
        .onChange(async value => {
          this.plugin.settings.tagFontFamily = value;
          await this.plugin.applySettings();
        }));
    new Setting(this.containerEl).setName('Tag font size')
      .setDesc('Choose a size in pixels, or Automatic to scale with the note font using the percentage below. Larger tags may move into +N sooner.')
      .addDropdown(dropdown => {
        dropdown.addOption('0', 'Automatic (use percentage below)');
        for (let size = 8; size <= 32; size++) dropdown.addOption(String(size), `${size} px`);
        dropdown.setValue(String(this.plugin.settings.tagFontSize)).onChange(async value => {
          this.plugin.settings.tagFontSize = Number(value);
          await this.plugin.applySettings();
        });
      });
    this.numberSetting('Automatic font size percentage',
      'Tag size as a percentage of the note font: 100% matches it, 78% is the default. Applies only when Tag font size is Automatic.',
      'tagAutoPercent', 25, 200, '%');
    new Setting(this.containerEl).setName('Tag font weight')
      .setDesc('Choose Regular, Bold, or another weight. The available appearance depends on the selected font.')
      .addDropdown(dropdown => {
        const labels = ['Thin', 'Extra light', 'Light', 'Regular', 'Medium', 'Semibold', 'Bold', 'Extra bold', 'Black'];
        labels.forEach((label, i) => dropdown.addOption(String((i + 1) * 100), `${label} (${(i + 1) * 100})`));
        dropdown.setValue(String(this.plugin.settings.tagFontWeight)).onChange(async value => {
          this.plugin.settings.tagFontWeight = Number(value);
          await this.plugin.applySettings();
        });
      });
    new Setting(this.containerEl).setName('Italic tags')
      .addToggle(toggle => toggle.setValue(this.plugin.settings.tagItalic).onChange(async value => {
        this.plugin.settings.tagItalic = value;
        await this.plugin.applySettings();
      }));
    new Setting(this.containerEl).setName('Underline tags')
      .addToggle(toggle => toggle.setValue(this.plugin.settings.tagUnderline).onChange(async value => {
        this.plugin.settings.tagUnderline = value;
        await this.plugin.applySettings();
      }));
    this.numberSetting('Tag horizontal padding',
      'Space inside each margin tag on the left and right. Default: 7 px. Larger padding fits fewer tags before +N.',
      'tagPaddingX', 0, 24, 'px');
    this.numberSetting('Tag vertical padding',
      'Space inside each margin tag above and below the label. Default: 1 px. Larger padding increases the tagged line’s minimum height to avoid overlap.',
      'tagPaddingY', 0, 12, 'px');
    this.numberSetting('Distance from text',
      'Move tags closer to or farther from the text column. Lower values bring them closer; 0 removes the extra gap. Default: 12 px. Inside placement caps the gap at 10% of the text column.',
      'marginGap', 0, 80, 'px');
    this.numberSetting('Maximum margin width',
      'Maximum tag lane width. Outside: limited by spare margin space. Inside: each group uses only the width its displayed tags need, up to this maximum and 38% of the text column.',
      'width', 80, 360, 'px');
  }

  private numberSetting(name: string, description: string,
    key: 'tagAutoPercent' | 'tagPaddingX' | 'tagPaddingY' | 'marginGap' | 'width',
    min: number, max: number, unit: string): void {
    const setting = new Setting(this.containerEl).setName(name)
      .setDesc(`${description} Drag the slider, or type a number and press Enter or leave the field to apply.`);
    setting.controlEl.classList.add('margin-tags-number-control');
    setting.addSlider(slider => {
      slider.setLimits(min, max, 1).setValue(this.plugin.settings[key]).setDynamicTooltip();
      slider.sliderEl.setAttribute('aria-label', `${name} (${unit})`);
      setting.addText(text => {
        text.inputEl.classList.add('margin-tags-number-input');
        text.inputEl.setAttribute('aria-label', `${name} (${unit}), exact value`);
        bindNumberControl(slider.sliderEl, text.inputEl, min, max, this.plugin.settings[key], value => {
          this.plugin.settings[key] = value;
          void this.plugin.applySettings();
        });
      });
    });
    setting.controlEl.createSpan({ text: unit, cls: 'margin-tags-number-unit' });
  }
}
