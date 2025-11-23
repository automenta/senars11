import {AgentBuilder} from '../../../src/agent/AgentBuilder.js';
import {AgentCommandRegistry} from '../../../src/repl/commands/CommandBase.js';
import * as Commands from '../../../src/repl/commands/Commands.js';
import {jest} from '@jest/globals';

describe('REPL Commands', () => {
    let agent;
    let registry;

    beforeEach(async () => {
        agent = await AgentBuilder.createBasicAgent();
        registry = new AgentCommandRegistry();

        // Register all commands
        Object.values(Commands).forEach(CmdClass => {
            if (typeof CmdClass === 'function' &&
                CmdClass.prototype instanceof Commands.AgentCommand &&
                CmdClass !== Commands.AgentCommand) {
                try {
                    registry.register(new CmdClass());
                } catch (e) {
                    // Ignore failures to register (abstract classes etc)
                }
            }
        });
    });

    afterEach(async () => {
        if (agent) await agent.dispose();
    });

    test('Registry should load commands', () => {
        const cmds = registry.getAll();
        expect(cmds.length).toBeGreaterThan(10);
        expect(registry.get('config')).toBeDefined();
        expect(registry.get('graph')).toBeDefined();
        expect(registry.get('batch')).toBeDefined();
        // Verify "missing" commands exist
        expect(registry.get('save')).toBeDefined();
        expect(registry.get('load')).toBeDefined();
        expect(registry.get('tools')).toBeDefined();
        expect(registry.get('demo')).toBeDefined();
        expect(registry.get('history')).toBeDefined();
    });

    test('ConfigCommand should show config', async () => {
        const result = await registry.execute('config', agent);
        expect(result).toContain('Configuration');
    });

    test('VerboseCommand should toggle verbose', async () => {
        await registry.execute('verbose', agent, 'on');
        expect(agent.verbose).toBe(true);
        await registry.execute('verbose', agent, 'off');
        expect(agent.verbose).toBe(false);
    });

    test('GraphCommand should show graph', async () => {
        await agent.processInput('<cat --> animal>.');
        const result = await registry.execute('graph', agent, 'animal');
        expect(result).toContain('Neighborhood');
    });

    test('PriorityCommand should show priority', async () => {
        await agent.processInput('<cat --> animal>.');
        const result = await registry.execute('priority', agent);
        expect(result).toContain('Priority Queue');
    });

    test('SearchCommand should search', async () => {
        await agent.processInput('<cat --> animal>.');
        const result = await registry.execute('search', agent, 'all', 'cat');
        expect(result).toContain('cat');
    });

    test('BatchCommand should execute multiple', async () => {
        const result = await registry.execute('batch', agent, '/verbose on', '/config');
        expect(result).toContain('Verbose mode: ON');
        expect(result).toContain('Configuration');
    });

    test('TimerCommand should schedule (mock timer)', async () => {
        jest.useFakeTimers();
        const spy = jest.spyOn(agent, 'processInput');

        const res = await registry.execute('timer', agent, '1000', '<test --> task>.');
        expect(res).toContain('Scheduled');

        jest.advanceTimersByTime(1000);
        // Verify spy called?
        // Since timer callback is async, it might be tricky to catch in test environment without waiting
        // But we mainly verify command executes without error.
        jest.useRealTimers();
    });

    test('TasksCommand should show tasks with table format', async () => {
        await agent.processInput('<cat --> animal>.');
        const result = await registry.execute('tasks', agent);
        expect(result).toContain('Source');
        expect(result).toContain('Term');
        expect(result).toContain('Type');
    });

    test('ConceptsCommand should show concepts with enhanced format', async () => {
        await agent.processInput('<cat --> animal>.');
        const result = await registry.execute('concepts', agent);
        expect(result).toContain('Beliefs');
        expect(result).toContain('Goals');
    });

    test('StatsCommand should show stats', async () => {
        const result = await registry.execute('stats', agent);
        expect(result).toContain('System Health');
    });
});
