import fs from 'fs';
import inquirer from 'inquirer';

/**
 * Collects user preferences on reasoning trajectories.
 *
 * This component is responsible for presenting pairs of reasoning trajectories to the user
 * and collecting their feedback on which trajectory they prefer. This feedback is used
 * by the RLFPLearner to fine-tune the agent's language model.
 */
class PreferenceCollector {
    constructor() {
        this.preferences = [];
    }

    async collectPreference(pathA, pathB) {
        let trajectoryA, trajectoryB;
        try {
            trajectoryA = await this.loadTrajectory(pathA);
            trajectoryB = await this.loadTrajectory(pathB);
        } catch (e) {
            console.error("Error loading trajectories:", e.message);
            return null;
        }

        console.log('\n==========================================');
        console.log('=== Trajectory A ===');
        console.log(this._formatTrajectoryForDisplay(trajectoryA));
        console.log('\n=== Trajectory B ===');
        console.log(this._formatTrajectoryForDisplay(trajectoryB));
        console.log('==========================================\n');

        const answer = await inquirer.prompt([{
            type: 'list',
            name: 'preference',
            message: 'Which trajectory do you prefer?',
            choices: [
                {name: 'Trajectory A', value: 'A'},
                {name: 'Trajectory B', value: 'B'},
                {name: 'Skip / Neither', value: 'SKIP'}
            ]
        }]);

        if (answer.preference === 'SKIP') return null;

        const preferenceData = {
            trajectoryA,
            trajectoryB,
            preference: answer.preference,
            timestamp: Date.now(),
            files: {A: pathA, B: pathB}
        };

        this.preferences.push(preferenceData);
        return preferenceData;
    }

    async loadTrajectory(filePath) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }

    _formatTrajectoryForDisplay(trajectory) {
        if (!Array.isArray(trajectory)) return "Invalid trajectory format";

        return trajectory.map(step => {
            let content = "";
            const ts = step.timestamp ? new Date(step.timestamp).toISOString().split('T')[1].split('.')[0] : '';

            if (step.type === 'llm_prompt') {
                const msgContent = step.messages?.[0]?.content || step.messages || '';
                const preview = typeof msgContent === 'string' ? msgContent.substring(0, 100) : JSON.stringify(msgContent);
                content = `LLM Prompt: "${preview.replace(/\n/g, ' ')}..."`;
            } else if (step.type === 'tool_call') {
                content = `Tool Call: ${step.name}(${JSON.stringify(step.args)})`;
            } else if (step.type === 'lm_response') {
                 // Assuming agent response or similar
                 content = `Response: ${JSON.stringify(step.content || step)}`;
            } else {
                content = JSON.stringify(step);
            }
            return `${ts} [${step.type}] ${content}`;
        }).join('\n');
    }

    savePreferences(filePath) {
        fs.writeFileSync(filePath, JSON.stringify(this.preferences, null, 2));
        console.log(`Preferences saved to ${filePath}`);
    }
}

export {PreferenceCollector};
