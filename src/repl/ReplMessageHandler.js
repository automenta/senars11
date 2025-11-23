import {EventEmitter} from 'events';
import {MESSAGE_TYPES} from '../util/MessageTypes.js';
import path from 'path';

const CMD_MAP = {'start': 'run', 'stop': 'stop', 'step': 'next'};

export class ReplMessageHandler extends EventEmitter {
    constructor(engine) {
        super();

        if (!engine || typeof engine.processInput !== 'function') {
            throw new Error('ReplMessageHandler requires a valid engine with processInput method');
        }

        this.engine = engine;
        this.commandHandlers = new Map();
        this.messageHandlers = new Map();
        this.handlerCache = new Map(); // Cache for frequently used handlers

        this._setupDefaultCommandHandlers();
        this._setupDefaultMessageHandlers();
    }

    /**
     * Setup default command handlers that work across all form factors
     */
    _setupDefaultCommandHandlers() {
        // Map special commands to internal methods
        const internalCommands = {
            'n': '_next',
            'next': '_next',
            'run': '_run',
            'go': '_run',
            'stop': '_stop',
            'st': '_stop',
            'quit': 'shutdown',
            'q': 'shutdown',
            'exit': 'shutdown',
            'save': 'save'
        };

        Object.entries(internalCommands).forEach(([cmd, method]) => {
            this.commandHandlers.set(cmd, async () => {
                try {
                    if (this.engine[method]) {
                        return await this.engine[method].call(this.engine);
                    }
                    return `Unknown command: ${cmd}`;
                } catch (error) {
                    const errorMsg = `❌ Error executing command '${cmd}': ${error.message}`;
                    this.emit('command.error', {command: cmd, error: error.message});
                    return errorMsg;
                }
            });
        });

        // Load command with validation
        this.commandHandlers.set('load', async (filepath) => {
             if (!filepath) return '❌ Usage: /load <filepath>';
             if (filepath.includes('../') || filepath.includes('..\\') || filepath.startsWith('../') || filepath.startsWith('..\\')) {
                 return '❌ Invalid path: Path traversal not allowed';
             }
             try {
                 const normalizedPath = path.resolve('.', filepath);
                 const currentDir = path.resolve();
                 if (!normalizedPath.startsWith(currentDir)) {
                     return '❌ Invalid path: Access denied';
                 }

                 let success = false;
                 if (this.engine.persistenceManager) {
                      const state = await this.engine.persistenceManager.loadFromPath(normalizedPath);
                      if (state) {
                          success = await this.engine.deserialize(state);
                      }
                 } else if (typeof this.engine.loadSessionState === 'function') {
                      // Legacy or specific implementation
                      await this.engine.loadSessionState(normalizedPath);
                      success = true;
                 } else {
                     return '❌ No persistence manager available';
                 }

                 return success ? `💾 Session loaded from: ${normalizedPath}` : '❌ Failed to load session';
             } catch (error) {
                 return `❌ Error loading file: ${error.message}`;
             }
        });

        this.commandHandlers.set('tools', async () => {
            return this._generateToolsReport();
        });

        const examplesHandler = async () => {
            return this._generateExamplesReport();
        };
        this.commandHandlers.set('examples', examplesHandler);
        this.commandHandlers.set('list-examples', examplesHandler);
    }

    _generateExamplesReport() {
        const examples = [
            'agent-builder-demo', 'causal-reasoning', 'inductive-reasoning',
            'syllogism', 'temporal', 'performance', 'phase10-complete',
            'phase10-final', 'websocket', 'lm-providers'
        ];
        return `🎭 Available examples:\n` + examples.map(e => `  ${e}`).join('\n');
    }

