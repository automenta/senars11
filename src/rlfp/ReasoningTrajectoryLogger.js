/**
 * Logs the reasoning trajectory of the SeNARS agent.
 *
 * This component captures the internal state and decision-making process of the agent
 * at each step of a reasoning task. The logged data can be used for debugging,
 import fs from 'fs';
 import { AGENT_EVENTS } from '../agent/constants.js';
 * analysis, and as input for the RLFP learner.
 */
class ReasoningTrajectoryLogger {
    constructor(agent) {
        this.agent = agent;
        this.eventBus = agent._eventBus;
        this.trajectory = [];
        this.isLogging = false;

        this.eventBus.on(AGENT_EVENTS.LLM_PROMPT, (data) => this.logStep('llm_prompt', data));
        this.eventBus.on(AGENT_EVENTS.TOOL_CALL, (data) => this.logStep('tool_call', data));

        // Listen to granular hybrid reasoning events
        this.eventBus.on('lm.prompt', (data) => this.logStep('lm_prompt', data));
        this.eventBus.on('lm.response', (data) => this.logStep('lm_response', data));
        this.eventBus.on('lm.failure', (data) => this.logStep('lm_failure', data));
    }

    startTrajectory() {
        this.trajectory = [];
        this.isLogging = true;
    }

    logStep(type, data) {
        if (!this.isLogging) return;
        this.trajectory.push({
            timestamp: Date.now(),
            type,
            ...data
        });
    }

    endTrajectory(filePath) {
        this.isLogging = false;
        if (filePath) {
            fs.writeFileSync(filePath, JSON.stringify(this.trajectory, null, 2));
        }
        return this.trajectory;
    }
}

export {ReasoningTrajectoryLogger};
