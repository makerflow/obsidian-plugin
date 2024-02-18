import {MakerflowPluginSettings} from "../settings";

/**
 * FlowModeDetector class
 * This class is used to detect if the user is in a flow mode based on their activity.
 */
export default class FlowModeDetector {
	/**
	 * @property {MakerflowPluginSettings} settings - The settings for the Makerflow plugin.
	 */
	settings: MakerflowPluginSettings;

	/**
	 * @property {Set<number>} heartbeats - A set of timestamps representing the user's activity.
	 */
	heartbeats: Set<number> = new Set();

	/**
	 * @constructor
	 * @param {MakerflowPluginSettings} settings - The settings for the Makerflow plugin.
	 */
	constructor(settings: MakerflowPluginSettings) {
		this.settings = settings;
	}

	/**
	 * Adds a new timestamp to the heartbeats set.
	 */
	heartbeat() {
		this.heartbeats.add(Date.now());
	}

	/**
	 * Clears all the timestamps from the heartbeats set.
	 */
	resetHeartbeats() {
		this.heartbeats.clear();
	}

	/**
	 * Checks if the user's activity meets the threshold for being in a flow mode.
	 *
	 * @returns {[boolean, number]} - A tuple containing a boolean indicating if the user meets the threshold and
	 * the remaining time needed to meet the threshold.
	 */
	meetsThreshold(): [boolean, number] {
		// Set the limit for the time range to check
		const threshold = this.settings.continuousActivityThresholdInMinutes;
		const thresholdMillis = threshold * 60 * 1000;
		if (this.settings.flowMode) return [false, thresholdMillis];
		if (this.heartbeats.size <= 2) return [false, thresholdMillis];

		// Get the current timestamp
		const now = Date.now();

		const slackThresholdInMilliseconds = this.settings.allowedGapsInSeconds * 1000;
		const cutoff = now - (thresholdMillis + slackThresholdInMilliseconds);

		// Filter the heartbeats array to only include timestamps within the threshold
		const heartbeats = Array.from(this.heartbeats).filter(heartbeat => heartbeat > cutoff);

		let continuousProductiveTime = 0;
		let slackTimeUsed = 0;
		const continuousProductiveThresholdInMilliseconds = 10 * 1000;

		// If there are no heartbeats, then return
		if (heartbeats.length === 0) return [false, thresholdMillis];

		const firstActivity = heartbeats[0];
		let prevActivity = heartbeats[0];
		let resetHeartbeats = false;

		// Loop through all activities and check if the user is continuously productive
		for (let i = 1; i < heartbeats.length; i++) {
			const currentActivity = heartbeats[i];
			// Calculate the time difference between the current activity and the previous activity
			const timeDifference = currentActivity - prevActivity

			// If the current activity is a productive app and the time difference is less than the threshold,
			// then add the time difference to the continuous productive time
			let wasProductive = false;
			if (timeDifference <= continuousProductiveThresholdInMilliseconds) {
				// calculate the continuous productive time, by getting time difference between the current activity and the first activity
				continuousProductiveTime = currentActivity - firstActivity;
				wasProductive = true;
			} else if (timeDifference <= slackThresholdInMilliseconds) {
				// Let the user slack for an acceptable amount of time
				slackTimeUsed += timeDifference;
			}
			if ((!wasProductive && timeDifference > slackThresholdInMilliseconds) || slackTimeUsed > slackThresholdInMilliseconds) {
				// They slacked for too long, reset the continuous productive time
				continuousProductiveTime = 0;
				slackTimeUsed = 0;
				resetHeartbeats = true;
			}
			prevActivity = currentActivity;
		}

		const validProductiveTime = continuousProductiveTime + slackTimeUsed;
		const meetsThreshold = validProductiveTime >= thresholdMillis;
		const remainingTime = thresholdMillis - validProductiveTime;

		if (resetHeartbeats) {
			this.resetHeartbeats();
		} else {
			this.heartbeats = new Set(Array.from(this.heartbeats).filter(heartbeat => heartbeat > cutoff));
		}
		return [meetsThreshold, remainingTime];
	}
}
