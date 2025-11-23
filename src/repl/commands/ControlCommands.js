import {AgentCommand} from './CommandBase.js';

export class StartCommand extends AgentCommand {
    constructor() {
        super('start', 'Start continuous execution', 'start', ['go']);
    }
    async _executeImpl(agent) {
        if (typeof agent._run === 'function') {
            await agent._run();
            return '🚀 Execution started.';
        }
        return '❌ Agent does not support start (missing _run method).';
    }
}

export class StopCommand extends AgentCommand {
    constructor() {
        super('stop', 'Stop continuous execution', 'stop', ['st']);
    }
    async _executeImpl(agent) {
        // Prefer _stopRun if available (common in some agents)
        if (typeof agent._stopRun === 'function') {
            agent._stopRun();
            return '⏸️ Execution stopped.';
        }
        // Fallback to _stop (used in ReplMessageHandler)
        if (typeof agent._stop === 'function') {
            await agent._stop();
            return '⏸️ Execution stopped.';
        }
        // Fallback to stop
        if (typeof agent.stop === 'function') {
             await agent.stop();
             return '⏸️ Execution stopped.';
        }
        return '❌ Agent does not support stop.';
    }
}

export class QuitCommand extends AgentCommand {
    constructor() {
        super('quit', 'Exit the REPL', 'quit', ['q', 'exit']);
    }
    async _executeImpl(agent) {
        if (typeof agent.shutdown === 'function') {
             await agent.shutdown();
        }
        process.exit(0);
    }
}
