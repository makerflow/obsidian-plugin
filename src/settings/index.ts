import FlowMode from '../flowMode/flowMode'

export interface MakerflowPluginSettings {
	continuousActivityThresholdInMinutes: number;
	allowedGapsInSeconds: number;
	detectionEvents: string[];
	toggleZen: boolean;
	flowMode: FlowMode|null;
	defaultFlowModeDurationInMinutes: number|null;
	integration: 'zen'|'prozen'|'none';
}
