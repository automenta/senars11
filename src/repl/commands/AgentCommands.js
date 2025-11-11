/**
 * Common interface for agent command processing
 * Provides a standardized way to handle agent commands
 */

import {handleError} from '../../util/ErrorHandler.js';

// Base class for all agent commands
export class AgentCommand {
    constructor(name, description, usage) {
        this.name = name;
        this.description = description;
        this.usage = usage;
    }

    // Execute the command with standardized error handling
    async execute(engine, ...args) {
        try {
            return await this._executeImpl(engine, ...args);
        } catch (error) {
            return handleError(error, `${this.name} command`, `❌ Error executing ${this.name} command`);
        }
    }

    // To be implemented by subclasses
    async _executeImpl(engine, ...args) {
        throw new Error(`_executeImpl not implemented for command: ${this.name}`);
    }

    // Validate arguments
    validateArgs(args) {
        return true; // Default implementation allows all args
    }
}

// Registry to manage all commands
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

    async execute(name, engine, ...args) {
        const command = this.get(name);
        if (!command) {
            return `❌ Unknown command: ${name}`;
        }
        return await command.execute(engine, ...args);
    }

    getHelp() {
        const commands = this.getAll();
        if (commands.length === 0) return 'No commands registered.';
        
        return commands.map(cmd => 
            `  ${cmd.name} - ${cmd.description} (usage: ${cmd.usage})`
        ).join('\n');
    }
}

// Specific command implementations
export class AgentCreateCommand extends AgentCommand {
    constructor() {
        super('agent', 'Create, list, or manage agents', 'agent [create|list|select|status] [args]');
    }

    async _executeImpl(engine, action, ...rest) {
        if (!action) return this._listAgents(engine);
        
        switch (action) {
            case 'create': return this._createAgent(engine, rest);
            case 'list': return this._listAgents(engine);
            case 'select': return this._selectAgent(engine, rest);
            case 'status': return this._getAgentStatus(engine, rest);
            default: 
                return `Unknown agent action: ${action}. Use 'agent create', 'agent list', 'agent select', or 'agent status'.`;
        }
    }

    async _createAgent(engine, args) {
        const [name, type = 'default'] = args;
        if (!name) return 'Usage: agent create <name> [type]';
        if (engine.agents.has(name)) return `Agent '${name}' already exists.`;

        const agent = {
            id: name,
            type,
            created: Date.now(),
            status: 'idle',
            goals: [],
            beliefs: [],
            memory: []
        };

        engine.agents.set(name, agent);
        engine.activeAgent = name;
        return `✅ Agent '${name}' created and selected. Type: ${type}`;
    }

    async _listAgents(engine) {
        if (engine.agents.size === 0) {
            return 'No agents created yet. Use "agent create <name>" to create one.';
        }

        const agentsList = Array.from(engine.agents.entries())
            .map(([name, agent]) => `  - ${name} (${agent.type}) - Status: ${agent.status}${engine.activeAgent === name ? ' [ACTIVE]' : ''}`)
            .join('\n');
        
        return `🤖 Available Agents:\n${agentsList}${engine.activeAgent ? `\nActive Agent: ${engine.activeAgent}` : ''}`;
    }

    async _selectAgent(engine, args) {
        const [name] = args;
        if (!name) return 'Usage: agent select <name>';
        if (!engine.agents.has(name)) return `Agent '${name}' not found. Use 'agent list' to see available agents.`;

        engine.activeAgent = name;
        return `✅ Agent '${name}' selected as active.`;
    }

    async _getAgentStatus(engine, args) {
        const name = args[0];
        if (name) {
            if (!engine.agents.has(name)) return `Agent '${name}' not found.`;
            return this._formatAgentStatus(engine.agents.get(name), name);
        }
        
        if (!engine.activeAgent) {
            return 'No active agent selected. Use "agent select <name>" or "agent create <name>".';
        }
        
        return this._formatAgentStatus(engine.agents.get(engine.activeAgent), engine.activeAgent);
    }

    _formatAgentStatus(agent, agentName) {
        return `📊 Agent Status: ${agentName}
  Type: ${agent.type}
  Status: ${agent.status}
  Created: ${new Date(agent.created).toLocaleString()}
  Goals: ${agent.goals.length}
  Beliefs: ${agent.beliefs.length}
  Memory entries: ${agent.memory.length}`;
    }
}

export class GoalCommand extends AgentCommand {
    constructor() {
        super('goal', 'Manage goals for the agent', 'goal [list|<goal_description>]');
    }