    _generateToolsReport() {
        let lines = ['🔧 Tools/MCP Configuration:'];
        const engine = this.engine;

        // Show current provider info
        if (engine.agentLM && engine.agentLM.providers) {
            const providers = engine.agentLM.providers;
            lines.push(`  Current Agent LM Provider: ${providers.defaultProviderId || 'Default'}`);
        } else {
            lines.push('  Current Agent LM Provider: None');
        }

        // Check NARS tool integration
        if (engine.nar && typeof engine.nar.getAvailableTools === 'function') {
            const availableTools = engine.nar.getAvailableTools();
            if (Array.isArray(availableTools) && availableTools.length > 0) {
                lines.push(`  NARS Available Tools (${availableTools.length}):`);
                availableTools.forEach((tool, index) => {
                    const toolName = typeof tool === 'string' ? tool : tool.name || tool.id || 'unnamed';
                    lines.push(`    ${index + 1}. ${toolName}`);
                });
            } else {
                lines.push('  NARS Tools: None available');
            }
        }

        // Check LM Tools
        if (engine.agentLM) {
            const defaultProviderId = engine.agentLM.providers?.defaultProviderId;
            if (defaultProviderId) {
                const provider = engine.agentLM.providers.get(defaultProviderId);
                if (provider && (Array.isArray(provider.tools) || typeof provider.getAvailableTools === 'function')) {
                    const tools = typeof provider.getAvailableTools === 'function' ? provider.getAvailableTools() : provider.tools;
                    if (tools && tools.length > 0) {
                        lines.push(`  🤖 LM Tools (${tools.length}):`);
                        tools.forEach((tool, index) => {
                           lines.push(`    ${index+1}. ${tool.name || tool.constructor.name}: ${tool.description || ''}`);
                        });
                    }
                }
            }
        }

        // Check MCP system
        if (engine.nar && engine.nar.mcp) {
            const mcpTools = engine.nar.mcp.getAvailableTools();
             if (mcpTools && mcpTools.allTools && mcpTools.allTools.length > 0) {
                lines.push(`  MCP Tools (${mcpTools.allTools.length}):`);
                mcpTools.allTools.forEach((tool, index) => {
                    lines.push(`    ${index + 1}. ${typeof tool === 'string' ? tool : tool.name || 'unnamed'}`);
                });
            }
        }

        return lines.join('\n');
    }

    /**
     * Setup default message handlers that work across all form factors
     */
    _setupDefaultMessageHandlers() {
        this.messageHandlers.set('reason/step', this._handleReasonStep.bind(this));
        this.messageHandlers.set('narseseInput', this._handleNarseseInput.bind(this));
        this.messageHandlers.set('command.execute', this._handleCommandExecute.bind(this));
        this.messageHandlers.set('control/start', this._handleControlCommand.bind(this));
        this.messageHandlers.set('control/stop', this._handleControlCommand.bind(this));
        this.messageHandlers.set('control/step', this._handleControlCommand.bind(this));
        this.messageHandlers.set('agent/input', this._handleAgentInput.bind(this));
    }

    async processMessage(message) {
        if (!message || typeof message !== 'object') {
            return {error: 'Invalid message: expected object'};
        }

        try {
            const input = message?.payload?.text ?? message?.payload?.input ?? message?.payload ?? message;
            const messageType = message?.type;

            // Early return for common cases to avoid unnecessary processing
            if (!messageType && typeof input === 'string') {
                return await this.engine.processInput(input);
            }

            // Use a switch statement for the most common message types for better performance
            switch (messageType) {
                case 'narseseInput':
                case 'reason/step':
                    return await this._handleNarseseInput(message);
                case 'command.execute':
                    return await this._handleCommandExecute(message);
                case 'agent/input':
                    return await this._handleAgentInput(message);
            }

            // Handle control commands
            if (messageType?.startsWith('control/')) {
                return await this._handleControlCommand(message);
            }

            // Handle direct commands
            if (messageType?.startsWith('/')) {
                const [cmd, ...args] = messageType.slice(1).split(' ');
                return await this._handleCommand(cmd, ...args);
            }

            // Try cached handler first
            if (messageType) {
                if (this.handlerCache.has(messageType)) {
                    return await this.handlerCache.get(messageType)(message);
                }

                // Look up handler in registered handlers
                const handler = this.messageHandlers.get(messageType);
                if (handler) {
                    // Cache the handler for future use
                    this.handlerCache.set(messageType, handler);
                    return await handler(message);
                }
            }

            // Fallback to direct input processing
            if (typeof input === 'string' && input.trim()) {
                return await this.engine.processInput(input);
            }

            return {error: `Unknown message type: ${messageType || 'undefined'}`};
        } catch (error) {
            console.error('Error processing message:', error);
            this.emit('message.error', {message, error: error.message});
            return {error: error.message, type: MESSAGE_TYPES.ERROR};
        }
    }

