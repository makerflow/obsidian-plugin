import { App, FuzzySuggestModal } from 'obsidian'
import { MakerflowPluginSettings } from '../settings'

class TimedFlowModeDuration {
	duration: number

	constructor(duration: number) {
		this.duration = duration
	}
}

export default class SetTimerModal extends FuzzySuggestModal<TimedFlowModeDuration> {
	settings: MakerflowPluginSettings
	saveSettings: () => void
	enableFlowMode: (duration: number) => void

	constructor(app: App, settings: MakerflowPluginSettings, saveSettings: () => void, enableFlowMode: (duration: number) => void) {
		super(app)
		this.settings = settings
		this.saveSettings = saveSettings
		this.enableFlowMode = enableFlowMode
	}

	getItems(): TimedFlowModeDuration[] {
		return [
			new TimedFlowModeDuration(25),
			new TimedFlowModeDuration(50),
			new TimedFlowModeDuration(75)
		]
	}

	onChooseItem(item: TimedFlowModeDuration, evt: MouseEvent | KeyboardEvent): void {
		if (this.settings.flowMode) {
			this.settings.flowMode.scheduledEnd = Date.now() + item.duration * 60 * 1000
			this.saveSettings()
		} else {
			this.enableFlowMode(item.duration)
		}
	}

	getItemText(item: TimedFlowModeDuration): string {
		return `${item.duration} minutes`
	}

}
