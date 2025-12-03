import fs from 'fs';

/**
 * Fine-tunes the language model based on user preferences.
 *
 * This component uses the preferences collected by the PreferenceCollector to
 * update the weights of the language model. The goal is to train the model
 * to produce reasoning trajectories that are more aligned with user preferences.
 *
 * POC Implementation: Saves preference pairs to a JSONL file for future fine-tuning.
 */
class RLFPLearner {
    constructor(agent) {
        this.agent = agent;
        this.outputFile = 'rlfp_training_data.jsonl';
    }

    updateModel(preferences) {
        const prefs = Array.isArray(preferences) ? preferences : [preferences];
        const validPrefs = prefs.filter(p => p && p.preference && p.preference !== 'SKIP');

        if (validPrefs.length === 0) {
            console.log('RLFPLearner: No valid preferences to learn from.');
            return;
        }

        console.log(`RLFPLearner: Processing ${validPrefs.length} preference(s)...`);

        let count = 0;
        validPrefs.forEach(pref => {
            const entry = this._prepareTrainingEntry(pref);
            if (entry) {
                this._appendToFile(entry);
                count++;
            }
        });

        console.log(`RLFPLearner: Appended ${count} training examples to ${this.outputFile}`);
    }

    _prepareTrainingEntry(pref) {
        // Construct a training example (DPO style: prompt, chosen, rejected)
        // Extract the prompt from the trajectory if possible
        const promptStep = pref.trajectoryA.find(s => s.type === 'llm_prompt');
        const prompt = promptStep ? promptStep.messages : "unknown_prompt";

        const chosenTraj = pref.preference === 'A' ? pref.trajectoryA : pref.trajectoryB;
        const rejectedTraj = pref.preference === 'A' ? pref.trajectoryB : pref.trajectoryA;

        return {
            timestamp: Date.now(),
            prompt: prompt,
            chosen: this._extractCompletion(chosenTraj),
            rejected: this._extractCompletion(rejectedTraj),
            full_chosen_trajectory: chosenTraj,
            full_rejected_trajectory: rejectedTraj
        };
    }

    _extractCompletion(trajectory) {
        // Extract the text content of the agent's actions/responses
        return trajectory
            .filter(s => s.type !== 'llm_prompt')
            .map(s => {
                if (s.type === 'tool_call') return `<tool_call>${s.name}(${JSON.stringify(s.args)})</tool_call>`;
                if (s.type === 'lm_response') return s.content; // assuming content exists
                return JSON.stringify(s);
            })
            .join('\n');
    }

    _appendToFile(entry) {
        try {
            fs.appendFileSync(this.outputFile, JSON.stringify(entry) + '\n');
        } catch (error) {
            console.error(`RLFPLearner Error writing to ${this.outputFile}:`, error.message);
        }
    }
}

export {RLFPLearner};
