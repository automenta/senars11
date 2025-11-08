/**
 * Command Manager - handles extensible command system for TUI
 */
export class CommandManager {
    constructor() {
        this.commands = new Map();
        this.aliases = new Map();
        this.categories = new Map();
        this.history = [];
        this.maxHistory = 100;
    }

    /**
     * Register a new command
     * @param {string} name - Command name
     * @param {Function} handler - Command handler function
     * @param {Object} metadata - Command metadata
     */
    registerCommand(name, handler, metadata = {}) {
        if (typeof handler !== 'function') {
            throw new Error(`Command handler for ${name} must be a function`);
        }

        const command = {
            name,
            handler,
            metadata: {
                description: 'No description provided',
                usage: '',
                category: 'general',
                aliases: [],
                ...metadata
            }
        };

        this.commands.set(name, command);

        // Register aliases
        if (command.metadata.aliases && Array.isArray(command.metadata.aliases)) {
            command.metadata.aliases.forEach(alias => {
                this.aliases.set(alias, name);
            });
        }

        // Add to category
        const category = command.metadata.category;
        if (!this.categories.has(category)) {
            this.categories.set(category, []);
        }
        this.categories.get(category).push(name);

        return this;
    }

    /**
     * Execute a command
     * @param {string} commandName - Command name or alias
     * @param {Array} args - Command arguments
     * @param {Object} context - Execution context (engine, UI components, etc.)
     * @returns {Promise<any>} Command execution result
     */
    async executeCommand(commandName, args = [], context = {}) {
        // Resolve alias to actual command name
        const actualCommandName = this.aliases.get(commandName) || commandName;

        if (!this.commands.has(actualCommandName)) {
            throw new Error(`Command '${commandName}' not found`);
        }

        const command = this.commands.get(actualCommandName);
        
        // Add to history
        this._addToHistory({ name: actualCommandName, args, timestamp: Date.now() });

        try {
            const result = await command.handler(args, context);
            return result;
        } catch (error) {
            console.error(`Error executing command ${commandName}:`, error);
            throw error;
        }
    }

    /**
     * Get a command by name
     * @param {string} name - Command name
     * @returns {Object|null} Command object or null
     */
    getCommand(name) {
        const actualName = this.aliases.get(name) || name;
        return this.commands.get(actualName) || null;
    }

    /**
     * Check if a command exists
     * @param {string} name - Command name
     * @returns {boolean} True if command exists
     */
    hasCommand(name) {
        return this.commands.has(name) || this.aliases.has(name);
    }

    /**
     * Get commands by category
     * @param {string} category - Category name
     * @returns {Array} Array of command names
     */
    getCommandsByCategory(category) {
        return this.categories.get(category) || [];
    }

    /**
     * Get all command names
     * @returns {Array} Array of command names
     */
    getAllCommandNames() {
        return Array.from(this.commands.keys());
    }

    /**
     * Get all commands with metadata
     * @returns {Object} Object with command information
     */
    getAllCommands() {
        const result = {};
        for (const [name, command] of this.commands) {
            result[name] = {
                name: command.name,
                description: command.metadata.description,
                usage: command.metadata.usage,
                category: command.metadata.category,
                aliases: command.metadata.aliases
            };
        }
        return result;
    }

    /**
     * Get command help
     * @param {string} commandName - Command name
     * @returns {string} Help text
     */
    getCommandHelp(commandName) {
        const command = this.getCommand(commandName);
        if (!command) return `Command '${commandName}' not found`;

        const aliases = command.metadata.aliases.length 
            ? ` (Aliases: ${command.metadata.aliases.join(', ')})` 
            : '';
            
        return `${command.name}: ${command.metadata.description}${aliases}\nUsage: ${command.metadata.usage}`;
    }

    /**
     * Get all command help
     * @returns {string} Complete help text
     */
    getAllHelp() {
        const categories = Array.from(this.categories.keys()).sort();
        let helpText = 'Available commands:\n\n';
        
        for (const category of categories) {
            helpText += `--- ${category.toUpperCase()} ---\n`;
            const commands = this.categories.get(category);
            
            for (const cmdName of commands) {
                const cmd = this.commands.get(cmdName);
                helpText += `  ${cmd.name} - ${cmd.metadata.description}\n`;
            }
            helpText += '\n';
        }
        
        return helpText;
    }

    /**
     * Add command to history
     * @private
     */
    _addToHistory(entry) {
        this.history.unshift(entry);
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(0, this.maxHistory);
        }
    }

    /**
     * Get command history
     * @returns {Array} Command history
     */
    getHistory() {
        return [...this.history];
    }

    /**
     * Clear command history
     */
    clearHistory() {
        this.history = [];
    }

    /**
     * Unregister a command
     * @param {string} name - Command name to unregister
     */
    unregisterCommand(name) {
        const command = this.commands.get(name);
        if (!command) return false;

        // Remove from category
        const category = command.metadata.category;
        if (this.categories.has(category)) {
            const cmds = this.categories.get(category);
            const index = cmds.indexOf(name);
            if (index !== -1) {
                cmds.splice(index, 1);
            }
        }

        // Remove aliases
        if (command.metadata.aliases) {
            command.metadata.aliases.forEach(alias => {
                this.aliases.delete(alias);
            });
        }

        // Remove command
        return this.commands.delete(name);
    }

    /**
     * Register a command using a command class
     * @param {Object} commandClass - Command class with execute method
     */
    registerCommandClass(commandClass) {
        const cmd = new commandClass();
        if (typeof cmd.execute !== 'function') {
            throw new Error('Command class must have an execute method');
        }

        this.registerCommand(
            cmd.name,
            cmd.execute.bind(cmd),
            cmd.metadata || {}
        );
    }
}

/**
 * Base Command Class - provides a foundation for creating commands
 */
export class BaseCommand {
    constructor(name, metadata = {}) {
        this.name = name;
        this.metadata = {
            description: 'No description provided',
            usage: '',
            category: 'general',
            aliases: [],
            ...metadata
        };
    }

    /**
     * Execute the command - override this method in subclasses
     * @param {Array} args - Command arguments
     * @param {Object} context - Execution context
     */
    async execute(args, context) {
        throw new Error('Execute method must be implemented in subclass');
    }

    /**
     * Validate command arguments
     * @param {Array} args - Command arguments
     * @returns {boolean} True if valid
     */
    validate(args) {
        return true;
    }
}