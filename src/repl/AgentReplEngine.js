import {ReplEngine} from './ReplEngine.js';
import {LM} from '../lm/LM.js';

import {NARControlTool} from '../tool/NARControlTool.js';
import {handleError, logError} from '../util/ErrorHandler.js';
import {
    AgentCommandRegistry,
    AgentCreateCommand,
    GoalCommand,
    LMCommand,
    PlanCommand,
    ProvidersCommand,
    ReasonCommand,
    ThinkCommand
} from './commands/AgentCommands.js';

export class AgentReplEngine extends ReplEngine {
    constructor(config = {}) {
        super(config);

        this.agentLM = new LM(config.lm || {}, this.eventBus);
        this.agents = new Map();
        this.activeAgent = null;
        this.commandRegistry = this._initializeCommandRegistry();

        // Configure input processing behavior
        this.inputProcessingConfig = {
            // Whether to fallback to Narsese processing when LM fails
            enableNarseseFallback: config.inputProcessing?.enableNarseseFallback ?? true,
            // Whether to check if input looks like Narsese before trying Narsese fallback
            checkNarseseSyntax: config.inputProcessing?.checkNarseseSyntax ?? true,
            // Temperature for LM calls
            lmTemperature: config.inputProcessing?.lmTemperature ?? 0.7
        };
    }

    _initializeCommandRegistry() {
        const registry = new AgentCommandRegistry();

        // Register all agent commands
        registry.register(new AgentCreateCommand());
        registry.register(new GoalCommand());
        registry.register(new PlanCommand());
        registry.register(new ThinkCommand());
        registry.register(new ReasonCommand());
        registry.register(new LMCommand());
        registry.register(new ProvidersCommand());

        return registry;
    }

    registerLMProvider(id, provider) {
        this.agentLM.registerProvider(id, provider);
        this.agentLM.providers.setDefault(id);
    }

    async initialize() {
        await super.initialize();

        if (this.agentLM.initialize) {
            await this.agentLM.initialize();
        }

        this._syncLMProviders();
        this._registerAgentEventHandlers();

        // Register NAR control tools with the LM provider
        this._registerNARTools();

        // Initialize the provider's agent after tools are registered
        const defaultProviderId = this.agentLM.providers.defaultProviderId;
        if (defaultProviderId) {
            const provider = this.agentLM.providers.get(defaultProviderId);
            if (provider && typeof provider.initialize === 'function') {
                provider.initialize();
            }
        }
    }

