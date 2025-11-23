/**
 * Standardized Command Interface
 */

import {handleError} from '../../util/ErrorHandler.js';
import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';
import {FormattingUtils} from '../utils/index.js';

export const __dirname = dirname(fileURLToPath(import.meta.url));
export const EXAMPLES_DIR = resolve(__dirname, '../../../examples');

// Helper to generate banner
export const createBanner = (title) => {
    const width = 60;
    const border = '═'.repeat(width);
    const padding = Math.max(0, Math.floor((width - title.length) / 2));
    const paddedTitle = ' '.repeat(padding) + title + ' '.repeat(width - title.length - padding);
    return `\n${border}\n${paddedTitle}\n${border}\n`;
};

// Base class for all commands
export class AgentCommand {
    constructor(name, description, usage) {
        this.name = name;
        this.description = description;
        this.usage = usage;
    }

    async execute(agent, ...args) {
        try {
            return await this._executeImpl(agent, ...args);
        } catch (error) {
            return handleError(error, `${this.name} command`, `❌ Error executing ${this.name} command`);
        }
    }

    async _executeImpl(agent, ...args) {
        throw new Error(`_executeImpl not implemented for command: ${this.name}`);
    }
}

// Registry
export class AgentCommandRegistry {
    constructor() {
        this.commands = new Map();
    }

    register(command) {
        if (!(command instanceof AgentCommand)) {
            throw new Error('Command must be an instance of AgentCommand');
        }
        this.commands.set(command.name, command);
    }

    get(name) {
        return this.commands.get(name);
    }

    getAll() {
        return Array.from(this.commands.values());
    }

    async execute(name, agent, ...args) {
        const command = this.get(name);
        if (!command) {
            return `❌ Unknown command: ${name}`;
        }
        return await command.execute(agent, ...args);
    }

    getHelp() {
        const commands = this.getAll();
        if (commands.length === 0) return 'No commands registered.';
        return commands.map(cmd =>
            `  ${cmd.name.padEnd(12)} - ${cmd.description}`
        ).join('\n');
    }
}