    async _executeImpl(engine, ...args) {
        if (args.length < 1) return 'Usage: goal <narsese_goal> or goal list';
        if (args[0] === 'list') return this._listGoals(engine);

        const narsese = args.join(' ');
        const goalTask = `<${narsese}>!`;

        await engine.nar.input(goalTask);
        if (engine.activeAgent) {
            const agent = engine.agents.get(engine.activeAgent);
            agent?.goals.push({ content: goalTask, timestamp: Date.now(), status: 'pending' });
        }
        return `🎯 Goal added: ${goalTask}`;
    }

    async _listGoals(engine) {
        if (engine.activeAgent) {
            const agent = engine.agents.get(engine.activeAgent);
            if (agent?.goals.length > 0) {
                const goalsList = agent.goals
                    .map((goal, index) => `  ${index + 1}. ${goal.content} [${goal.status}] (${new Date(goal.timestamp).toLocaleTimeString()})`)
                    .join('\n');
                return `🎯 Goals for agent '${engine.activeAgent}':\n${goalsList}`;
            }
        }

        const goals = engine.nar.getGoals?.() ?? [];
        if (goals.length === 0) return 'No goals in the system.';

        const goalList = goals.slice(0, 10).map((goal, index) => `  ${index + 1}. ${goal}`).join('\n');
        return goals.length > 10 
            ? `🎯 System Goals:\n${goalList}\n  ... and ${goals.length - 10} more goals`
            : `🎯 System Goals:\n${goalList}`;
    }
}

export class PlanCommand extends AgentCommand {
    constructor() {
        super('plan', 'Generate a plan using the LM', 'plan <description>');
    }

    async _executeImpl(engine, ...args) {
        if (args.length < 1) return 'Usage: plan <describe what you want to plan>';
        
        const query = args.join(' ');
        const prompt = `Generate a step-by-step plan to achieve: "${query}". Format as a sequence of actionable steps. Each step should be simple and executable.`;
        
        const response = await engine.agentLM.generateText(prompt, { temperature: 0.7 });
        return `📋 Generated Plan:\n${response}`;
    }
}

export class ThinkCommand extends AgentCommand {
    constructor() {
        super('think', 'Have the agent think about a topic', 'think <topic>');
    }

    async _executeImpl(engine, ...args) {
        if (args.length < 1) return 'Usage: think <what you want the agent to think about>';
        
        const topic = args.join(' ');
        const prompt = `As an intelligent reasoning system, reflect on: "${topic}". Consider different aspects, potential implications, and logical connections.`;
        
        const response = await engine.agentLM.generateText(prompt, { temperature: 0.8 });
        return `💭 Reflection on "${topic}":\n${response}`;
    }
}

export class ReasonCommand extends AgentCommand {
    constructor() {
        super('reason', 'Perform reasoning using the LM', 'reason <statement>');
    }

    async _executeImpl(engine, ...args) {
        if (args.length < 1) return 'Usage: reason <what you want the agent to reason about>';
        
        const topic = args.join(' ');
        const prompt = `Reason about: "${topic}". Provide logical analysis and potential conclusions.`;
        
        const response = await engine.agentLM.generateText(prompt, { temperature: 0.3 });
        return `🧠 Reasoning Result:\n${response}`;
    }
}

export class LMCommand extends AgentCommand {
    constructor() {
        super('lm', 'Direct communication with the language model', 'lm <prompt>');
    }

    async _executeImpl(engine, ...args) {
        if (args.length < 1) return 'Usage: lm <prompt_for_language_model>';
        
        const prompt = args.join(' ');
        const response = await engine.agentLM.generateText(prompt, { temperature: 0.7 });
        return `🤖 LM Response:\n${response}`;
    }
}

export class ProvidersCommand extends AgentCommand {
    constructor() {
        super('providers', 'Manage language model providers', 'providers [list|select <provider_id>]');
    }

    async _executeImpl(engine, ...args) {
        if (args.length === 0 || args[0] === 'list') {
            return this._listProviders(engine);
        }

        if (args[0] === 'select' && args.length > 1) {
            return this._selectProvider(engine, args[1]);
        }

        return 'Usage: providers [list|select <provider_id>]';
    }

    _listProviders(engine) {
        const providers = Array.from(engine.agentLM.providers.providers.keys());
        if (providers.length === 0) return 'No LM providers registered.';

        const providerList = providers
            .map((providerId, index) => `  ${index + 1}. ${providerId}${engine.agentLM.providers.defaultProviderId === providerId ? ' [DEFAULT]' : ''}`)
            .join('\n');
        return `🔌 Registered LM Providers:\n${providerList}\nActive Provider: ${engine.agentLM.providers.defaultProviderId}`;
    }

    _selectProvider(engine, providerId) {
        if (!engine.agentLM.providers.has(providerId)) {
            return `Provider '${providerId}' not found. Use 'providers list' to see available providers.`;
        }
        engine.agentLM.providers.setDefault(providerId);
        return `✅ Provider '${providerId}' selected as default.`;
    }
}