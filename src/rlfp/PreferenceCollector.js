/**
 * Collects user preferences on reasoning trajectories.
 *
 * This component is responsible for presenting pairs of reasoning trajectories to the user
 * and collecting their feedback on which trajectory they prefer. This feedback is used
import fs from 'fs';
 * by the RLFPLearner to fine-tune the agent's language model.
 */
class PreferenceCollector {
    constructor(reader) {
        this.preferences = [];
        this.reader = reader;
    }

    async collectPreference(pathA, pathB) {
        const trajectoryA = await this.loadTrajectory(pathA);
        const trajectoryB = await this.loadTrajectory(pathB);

        console.log('--- Trajectory A ---');
        console.log(this._formatTrajectoryForDisplay(trajectoryA));
        console.log('--- Trajectory B ---');
        console.log(this._formatTrajectoryForDisplay(trajectoryB));

        const preference = await this._getUserInput('Which trajectory is better? (A/B): ');
        const preferenceData = { trajectoryA, trajectoryB, preference };
        this.preferences.push(preferenceData);
        return preferenceData;
    }

    async loadTrajectory(filePath) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }

    _formatTrajectoryForDisplay(trajectory) {
        return trajectory.map(step => `[${step.type}] ${JSON.stringify(step)}`).join('\n');
    }

    _getUserInput(prompt) {
        return new Promise(resolve => {
            this.reader.question(prompt, answer => {
                resolve(answer.trim().toUpperCase());
            });
        });
    }
}

export { PreferenceCollector };