    /**
     * Handle agent input messages
     */
    async _handleAgentInput(message) {
        try {
            const input = message?.payload?.text ?? message?.payload?.input ?? message?.payload;
            if (typeof input !== 'string' || !input.trim()) {
                return {error: 'No input provided', type: MESSAGE_TYPES.ERROR};
            }

            // Note: processInput typically processes Narsese or commands.
            // For streaming agent interaction, this method might not support streaming
            // but returns the final result.
            const result = await this.engine.processInput(input);
            return {
                type: MESSAGE_TYPES.AGENT_RESULT,
                payload: {input, result, success: true, timestamp: Date.now()}
            };
        } catch (error) {
            console.error('Error in agent input handler:', error);
            return {error: error.message, type: MESSAGE_TYPES.ERROR};
        }
    }

    /**
     * Handle narsese input messages
     */
    async _handleNarseseInput(message) {
        try {
            const input = message?.payload?.text ?? message?.payload?.input ?? message?.payload ?? message;
            if (typeof input !== 'string' || !input.trim()) {
                return {error: 'No input provided', type: MESSAGE_TYPES.ERROR};
            }

            const result = await this.engine.processInput(input);
            return {
                type: MESSAGE_TYPES.NARSESE_RESULT,
                payload: {input, result, success: !!result, timestamp: Date.now()}
            };
        } catch (error) {
            console.error('Error in narsese input handler:', error);
            return {error: error.message, type: MESSAGE_TYPES.ERROR};
        }
    }

    /**
     * Handle control commands (start, stop, step)
     */
    async _handleControlCommand(message) {
        try {
            const command = message?.type?.split('/')[1];
            if (!command) {
                return {error: 'No control command specified', type: MESSAGE_TYPES.ERROR};
            }

            const mappedCommand = CMD_MAP[command] || command;
            const result = await this._handleCommand(mappedCommand);

            return {
                type: MESSAGE_TYPES.CONTROL_RESULT,
                payload: {command, result, timestamp: Date.now()}
            };
        } catch (error) {
            console.error('Error in control command handler:', error);
            return {error: error.message, type: MESSAGE_TYPES.ERROR};
        }
    }

    /**
     * Handle command execution messages
     */
    async _handleCommandExecute(message) {
        try {
            const cmd = message?.payload?.command;
            const args = message?.payload?.args ?? [];

            if (!cmd) {
                return {error: 'No command specified', type: MESSAGE_TYPES.ERROR};
            }

            const result = await this._handleCommand(cmd, ...args);

            return {
                type: MESSAGE_TYPES.COMMAND_RESULT,
                payload: {command: cmd, args, result, timestamp: Date.now()}
            };
        } catch (error) {
            console.error('Error in command execute handler:', error);
            return {error: error.message, type: MESSAGE_TYPES.ERROR};
        }
    }

    /**
     * Handle reason/step messages
     */
    async _handleReasonStep(message) {
        return await this._handleNarseseInput(message);
    }

    /**
     * Execute a command by name
     */
    async _handleCommand(cmd, ...args) {
        try {
            // Check for registered command handlers first
            if (this.commandHandlers.has(cmd)) {
                return await this.commandHandlers.get(cmd)(...args);
            }

            // Then try the engine's executeCommand method
            if (this.engine.executeCommand) {
                return await this.engine.executeCommand(cmd, ...args);
            }

            return `Unknown command: ${cmd}`;
        } catch (error) {
            console.error(`Error executing command ${cmd}:`, error);
            const errorMsg = `❌ Error executing command: ${error.message}`;
            this.emit('command.error', {command: cmd, args, error: error.message});
            return errorMsg;
        }
    }

    registerCommandHandler(name, handler) {
        if (typeof name !== 'string' || name.trim() === '') {
            throw new Error('Command name must be a non-empty string');
        }
        if (typeof handler !== 'function') {
            throw new Error('Command handler must be a function');
        }
        this.commandHandlers.set(name, handler);
    }

    registerMessageHandler(type, handler) {
        if (typeof type !== 'string' || type.trim() === '') {
            throw new Error('Message type must be a non-empty string');
        }
        if (typeof handler !== 'function') {
            throw new Error('Message handler must be a function');
        }
        this.messageHandlers.set(type, handler);
    }

    getSupportedMessageTypes() {
        return {
            commands: Array.from(this.commandHandlers.keys()),
            messages: Array.from(this.messageHandlers.keys()),
            types: MESSAGE_TYPES
        };
    }

    clearHandlerCache() {
        this.handlerCache.clear();
    }
}