    _registerNARTools() {
        try {
            // Create NAR control tool with reference to this engine's nar instance
            const narControlTool = new NARControlTool(this.nar);

            // Find the current provider and add the tool to it
            const defaultProviderId = this.agentLM.providers.defaultProviderId;
            if (defaultProviderId) {
                const provider = this.agentLM.providers.get(defaultProviderId);
                if (provider) {
                    // Initialize the tools array if it doesn't exist
                    if (!Array.isArray(provider.tools)) {
                        provider.tools = [];
                    }

                    // Check if the tool is already registered to avoid duplicates
                    const existingToolIndex = provider.tools.findIndex(tool =>
                        tool.name === narControlTool.name ||
                        tool.constructor.name === narControlTool.constructor.name
                    );

                    if (existingToolIndex === -1) {
                        // Only add the tool if it's not already present
                        provider.tools.push(narControlTool);
                        console.log(`🔧 Registered NAR control tool with LM provider`);
                    } else {
                        console.log(`🔧 NAR control tool already registered`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error registering NAR tools:', error.message);
        }
    }

    _syncLMProviders() {
        if (this.lm?.providers) {
            for (const [providerId, provider] of this.lm.providers.providers.entries()) {
                this.agentLM.registerProvider(providerId, provider);
            }
            if (this.lm.providers.defaultProviderId) {
                this.agentLM.providers.setDefault(this.lm.providers.defaultProviderId);
            }
        }
    }

    _registerAgentEventHandlers() {
        const events = ['agent.action', 'agent.decision'];
        events.forEach(event => {
            this.nar.on?.(event, (data) => this.emit(event, data));
        });
    }

    addAgentCommands() {
        this._overrideCommandProcessor();
    }

    _overrideCommandProcessor() {
        const original = this.executeCommand.bind(this);
        this.executeCommand = async (cmd, ...args) => {
            // Handle special case for agent-status
            if (cmd === 'agent-status') {
                return this.activeAgent
                    ? await this.commandRegistry.execute('agent', this, 'status', ...args)
                    : 'No active agent. Use "agent create <name>" or "agent select <name>".';
            }

            // Check if it's a registered agent command first
            if (this.commandRegistry.get(cmd)) {
                return await this.commandRegistry.execute(cmd, this, ...args);
            }
            // Otherwise use default command processing
            return await original(cmd, ...args);
        };
    }

    // Override processNarsese to add agent awareness
    async processNarsese(input) {
        try {
            const result = await super.processNarsese(input);

            if (input.includes('!') && this.activeAgent) {
                const agent = this.agents.get(this.activeAgent);
                agent?.goals.push({content: input, timestamp: Date.now(), status: 'pending'});
            }

            return result;
        } catch (error) {
            logError(error, 'processNarsese');
            throw error; // Re-throw to be handled upstream
        }
    }

    // Override processInput to route most input to LM first (agent behavior)
    async processInput(input) {
        const trimmedInput = input.trim();
        if (!trimmedInput) return await this.executeCommand('next');

        this.sessionState.history.push(trimmedInput);

        if (trimmedInput.startsWith('/')) {
            return await this.executeCommand(...trimmedInput.slice(1).split(' '));
        }

        const [firstPart, ...rest] = trimmedInput.split(' ');
        if (this.commandRegistry.get(firstPart)) {
            return await this.commandRegistry.execute(firstPart, this, ...rest);
        }

        try {
            // Add timeout wrapper for safety
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('LM generation timed out after 30 seconds')), 30000)
            );

            const generatePromise = this.agentLM.generateText(
                trimmedInput,
                {
                    temperature: this.inputProcessingConfig.lmTemperature,
                    timeout: 30000  // Add timeout to the call
                }
            );

            const response = await Promise.race([generatePromise, timeoutPromise]);
            return `🤖: ${response}`;
        } catch (lmError) {
            logError(lmError, 'LM processing');

            // Only attempt Narsese fallback if enabled in config
            if (this.inputProcessingConfig.enableNarseseFallback) {
                // Only check Narsese syntax if enabled in config, otherwise always try Narsese fallback
                const shouldTryNarsese = !this.inputProcessingConfig.checkNarseseSyntax || this._isPotentialNarsese(trimmedInput);

                if (shouldTryNarsese) {
                    try {
                        return await this.processNarsese(trimmedInput);
                    } catch (narseseError) {
                        logError(narseseError, 'Narsese processing');
                        // Return a more user-friendly error
                        return `💭 Agent processed: Input "${trimmedInput}" may not be valid Narsese. LM Error: ${lmError.message}`;
                    }
                }
            }

            // For non-Narsese-like inputs or when fallback is disabled, just report the LM error
            return handleError(lmError, 'Agent processing');
        }
    }

    // Determine if input looks like potential Narsese syntax
    _isPotentialNarsese(input) {
        // Check for more specific Narsese patterns
        // Look for Narsese-specific structures like <subject --> predicate>
        const narsesePatterns = [
            /<[\w\s\-'"()[\]]*\s*-->\s*[\w\s\-'"()[\]]*>/,  // Standard Narsese relation: <A --> B>
            /<[\w\s\-'"()[\]]*\s*\^[\w\s\-'"()[\]]*>/,       // Narsese operation: <A ^op B>
            /[<].*[>].*[!]/,                                  // Narsese goal: <...>!
            /<.*\?.*>/,                                       // Narsese query: <...?> 
            /%[\d.]*;[\d.]*%/,                                // Narsese truth values: %f;c%
            /<.*\^.*>.*[!.]/,                                 // Narsese with op and goal/question
        ];

        return narsesePatterns.some(pattern => pattern.test(input));
    }

    async shutdown() {
        this.agents.clear();
        this.activeAgent = null;
        if (this.agentLM?.shutdown) await this.agentLM.shutdown();
        await super.shutdown();
    }

    // New method to support streaming responses from LM
    async processInputStreaming(input, onChunk) {
        const trimmedInput = input.trim();
        if (!trimmedInput) {
            const result = await this.executeCommand('next');
            if (onChunk) onChunk(result);
            return result;
        }

        this.sessionState.history.push(trimmedInput);

        if (trimmedInput.startsWith('/')) {
            const result = await this.executeCommand(...trimmedInput.slice(1).split(' '));
            if (onChunk) onChunk(result);
            return result;
        }

        const [firstPart, ...rest] = trimmedInput.split(' ');
        if (this.commandRegistry.get(firstPart)) {
            const result = await this.commandRegistry.execute(firstPart, this, ...rest);
            if (onChunk) onChunk(result);
            return result;
        }

        try {
            // Check if the LM supports streaming
            if (typeof this.agentLM.streamText === 'function') {
                // Add timeout wrapper for safety
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('LM streaming timed out after 60 seconds')), 60000)
                );

                const streamPromise = (async () => {
                    const streamIterator = await this.agentLM.streamText(
                        trimmedInput,
                        {
                            temperature: this.inputProcessingConfig.lmTemperature,
                            timeout: 60000  // Add timeout option to the call
                        }
                    );

                    let fullResponse = '';
                    for await (const chunk of streamIterator) {
                        fullResponse += chunk;
                        if (onChunk) onChunk(`🤖: ${chunk}`);
                    }

                    return `🤖: ${fullResponse}`;
                })();

                // Race the streaming operation with timeout
                const result = await Promise.race([streamPromise, timeoutPromise]);
                return result;
            } else {
                // Fallback to regular generateText if streaming not available
                // Add timeout wrapper for safety
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('LM generation timed out after 30 seconds')), 30000)
                );

