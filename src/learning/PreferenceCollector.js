import {BaseComponent} from '../util/BaseComponent.js';

/**
 * Collects and manages preference data for RLFP.
 * Stores comparisons between reasoning trajectories.
 */
export class PreferenceCollector extends BaseComponent {
    constructor(config = {}) {
        super(config, 'PreferenceCollector');
        this.preferences = []; // List of preference records
    }

    /**
     * Records a preference between two trajectories.
     * @param {string} betterTrajectoryId - ID of the preferred trajectory/episode.
     * @param {string} worseTrajectoryId - ID of the less preferred trajectory/episode.
     * @param {string} [reason] - Optional text explanation.
     * @param {Object} [meta] - Additional metadata (userId, timestamp, etc).
     */
    recordPreference(betterTrajectoryId, worseTrajectoryId, reason = '', meta = {}) {
        const record = {
            id: `pref-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: Date.now(),
            betterId: betterTrajectoryId,
            worseId: worseTrajectoryId,
            reason,
            meta
        };

        this.preferences.push(record);
        this.logInfo(`Recorded preference: ${betterTrajectoryId} > ${worseTrajectoryId}`);
        return record;
    }

    /**
     * Retrieves all recorded preferences.
     */
    getAllPreferences() {
        return [...this.preferences];
    }

    /**
     * Exports preferences to JSON format.
     */
    exportJSON() {
        return JSON.stringify(this.preferences, null, 2);
    }

    /**
     * Imports preferences from JSON.
     */
    importJSON(jsonStr) {
        try {
            const prefs = JSON.parse(jsonStr);
            if (Array.isArray(prefs)) {
                this.preferences.push(...prefs);
                return true;
            }
            return false;
        } catch (e) {
            this.logError('Failed to import preferences', e);
            return false;
        }
    }
}
