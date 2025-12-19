import { AGENT_EVENTS } from '../agent/constants.js';

export class ReplMessageHandler {
    constructor(engine) {
        this.engine = engine;
    }

    async processMessage(message) {
        const { type, payload } = message;

        try {
            if (type.startsWith('control/')) {
                const action = type.split('/')[1];
                switch (action) {
                    case 'start':
                        return await this.engine.startAutoStep(10);
                    case 'stop':
                        return this.engine._stopRun();
                    case 'step':
                        return await this.engine.step();
                    default:
                        return { error: `Unknown control action: ${action}` };
                }
            }

            if (type.startsWith('/')) {
                // Command
                const cmd = type.substring(1);
                // Simple parsing if needed, but TUI handles parsing mostly
                // If TUI passes just type="/help", we execute it
                // If TUI passed full command string in type, we split it
                const parts = cmd.split(' ');
                const commandName = parts[0];
                const args = parts.slice(1);

                return await this.engine.executeCommand(commandName, ...args);
            }

            if (type === 'narseseInput') {
                return await this.engine.processNarsese(payload);
            }

            // Fallback: treat type as command string if not one of above
            return await this.engine.executeCommand(type);

        } catch (error) {
            return { error: error.message };
        }
    }
}