                const generatePromise = this.agentLM.generateText(
                    trimmedInput,
                    {
                        temperature: this.inputProcessingConfig.lmTemperature,
                        timeout: 30000  // Add timeout to the call
                    }
                );

                const response = await Promise.race([generatePromise, timeoutPromise]);
                if (onChunk) onChunk(`🤖: ${response}`);
                return `🤖: ${response}`;
            }
        } catch (lmError) {
            logError(lmError, 'LM processing');

            // Only attempt Narsese fallback if enabled in config
            if (this.inputProcessingConfig.enableNarseseFallback) {
                // Only check Narsese syntax if enabled in config, otherwise always try Narsese fallback
                const shouldTryNarsese = !this.inputProcessingConfig.checkNarseseSyntax || this._isPotentialNarsese(trimmedInput);

                if (shouldTryNarsese) {
                    try {
                        const result = await this.processNarsese(trimmedInput);
                        if (onChunk) onChunk(result);
                        return result;
                    } catch (narseseError) {
                        logError(narseseError, 'Narsese processing');
                        const errorMsg = `💭 Agent processed: Input "${trimmedInput}" may not be valid Narsese. LM Error: ${lmError.message}`;
                        if (onChunk) onChunk(errorMsg);
                        return errorMsg;
                    }
                }
            }

            // For non-Narsese-like inputs or when fallback is disabled, just report the LM error
            const errorMsg = handleError(lmError, 'Agent processing');
            if (onChunk) onChunk(errorMsg);
            return errorMsg;
        }
    }
}