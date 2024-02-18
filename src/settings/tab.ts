import {App, PluginSettingTab, Setting} from "obsidian";
import Makerflow from "../../main";

export class MakerflowSettingsTab extends PluginSettingTab {
	plugin: Makerflow;

	constructor(app: App, plugin: Makerflow) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h1', {text: 'Makerflow'});
		containerEl.createEl('br')
		containerEl.createEl('h3', {text: 'Flow Mode'});

		new Setting(containerEl)
			.setName('Default duration (in minutes)')
			.setDesc('The default duration of Flow Mode in minutes. Leave blank for untimed Flow Mode.')
			.addText(text => text
				.setPlaceholder('25')
				.setValue(this.plugin.settings.defaultFlowModeDurationInMinutes ? this.plugin.settings.defaultFlowModeDurationInMinutes.toString() : "")
				.onChange(async (value) => {
					if (value === "" || value === "0") {
						this.plugin.settings.defaultFlowModeDurationInMinutes = null;
					} else {
						this.plugin.settings.defaultFlowModeDurationInMinutes = parseInt(value);
						await this.plugin.saveSettings();
					}
				})
			);

		containerEl.createEl('h6', {text: 'Automatic trigger'})

		new Setting(containerEl)
			.setName('Threshold (in minutes)')
			.setDesc('Trigger Flow Mode when this many *continuous* minutes of activity are detected')
			.addText(text => {
					text
						.setPlaceholder('5')
						.setValue(this.plugin.settings.continuousActivityThresholdInMinutes.toString())
						.onChange(async (value) => {
							this.plugin.settings.continuousActivityThresholdInMinutes = parseInt(value);
							await this.plugin.saveSettings();
						});
					text.inputEl.setAttribute('type', 'number');
					text.inputEl.setAttribute('min', '1');
					text.inputEl.setAttribute('length', '3');
					return text;
				}
			);
		new Setting(containerEl)
			.setName('Allowed gaps (in seconds)')
			.setDesc('Allow gaps of this many seconds as part of continuous activity')
			.addText(text => {
					text
						.setPlaceholder('30')
						.setValue('30')
						.onChange(async (value) => {
							this.plugin.settings.allowedGapsInSeconds = parseInt(value);
							await this.plugin.saveSettings();
						});
					text.inputEl.setAttribute('type', 'number');
					text.inputEl.setAttribute('min', '1');
					text.inputEl.setAttribute(
						'max', String((this.plugin.settings.continuousActivityThresholdInMinutes * 60) - 1)
					);
					text.inputEl.setAttribute('length', '3');
					return text;
				}
			);
		containerEl.createEl('h6', {text: 'Detection events'})
		containerEl.createEl('p', {text: 'The following events will be used to detect activity.'});
		new Setting(containerEl)
			.setName('Mouse clicks')
			.setDesc('Should clicking anywhere in Obsidian be considered as productive activity?')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.detectionEvents.includes('click'))
				.onChange(async (value) => {
					if (value) {
						this.plugin.settings.detectionEvents.push('click');
					} else {
						this.plugin.settings.detectionEvents = this.plugin.settings.detectionEvents.filter(event => event !== 'click');
					}
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Keyboard input')
			.setDesc('Should typing anywhere in Obsidian be considered as productive activity?')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.detectionEvents.includes('keydown'))
				.onChange(async (value) => {
					if (value) {
						this.plugin.settings.detectionEvents.push('keydown');
					} else {
						this.plugin.settings.detectionEvents = this.plugin.settings.detectionEvents.filter(event => event !== 'keydown');
					}
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Scrolling')
			.setDesc('Should scrolling anywhere in Obsidian be considered as productive activity?')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.detectionEvents.includes('scroll'))
				.onChange(async (value) => {
					if (value) {
						this.plugin.settings.detectionEvents.push('scroll');
					} else {
						this.plugin.settings.detectionEvents = this.plugin.settings.detectionEvents.filter(event => event !== 'scroll');
					}
					await this.plugin.saveSettings();
				}));


		containerEl.createEl('br')
		containerEl.createEl('h3', {text: 'Zen view'});
		containerEl.createEl('h6', {text: 'Integration'})
		new Setting(containerEl)
			.setName('Plugin')
			.setDesc('Choose which plugin to use for zen view')
			.addDropdown(dropdown => dropdown
				.addOption('none', 'None')
				.addOption('zen', 'Zen')
				.addOption('prozen', 'Prozen')
				.setValue(this.plugin.settings.integration)
				.onChange(async (value) => {
					if (value === 'none' || value === 'zen' || value === 'prozen') {
						this.plugin.settings.integration = value;
						await this.plugin.saveSettings();
						this.display();
					}
				}));


		if (
			// @ts-ignore
			(this.plugin.settings.integration === 'zen' && this.app.plugins.plugins.hasOwnProperty('zen'))
			||
			// @ts-ignore
			(this.plugin.settings.integration === 'prozen' && this.app.plugins.plugins.hasOwnProperty('obsidian-prozen'))) {
			const toggleZen = new Setting(containerEl)
				.setName('Toggle Zen')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.toggleZen)
					.onChange(async (value) => {
						this.plugin.settings.toggleZen = value;
						await this.plugin.saveSettings();
					}));
			toggleZen.descEl.createEl('span', {text: 'Toggle Zen view when Flow Mode is triggered'});
		} else if (this.plugin.settings.integration === "zen" &&
			// @ts-ignore
			!this.app.plugins.plugins.hasOwnProperty('zen')) {
			containerEl.createEl('p', {text: 'The Zen plugin is not installed or enabled.'});
			containerEl.createEl('a', {
				text: 'Please install and enable the Zen plugin to use this feature.',
				href: 'obsidian://show-plugin?id=zen'
			});
		} else if (this.plugin.settings.integration === "prozen" &&
			// @ts-ignore
			!this.app.plugins.plugins.hasOwnProperty('obsidian-prozen')) {
			containerEl.createEl('p', {text: 'The ProZen plugin is not installed or enabled.'});
			containerEl.createEl('a', {
				text: 'Please install and enable the Prozen plugin to use this feature.',
				href: 'obsidian://show-plugin?id=prozen'
			});
		}
	}
}
