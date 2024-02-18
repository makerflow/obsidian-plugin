import {MakerflowPluginSettings} from "./index";

export const DEFAULT_SETTINGS: MakerflowPluginSettings = {
	continuousActivityThresholdInMinutes: 5,
	allowedGapsInSeconds: 30,
	detectionEvents: ['keydown', 'click', 'scroll'],
	toggleZen: true,
	flowMode: null,
	defaultFlowModeDurationInMinutes: null,
	integration: 'none'
}
