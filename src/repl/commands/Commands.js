/**
 * Standardized Command Interface and Implementations
 */

import {handleError} from '../../util/ErrorHandler.js';
import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Example Map
const EXAMPLE_MAP = {
    'agent-builder': '../../../examples/agent-builder-demo.js',
    'agent-builder-demo': '../../../examples/agent-builder-demo.js',
    'causal-reasoning': '../../../examples/causal-reasoning-demo.js',
    'causal-reasoning-demo': '../../../examples/causal-reasoning-demo.js',
    'inductive-reasoning': '../../../examples/inductive-reasoning-demo.js',
    'inductive-reasoning-demo': '../../../examples/inductive-reasoning-demo.js',
    'syllogism': '../../../examples/syllogism-demo.js',
    'syllogism-demo': '../../../examples/syllogism-demo.js',
    'temporal': '../../../examples/temporal-reasoning-demo.js',
    'temporal-reasoning': '../../../examples/temporal-reasoning-demo.js',
    'temporal-reasoning-demo': '../../../examples/temporal-reasoning-demo.js',
    'performance': '../../../examples/performance-benchmark.js',
    'performance-benchmark': '../../../examples/performance-benchmark.js',
    'phase10-complete': '../../../examples/phase10-complete-demo.js',
    'phase10-final': '../../../examples/phase10-final-demo.js',
    'phase10-final-demo': '../../../examples/phase10-final-demo.js',
    'websocket': '../../../examples/websocket-monitoring-test.js',
    'websocket-demo': '../../../examples/websocket-monitoring-test.js',
    'websocket-monitoring': '../../../examples/websocket-monitoring-test.js',
    'lm-providers': '../../../examples/lm-providers.js',
    'basic-usage': '../../../examples/basic-usage.js'
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

// --- Agent Commands ---

export class AgentCreateCommand extends AgentCommand {
    constructor() {
        super('agent', 'Manage agent status', 'agent [status]');
    }

    async _executeImpl(agent, action, ...rest) {
        if (!action || action === 'status') {
            return this._getAgentStatus(agent);
        }
        return `Action '${action}' not supported. Use 'agent status'.`;
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
        super('goal', 'Manage goals', 'goal [list|<narsese>]');
    }

    async _executeImpl(agent, ...args) {
        if (args.length < 1) return 'Usage: goal <narsese_goal> or goal list';
        if (args[0] === 'list') {
            const goals = agent.getGoals ? agent.getGoals() : [];
            if (goals.length === 0) return 'No goals in the system.';
            const goalList = goals.slice(0, 10).map((goal, index) => `  ${index + 1}. ${goal}`).join('\n');
            return goals.length > 10 ? `🎯 Goals:\n${goalList}\n  ... and ${goals.length - 10} more` : `🎯 Goals:\n${goalList}`;
        }
        const narsese = args.join(' ');
        const goalTask = narsese.trim().endsWith('!') ? narsese : `<${narsese}>!`;
        await agent.input(goalTask);
        return `🎯 Goal processed: ${goalTask}`;
    }
}

export class PlanCommand extends AgentCommand {
    constructor() { super('plan', 'Generate a plan using LM', 'plan <description>'); }
    async _executeImpl(agent, ...args) {
        if (args.length < 1) return 'Usage: plan <description>';
        if (!agent.lm) return '❌ No Language Model enabled.';
        const response = await agent.lm.generateText(`Generate a step-by-step plan to achieve: "${args.join(' ')}"`, {temperature: 0.7});
        return `📋 Generated Plan:\n${response}`;
    }
}

export class ThinkCommand extends AgentCommand {
    constructor() { super('think', 'Have agent think about a topic', 'think <topic>'); }
    async _executeImpl(agent, ...args) {
        if (args.length < 1) return 'Usage: think <topic>';
        if (!agent.lm) return '❌ No Language Model enabled.';
        const response = await agent.lm.generateText(`Reflect on: "${args.join(' ')}"`, {temperature: 0.8});
        return `💭 Reflection:\n${response}`;
    }
}

export class ReasonCommand extends AgentCommand {
    constructor() { super('reason', 'Perform reasoning using LM', 'reason <statement>'); }
    async _executeImpl(agent, ...args) {
        if (args.length < 1) return 'Usage: reason <statement>';
        if (!agent.lm) return '❌ No Language Model enabled.';
        const response = await agent.lm.generateText(`Reason about: "${args.join(' ')}"`, {temperature: 0.3});
        return `🧠 Reasoning Result:\n${response}`;
    }
}

export class LMCommand extends AgentCommand {
    constructor() { super('lm', 'Direct LM communication', 'lm <prompt>'); }
    async _executeImpl(agent, ...args) {
        if (args.length < 1) return 'Usage: lm <prompt>';
        if (!agent.lm) return '❌ No Language Model enabled.';
        const response = await agent.lm.generateText(args.join(' '), {temperature: 0.7});
        return `🤖 LM Response:\n${response}`;
    }
}

export class ProvidersCommand extends AgentCommand {
    constructor() { super('providers', 'Manage LM providers', 'providers [list|select <id>]'); }
    async _executeImpl(agent, ...args) {
        if (!agent.lm) return '❌ No Language Model enabled.';
        if (args.length === 0 || args[0] === 'list') {
            const providers = Array.from(agent.lm.providers.providers.keys());
            if (providers.length === 0) return 'No LM providers registered.';
            const list = providers.map((id, i) => `  ${i + 1}. ${id}${agent.lm.providers.defaultProviderId === id ? ' [DEFAULT]' : ''}`).join('\n');
            return `🔌 Providers:\n${list}`;
        }
        if (args[0] === 'select' && args.length > 1) {
            if (!agent.lm.providers.has(args[1])) return `Provider '${args[1]}' not found.`;
            agent.lm.providers.setDefault(args[1]);
            return `✅ Provider '${args[1]}' selected.`;
        }
        return 'Usage: providers [list|select <provider_id>]';
    }
}

export class ToolsCommand extends AgentCommand {
    constructor() { super('tools', 'Show Tools/MCP configuration', 'tools'); }
    async _executeImpl(agent) {
        let lines = ['🔧 Tools/MCP Configuration:'];
        if (agent.agentLM && agent.agentLM.providers) {
            lines.push(`  Current Agent LM Provider: ${agent.agentLM.providers.defaultProviderId || 'Default'}`);
        } else {
            lines.push('  Current Agent LM Provider: None');
        }
        if (agent.nar && typeof agent.nar.getAvailableTools === 'function') {
            const tools = agent.nar.getAvailableTools();
            if (Array.isArray(tools) && tools.length > 0) {
                lines.push(`  NARS Available Tools (${tools.length}):`);
                tools.forEach((t, i) => lines.push(`    ${i + 1}. ${typeof t === 'string' ? t : t.name || t.id || 'unnamed'}`));
            } else {
                lines.push('  NARS Tools: None available');
            }
        }
        if (agent.agentLM) {
             const pid = agent.agentLM.providers?.defaultProviderId;
             if (pid) {
                 const p = agent.agentLM.providers.get(pid);
                 const tools = (p && (typeof p.getAvailableTools === 'function' ? p.getAvailableTools() : p.tools)) || [];
                 if (tools.length > 0) {
                     lines.push(`  🤖 LM Tools (${tools.length}):`);
                     tools.forEach((t, i) => lines.push(`    ${i + 1}. ${t.name || t.constructor.name}: ${t.description || ''}`));
                 }
             }
        }
        if (agent.nar && agent.nar.mcp) {
            const mcp = agent.nar.mcp.getAvailableTools();
            if (mcp && mcp.allTools && mcp.allTools.length > 0) {
                lines.push(`  MCP Tools (${mcp.allTools.length}):`);
                mcp.allTools.forEach((t, i) => lines.push(`    ${i + 1}. ${typeof t === 'string' ? t : t.name || 'unnamed'}`));
            }
        }
        return lines.join('\n');
    }
}

// --- System Commands ---

export class HelpCommand extends AgentCommand {
    constructor() { super('help', 'Show available commands', 'help'); }
    async _executeImpl(agent) {
        return `🤖 Available commands:\n${agent.commandRegistry ? agent.commandRegistry.getHelp() : 'No help available'}`;
    }
}

export class StatusCommand extends AgentCommand {
    constructor() { super('status', 'Show system status', 'status'); }
    async _executeImpl(agent) {
        const stats = agent.getStats();
        const ms = stats.memoryStats || {};
        return `📊 System Status:
  Running: ${stats.isRunning ? 'Yes' : 'No'}
  Cycles: ${stats.cycleCount || 0}
  Concepts: ${ms.conceptCount ?? ms.totalConcepts ?? 0}
  Tasks: ${ms.taskCount ?? ms.totalTasks ?? 0}`;
    }
}

export class MemoryCommand extends AgentCommand {
    constructor() { super('memory', 'Show memory statistics', 'memory'); }
    async _executeImpl(agent) {
        const stats = agent.getStats();
        const ms = stats.memoryStats || {};
        return `💾 Memory Statistics:
  Concepts: ${ms.conceptCount ?? ms.totalConcepts ?? 0}
  Tasks: ${ms.taskCount ?? ms.totalTasks ?? 0}
  Avg Priority: ${(ms.avgPriority ?? ms.averagePriority ?? 0).toFixed(3)}`;
    }
}

export class TraceCommand extends AgentCommand {
    constructor() { super('trace', 'Show reasoning trace', 'trace'); }
    async _executeImpl(agent) {
        const beliefs = agent.getBeliefs();
        if (!beliefs.length) return '🔍 No recent beliefs found.';
        return ['🔍 Recent Beliefs (last 5):', ...beliefs.slice(-5).map(t => {
             const term = t.term?.toString?.() ?? t.term ?? 'Unknown';
             const freq = t.truth?.frequency?.toFixed(3) ?? '1.000';
             const conf = t.truth?.confidence?.toFixed(3) ?? '0.900';
             return `  ${term} %${freq},${conf}%`;
        })].join('\n');
    }
}

export class ResetCommand extends AgentCommand {
    constructor() { super('reset', 'Reset the system', 'reset'); }
    async _executeImpl(agent) {
        agent.reset();
        return '🔄 System reset successfully.';
    }
}

export class SaveCommand extends AgentCommand {
    constructor() { super('save', 'Save state to file', 'save'); }
    async _executeImpl(agent) {
        const result = await agent.save();
        return `💾 Saved to ${result.identifier} (${result.size} bytes)`;
    }
}

export class LoadCommand extends AgentCommand {
    constructor() { super('load', 'Load state from file', 'load <filepath>'); }
    async _executeImpl(agent, ...args) {
        if (args.length === 0) return 'Usage: load <filepath>';
        const filepath = args[0];
        // Basic validation
        if (filepath.includes('../')) return '❌ Invalid path.';

        // Use agent.load(filepath)
        const success = await agent.load(filepath);
        return success ? `💾 Loaded from ${filepath}` : '❌ Failed to load.';
    }
}

export class DemoCommand extends AgentCommand {
    constructor() { super('demo', 'Run example', 'demo <name>'); }
    async _executeImpl(agent, ...args) {
        if (args.length === 0) {
            return `🎭 Available examples:\n${Object.keys(EXAMPLE_MAP).filter(k => !k.includes('demo') || k.endsWith('demo')).map(k => `  ${k}`).join('\n')}`;
        }
        const name = args[0];
        const path = EXAMPLE_MAP[name];
        if (!path) return `❌ Unknown example: ${name}`;

        try {
             const fullPath = resolve(__dirname, path);
             const module = await import(`file://${fullPath}`);
             return `✅ Example ${name} loaded.`;
        } catch (e) {
            return `❌ Error loading example: ${e.message}`;
        }
    }
}
