/**
 * Standardized Command Interface
 */

import {handleError} from '../../util/ErrorHandler.js';
import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';

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
    constructor(name, description, usage, aliases = []) {
        this.name = name;
        this.description = description;
        this.usage = usage;
        this.aliases = aliases;
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

// Command wrapper for function handlers
export class FunctionCommand extends AgentCommand {
    constructor(name, handler, description = 'Custom command', usage = name) {
        super(name, description, usage);
        this.handler = handler;
    }

    async _executeImpl(agent, ...args) {
        return await this.handler(...args);
    }
}

// Registry
export class AgentCommandRegistry {
    constructor() {
        this.commands = new Map();
        this.aliases = new Map();
    }

    register(command) {
        if (!(command instanceof AgentCommand)) {
            throw new Error('Command must be an instance of AgentCommand');
        }
        this.commands.set(command.name, command);
        if (command.aliases && Array.isArray(command.aliases)) {
            command.aliases.forEach(alias => this.aliases.set(alias, command.name));
        }
    }

    get(name) {
        if (this.commands.has(name)) return this.commands.get(name);
        if (this.aliases.has(name)) return this.commands.get(this.aliases.get(name));
        return undefined;
    }

    getAll() {
        return Array.from(this.commands.values());
    }

    async execute(name, agent, ...args) {
        const command = this.get(name);
        if (!command) {
            // Check if there is a fallback or return error
            // Previously ReplMessageHandler returned "Unknown command"
            return `❌ Unknown command: ${name}`;
        }
        return await command.execute(agent, ...args);
    }

    getHelp() {
        const commands = this.getAll().sort((a, b) => a.name.localeCompare(b.name));
        if (commands.length === 0) return 'No commands registered.';
        return commands.map(cmd => {
            const aliasStr = cmd.aliases && cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';
            return `  ${cmd.name.padEnd(12)}${aliasStr} - ${cmd.description}`;
        }).join('\n');
    }

    has(name) {
        return this.commands.has(name) || this.aliases.has(name);
    }
}
