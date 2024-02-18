import { Plugin, moment, setIcon, Notice, Command } from 'obsidian'
import { MakerflowPluginSettings } from './src/settings'
import { DEFAULT_SETTINGS } from './src/settings/default'
import { MakerflowSettingsTab } from './src/settings/tab'
import FlowModeDetector from './src/service/flowModeDetector'
import FlowMode from './src/flowMode/flowMode'
import SetTimerModal from './src/flowMode/setTimerModal'


export default class Makerflow extends Plugin {
	settings: MakerflowPluginSettings
	flowModeDetector: FlowModeDetector
	statusBarText: HTMLElement
	toggleCommand: Command

	async heartbeat() {
		this.flowModeDetector.heartbeat()
	}

	async onload() {
		await this.loadSettings()
		this.flowModeDetector = new FlowModeDetector(this.settings)
		const statusBarItem = this.addStatusBarItem()
		// Use pointer cursor for the status bar item
		statusBarItem.style.cursor = 'pointer'
		const icon = statusBarItem.createEl('span')
		setIcon(icon, 'laptop')
		this.statusBarText = statusBarItem.createEl('span')

		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(this.app.vault.on('create', (file) => {
				this.heartbeat()
			}))
			this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
				this.heartbeat()
			}))
			this.registerEvent(this.app.vault.on('delete', (file) => {
				this.heartbeat()
			}))
			this.registerEvent(this.app.vault.on('modify', (file) => {
				this.heartbeat()
			}))
		})

		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			this.heartbeat()
		})
		this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			this.heartbeat()
		})
		this.registerDomEvent(document, 'scroll', (evt: Event) => {
			this.heartbeat()
		})


		this.registerInterval(window.setInterval(() => {
			if (this.settings.flowMode) {
				this.updateFlowModeTime()
				return
			}
			const [meetsThreshold, remainingTime] = this.flowModeDetector.meetsThreshold()
			if (meetsThreshold) {
				this.enableFlowMode().catch(console.error)
			} else {
				// Determine remaining time in minutes:seconds
				const minutes = Math.floor(remainingTime / 60000)
				const seconds = ((remainingTime % 60000) / 1000).toFixed(0)
				const formattedRemainingTime = `${minutes}:${parseInt(seconds) < 10 ? '0' : ''}${seconds}`
				this.statusBarText.setText(`${formattedRemainingTime} to Flow Mode`)
			}
		}, 1000))

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MakerflowSettingsTab(this.app, this))
		this.toggleCommand = this.addCommand({
			id: 'toggle-flow-mode',
			name: 'Toggle Flow Mode',
			callback: () => {
				this.toggleFlowMode()
			}
		})
		this.addRibbonIcon('laptop', 'Toggle Flow Mode', async () => {
			this.toggleFlowMode()
		})
		statusBarItem.addEventListener('click', () => {
			this.toggleFlowMode()
		});
	}

	private toggleFlowMode() {
		if (this.settings.flowMode) {
			this.disableFlowMode().catch(console.error)
		} else {
			this.enableFlowMode().catch(console.error)
		}
	}

	private async showTimerModal() {
		const modal = new SetTimerModal(this.app, this.settings, this.saveSettings.bind(this), this.enableFlowMode.bind(this))
		modal.open()
	}

	private async enableFlowMode(duration?: number) {
		const flowMode = new FlowMode()
		flowMode.start = Date.now()
		if (duration) {
			flowMode.scheduledEnd = flowMode.start + (duration * 60 * 1000)
		} else if (this.settings.defaultFlowModeDurationInMinutes) {
			flowMode.scheduledEnd = flowMode.start + (this.settings.defaultFlowModeDurationInMinutes * 60 * 1000)
		}
		this.settings.flowMode = flowMode
		this.updateFlowModeTime()
		await this.saveSettings()
		this.flowModeDetector.resetHeartbeats()
		// @ts-ignore
		if (this.settings.toggleZen && this.settings.integration === 'zen' && this.app.plugins.plugins.hasOwnProperty('zen')) {
			// @ts-ignore
			const zenPlugin = this.app.plugins.plugins['zen']
			if (!zenPlugin.settings.enabled) {
				// Execute the "zen:toggle" command
				// @ts-ignore
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				// noinspection JSUnresolvedReference
				this.app.commands.executeCommandById('zen:toggle')
			}
		} else if (this.settings.toggleZen && this.settings.integration === 'prozen'
			// @ts-ignore
			&& this.app.plugins.plugins.hasOwnProperty('obsidian-prozen')) {
			// @ts-ignore
			const prozenPlugin = this.app.plugins.plugins['obsidian-prozen']
			if (!prozenPlugin.settings.enabled) {
				// Execute the "obsidian-prozen:zenmode" command
				// @ts-ignore
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				// noinspection JSUnresolvedReference
				this.app.commands.executeCommandById('obsidian-prozen:zenmode')
			}
		}
		const notice = new Notice('Flow Mode started', 15000)
		// Add a button to allow the user to stop the flow mode
		notice.noticeEl.createEl('br')
		notice.noticeEl.createEl('br')
		const stopBtn = notice.noticeEl.createEl('a', { text: 'Stop', attr: { href: '#' }})
		stopBtn.addEventListener('click', () => {
			this.disableFlowMode().catch(console.error)
		})
		// Add a button to allow the user to extend the flow mode
		if (!flowMode.scheduledEnd) {
			notice.noticeEl.createEl('span', { text: '\t' })
			const setTimerBtn = notice.noticeEl.createEl('a', { text: 'Set timer', attr: { href: '#' }})
			setTimerBtn.addEventListener('click', () => {
				this.showTimerModal().catch(console.error)
			})
		}
	}

	private updateFlowModeTime() {
		if (!this.settings.flowMode) return
		// Format the time remaining in the flow mode as minutes:seconds, using scheduled end if available, otherwise using start
		if (this.settings.flowMode.scheduledEnd) {
			const remainingTime = this.settings.flowMode.scheduledEnd - Date.now()
			const minutes = Math.floor(remainingTime / 60000)
			const seconds = ((remainingTime % 60000) / 1000).toFixed(0)
			const formattedRemainingTime = `${minutes}:${parseInt(seconds) < 10 ? '0' : ''}${seconds}`
			this.statusBarText.setText(`Flow Mode: ${formattedRemainingTime}`)
		} else {
			const elapsed = moment.duration(moment().diff(moment(this.settings.flowMode.start)))
			const seconds = elapsed.seconds()
			const formattedElapsed = `${elapsed.minutes()}:${seconds < 10 ? '0' : ''}${seconds}`
			this.statusBarText.setText(`Flow Mode: ${formattedElapsed}`)
		}
	}

	private async disableFlowMode() {
		this.settings.flowMode = null
		await this.saveSettings()
		this.flowModeDetector.resetHeartbeats()
		// @ts-ignore
		if (this.settings.toggleZen && this.settings.integration === "zen" && this.app.plugins.plugins.hasOwnProperty('zen')) {
			// @ts-ignore
			const zenPlugin = this.app.plugins.plugins['zen']
			if (zenPlugin.settings.enabled) {
				// Execute the "zen:toggle" command
				// @ts-ignore
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				// noinspection JSUnresolvedReference
				this.app.commands.executeCommandById('zen:toggle')
			}
		} else // @ts-ignore
			if (this.settings.toggleZen && this.settings.integration === "prozen" && this.app.plugins.plugins.hasOwnProperty('obsidian-prozen')) {
				// @ts-ignore
				const prozenPlugin = this.app.plugins.plugins['obsidian-prozen']
				if (prozenPlugin.settings.enabled) {
					// Execute the "obsidian-prozen:zenmode" command
					// @ts-ignore
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call
					// noinspection JSUnresolvedReference
					this.app.commands.executeCommandById('obsidian-prozen:zenmode')
				}

		}

	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}

}

