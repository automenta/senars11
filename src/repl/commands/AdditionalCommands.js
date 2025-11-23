import {AgentCommand, createBanner} from './CommandBase.js';
import {FormattingUtils} from '../utils/index.js';
import fs from 'fs';

export class ConfigCommand extends AgentCommand {
    constructor() { super('config', 'Show or modify system configuration', 'config [key] [value]'); }
    async _executeImpl(agent, ...args) {
        if (args.length === 0) {
            return `⚙️ Configuration:\n${JSON.stringify(agent.config, null, 2)}`;
        }

        const key = args[0];
        if (args.length === 1) {
            // Get value by dot notation
            const val = key.split('.').reduce((o, k) => (o || {})[k], agent.config);
            return `Config '${key}': ${JSON.stringify(val, null, 2)}`;
        }

        // Set value (rudimentary support)
        const value = args[1];
        try {
            const keys = key.split('.');
            const lastKey = keys.pop();
            const target = keys.reduce((o, k) => o[k] = o[k] || {}, agent.config);

            // Try to parse value as JSON (number, boolean, object), else string
            try {
                target[lastKey] = JSON.parse(value);
            } catch(e) {
                target[lastKey] = value;
            }

            return `✅ Config '${key}' set to ${JSON.stringify(target[lastKey])}`;
        } catch (e) {
            return `❌ Error setting config: ${e.message}`;
        }
    }
}

export class VerboseCommand extends AgentCommand {
    constructor() { super('verbose', 'Toggle verbose output', 'verbose [on|off]'); }
    async _executeImpl(agent, ...args) {
        if (args[0] === 'on') {
            agent.verbose = true;
            return '✅ Verbose mode enabled.';
        } else if (args[0] === 'off') {
            agent.verbose = false;
            return '✅ Verbose mode disabled.';
        }
        agent.verbose = !agent.verbose;
        return `Verbose mode: ${agent.verbose ? 'ON' : 'OFF'}`;
    }
}

export class GraphCommand extends AgentCommand {
    constructor() { super('graph', 'Visualize concept relationships', 'graph [term|all]'); }
    async _executeImpl(agent, ...args) {
        const term = args[0];
        const concepts = agent.getConcepts ? agent.getConcepts() : [];

        if (term === 'all' || !term) {
             if (concepts.length > 50) return '❌ Too many concepts to visualize all. Specify a term.';
             // Simple adjacency list
             let output = '🕸️ Concept Graph:\n';
             concepts.forEach(c => {
                 output += `  ${c.term.toString()}\n`;
                 // If concept has links exposed, show them. Assuming c.termLinks or similar?
                 // Common NAR implementation has term links.
                 // We'll just show term hierarchy or related if available.
             });
             return output;
        }

        const concept = concepts.find(c => c.term.toString().includes(term));
        if (!concept) return `❌ Concept containing '${term}' not found.`;

        let output = `🕸️ Neighborhood of ${concept.term.toString()}:\n`;
        // Try to access links/tasks
        const beliefs = concept.getBeliefs ? concept.getBeliefs() : [];
        beliefs.forEach(b => {
             output += `  --> ${b.toString()}\n`;
        });
        return output;
    }
}

export class PriorityCommand extends AgentCommand {
    constructor() { super('priority', 'Show priority queue', 'priority [n]'); }
    async _executeImpl(agent, ...args) {
        // Try to access internal buffers if possible, or use concepts sorted by priority
        const concepts = agent.getConceptPriorities ? agent.getConceptPriorities() : [];
        // Sort by priority
        concepts.sort((a, b) => b.priority - a.priority);

        const n = args[0] ? parseInt(args[0]) : 10;
        const top = concepts.slice(0, n);

        const tableData = top.map((c, i) => [
            i + 1,
            c.term,
            c.priority.toFixed(3),
            c.activation.toFixed(3)
        ]);
        const headers = ['Rank', 'Term', 'Priority', 'Activation'];
        return `🔝 Priority Queue (Top ${top.length}):\n${FormattingUtils.formatTable(tableData, headers)}`;
    }
}

