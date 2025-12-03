import fs from 'fs';
import { AGENT_EVENTS } from '../agent/constants.js';

/**
 * Logs the reasoning trajectory of the SeNARS agent.
 *
 * This component captures the internal state and decision-making process of the agent
 * at each step of a reasoning task. The logged data can be used for debugging,
 * analysis, and as input for the RLFP learner.
 */
class ReasoningTrajectoryLogger {
    constructor(agent) {
        this.agent = agent;
        this.eventBus = agent._eventBus;
        this.trajectory = [];
        this.isLogging = false;

        // Subscribe to relevant events
        // We use a mix of constants and string literals to catch everything
        const events = [
            [AGENT_EVENTS.LLM_PROMPT, 'llm_prompt'],
            [AGENT_EVENTS.TOOL_CALL, 'tool_call'],
            [AGENT_EVENTS.LLM_RESPONSE, 'lm_response'],
            ['lm.prompt', 'lm_prompt'],
            ['lm.response', 'lm_response'],
            ['lm.failure', 'lm_failure']
        ];

        events.forEach(([event, type]) =>
            this.eventBus.on(event, (data) => this.logStep(type, data))
        );
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
            try {
                fs.writeFileSync(filePath, JSON.stringify(this.trajectory, null, 2));
            } catch (error) {
                console.error(`Failed to write trajectory to ${filePath}:`, error);
            }
        }
        return this.trajectory;
    }
}

export {ReasoningTrajectoryLogger};
