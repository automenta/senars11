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
    async execute(agent, ...args) {
        try {
            return await this._executeImpl(agent, ...args);
        } catch (error) {
            return handleError(error, `${this.name} command`, `❌ Error executing ${this.name} command`);
        }
    }

    // To be implemented by subclasses
    async _executeImpl(agent, ...args) {
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
            `  ${cmd.name} - ${cmd.description} (usage: ${cmd.usage})`
        ).join('\n');
    }
}

// Specific command implementations
export class AgentCreateCommand extends AgentCommand {
    constructor() {
        super('agent', 'Manage agent status', 'agent [status]');
    }

    async _executeImpl(agent, action, ...rest) {
        // In the new architecture, an Agent instance is self-contained.
        // Commands to create/manage other agents should go through AgentManager,
        // which is not directly exposed in the Agent's REPL.
        // So we limit this command to 'status'.

        if (!action || action === 'status') {
            return this._getAgentStatus(agent);
        }

        return `Action '${action}' not supported in single-agent view. Use 'agent status'.`;
    }

    async _getAgentStatus(agent) {
        const status = {
            id: agent.id,
            isRunning: agent.isRunning,
            cycleCount: agent.cycleCount,
            beliefs: agent.getBeliefs ? agent.getBeliefs().length : 0,
            goals: agent.getGoals ? agent.getGoals().length : 0,
            inputQueueSize: agent.inputQueue ? agent.inputQueue.size() : 0
        };

        return `📊 Agent Status: ${agent.id}
  Running: ${status.isRunning}
  Cycles: ${status.cycleCount}
  Beliefs: ${status.beliefs}
  Goals: ${status.goals}
  Input Queue: ${status.inputQueueSize}`;
    }
}

export class GoalCommand extends AgentCommand {
    constructor() {
        super('goal', 'Manage goals for the agent', 'goal [list|<goal_description>]');
    }

    async _executeImpl(agent, ...args) {
        if (args.length < 1) return 'Usage: goal <narsese_goal> or goal list';
        if (args[0] === 'list') return this._listGoals(agent);

        const narsese = args.join(' ');
        // Ensure it's formatted as a goal if not already
        const goalTask = narsese.trim().endsWith('!') ? narsese : `<${narsese}>!`;

        await agent.input(goalTask);

        // We rely on NAR to store the goal.
        return `🎯 Goal processed: ${goalTask}`;
    }

    async _listGoals(agent) {
        const goals = agent.getGoals ? agent.getGoals() : [];
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

    async _executeImpl(agent, ...args) {
        if (args.length < 1) return 'Usage: plan <describe what you want to plan>';
        if (!agent.lm) return '❌ No Language Model enabled for this agent.';

        const query = args.join(' ');
        const prompt = `Generate a step-by-step plan to achieve: "${query}". Format as a sequence of actionable steps. Each step should be simple and executable.`;

        const response = await agent.lm.generateText(prompt, {temperature: 0.7});
        return `📋 Generated Plan:\n${response}`;
    }
}

export class ThinkCommand extends AgentCommand {
    constructor() {
        super('think', 'Have the agent think about a topic', 'think <topic>');
    }

    async _executeImpl(agent, ...args) {
        if (args.length < 1) return 'Usage: think <what you want the agent to think about>';
        if (!agent.lm) return '❌ No Language Model enabled for this agent.';

        const topic = args.join(' ');
        const prompt = `As an intelligent reasoning system, reflect on: "${topic}". Consider different aspects, potential implications, and logical connections.`;

        const response = await agent.lm.generateText(prompt, {temperature: 0.8});
        return `💭 Reflection on "${topic}":\n${response}`;
    }
}

export class ReasonCommand extends AgentCommand {
    constructor() {
        super('reason', 'Perform reasoning using the LM', 'reason <statement>');
    }

    async _executeImpl(agent, ...args) {
        if (args.length < 1) return 'Usage: reason <what you want the agent to reason about>';
        if (!agent.lm) return '❌ No Language Model enabled for this agent.';

        const topic = args.join(' ');
        const prompt = `Reason about: "${topic}". Provide logical analysis and potential conclusions.`;

        const response = await agent.lm.generateText(prompt, {temperature: 0.3});
        return `🧠 Reasoning Result:\n${response}`;
    }
}

export class LMCommand extends AgentCommand {
    constructor() {
        super('lm', 'Direct communication with the language model', 'lm <prompt>');
    }

    async _executeImpl(agent, ...args) {
        if (args.length < 1) return 'Usage: lm <prompt_for_language_model>';
        if (!agent.lm) return '❌ No Language Model enabled for this agent.';

        const prompt = args.join(' ');
        const response = await agent.lm.generateText(prompt, {temperature: 0.7});
        return `🤖 LM Response:\n${response}`;
    }
}

export class ProvidersCommand extends AgentCommand {
    constructor() {
        super('providers', 'Manage language model providers', 'providers [list|select <provider_id>]');
    }

    async _executeImpl(agent, ...args) {
        if (!agent.lm) return '❌ No Language Model enabled for this agent.';

        if (args.length === 0 || args[0] === 'list') {
            return this._listProviders(agent);
        }

        if (args[0] === 'select' && args.length > 1) {
            return this._selectProvider(agent, args[1]);
        }

        return 'Usage: providers [list|select <provider_id>]';
    }

    _listProviders(agent) {
        const providers = Array.from(agent.lm.providers.providers.keys());
        if (providers.length === 0) return 'No LM providers registered.';

        const providerList = providers
            .map((providerId, index) => `  ${index + 1}. ${providerId}${agent.lm.providers.defaultProviderId === providerId ? ' [DEFAULT]' : ''}`)
            .join('\n');
        return `🔌 Registered LM Providers:\n${providerList}\nActive Provider: ${agent.lm.providers.defaultProviderId}`;
    }

    _selectProvider(agent, providerId) {
        if (!agent.lm.providers.has(providerId)) {
            return `Provider '${providerId}' not found. Use 'providers list' to see available providers.`;
        }
        agent.lm.providers.setDefault(providerId);
        return `✅ Provider '${providerId}' selected as default.`;
    }
}