export class SearchCommand extends AgentCommand {
    constructor() { super('search', 'Search system data', 'search <type> <query>'); }
    async _executeImpl(agent, ...args) {
        if (args.length < 2) return 'Usage: search <concepts|beliefs|tasks|all> <query>';

        const type = args[0].toLowerCase();
        const query = args.slice(1).join(' ').toLowerCase();

        let results = [];

        if (['concepts', 'all'].includes(type)) {
            const concepts = agent.getConcepts ? agent.getConcepts() : [];
            const found = concepts.filter(c => c.term.toString().toLowerCase().includes(query));
            results.push(`📚 Concepts (${found.length}):\n${FormattingUtils.formatConcepts(found)}`);
        }

        if (['beliefs', 'all'].includes(type)) {
             const beliefs = agent.getBeliefs();
             const found = beliefs.filter(b => b.toString().toLowerCase().includes(query));
             if (found.length > 0) {
                 results.push(`💡 Beliefs (${found.length}):\n${FormattingUtils.formatBeliefs(found)}`);
             }
        }

        if (results.length === 0) return `No results found for '${query}' in ${type}.`;
        return results.join('\n\n');
    }
}

export class BatchCommand extends AgentCommand {
    constructor() { super('batch', 'Execute multiple commands', 'batch <cmd1> <cmd2> ...'); }
    async _executeImpl(agent, ...args) {
        // Args parsing might split by space, but we need to handle quoted strings as commands?
        // The standard split might have broken quotes.
        // For simplicity, we'll assume the user provides commands as separate args if they are simple,
        // or we assume the args ARE the commands if they were quoted.
        // The REPL parser usually splits by space but preserves quotes.

        const output = [];
        for (const cmd of args) {
            output.push(`> ${cmd}`);
            if (cmd.startsWith('/')) {
                const [c, ...a] = cmd.slice(1).split(' ');
                const res = await agent.executeCommand(c, ...a);
                output.push(res);
            } else {
                const res = await agent.processInput(cmd);
                if (res) output.push(JSON.stringify(res));
            }
        }
        return output.join('\n');
    }
}

export class TimerCommand extends AgentCommand {
    constructor() { super('timer', 'Schedule command execution', 'timer <ms> <command>'); }
    async _executeImpl(agent, ...args) {
        if (args.length < 2) return 'Usage: timer <ms> <command>';
        const ms = parseInt(args[0]);
        const cmd = args.slice(1).join(' ');

        setTimeout(async () => {
             if (agent.echo || agent.verbose) console.log(`⏰ Timer Executing: ${cmd}`);
             if (cmd.startsWith('/')) {
                const [c, ...a] = cmd.slice(1).split(' ');
                const res = await agent.executeCommand(c, ...a);
                if (res && (agent.echo || agent.verbose)) console.log(res);
            } else {
                await agent.processInput(cmd);
            }
        }, ms);

        return `✅ Scheduled '${cmd}' in ${ms}ms.`;
    }
}

export class ProfileCommand extends AgentCommand {
    constructor() { super('profile', 'Profile system performance', 'profile [ms]'); }
    async _executeImpl(agent, ...args) {
        const ms = args[0] ? parseInt(args[0]) : 1000;
        const startCycles = agent.cycleCount;
        const startTime = Date.now();

        return new Promise(resolve => {
            setTimeout(() => {
                const endCycles = agent.cycleCount;
                const endTime = Date.now();
                const deltaCycles = endCycles - startCycles;
                const deltaTime = (endTime - startTime) / 1000;
                const cps = deltaCycles / deltaTime;

                resolve(`📊 Profile Results (${ms}ms):
  Cycles: ${deltaCycles}
  Time: ${deltaTime.toFixed(3)}s
  Speed: ${cps.toFixed(2)} cycles/sec`);
            }, ms);
        });
    }
}

export class WatchCommand extends AgentCommand {
    constructor() { super('watch', 'Watch for specific changes', 'watch <type> <condition>'); }
    async _executeImpl(agent, ...args) {
        // Simple event watching.
        // Types: beliefs, tasks, derivations
        if (args.length < 2) return 'Usage: watch <beliefs|tasks> <term_fragment>';
        const type = args[0];
        const condition = args[1];

        if (!agent._watchers) agent._watchers = [];

        const handler = (data) => {
            const str = data.toString();
            if (str.includes(condition)) {
                console.log(`👀 WATCH [${type}]: ${str}`);
            }
        };

        // Map type to event
        let event = '';
        if (type === 'beliefs' || type === 'tasks') event = 'task.added'; // assuming task.added event
        // Need to check Agent events.
        // Agent.js emits 'task.input', 'reasoning.derivation'

        if (type === 'beliefs') event = 'reasoning.derivation'; // Derived beliefs
        else if (type === 'tasks') event = 'task.input';

        if (event) {
            agent.on(event, handler);
            agent._watchers.push({event, handler});
            return `✅ Watching ${event} for '${condition}'`;
        }
        return '❌ Unknown watch type.';
    }
}
