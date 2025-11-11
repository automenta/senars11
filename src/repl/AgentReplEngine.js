import {ReplEngine} from './ReplEngine.js';
import {LM} from '../lm/LM.js';
import {EventEmitter} from 'events';
import {handleError, logError} from '../util/ErrorHandler.js';
import {
    AgentCommandRegistry,
    AgentCreateCommand,
    GoalCommand,
    PlanCommand,
    ThinkCommand,
    ReasonCommand,
    LMCommand,
    ProvidersCommand
} from './commands/AgentCommands.js';

export class AgentReplEngine extends ReplEngine {
    constructor(config = {}) {
        super(config);

        this.agentLM = new LM(config.lm || {}, this.eventBus);
        this.agents = new Map();
        this.activeAgent = null;
        this.commandRegistry = this._initializeCommandRegistry();
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
                agent?.goals.push({ content: input, timestamp: Date.now(), status: 'pending' });
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
            const response = await this.agentLM.generateText(
                `As an intelligent reasoning system, please respond to this query: "${trimmedInput}". If this is a request that should interact with the NARS system, please use appropriate tools.`,
                { temperature: 0.7 }
            );
            return `🤖: ${response}`;
        } catch (lmError) {
            logError(lmError, 'LM processing');
            
            // Instead of falling back to Narsese for any input, 
            // only fall back for inputs that look like potential Narsese
            const looksLikeNarsese = this._isPotentialNarsese(trimmedInput);
            
            if (looksLikeNarsese) {
                try {
                    return await this.processNarsese(trimmedInput);
                } catch (narseseError) {
                    logError(narseseError, 'Narsese processing');
                    // Return a more user-friendly error
                    return `💭 Agent processed: Input "${trimmedInput}" may not be valid Narsese. LM Error: ${lmError.message}`;
                }
            } else {
                // For non-Narsese-like inputs, just report the LM error
                return handleError(lmError, 'Agent processing');
            }
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
}