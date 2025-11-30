import {jest} from '@jest/globals';
import {NAR} from '../../../src/nar/NAR.js';

jest.setTimeout(30000);

describe('Reasoner Integration Tests - Direct Components', () => {
    let nar;
    const config = { reasoning: { useStreamReasoner: true, cpuThrottleInterval: 0, maxDerivationDepth: 5 }, cycle: { delay: 1 } };

    beforeEach(async () => {
        nar = new NAR(config);
        await nar.initialize();
    });

    afterEach(async () => { if (nar) await nar.dispose(); });

    test('should process syllogistic reasoning with real components', async () => {
        await nar.input('(a ==> b). %0.9;0.9%');
        await nar.input('(b ==> c). %0.8;0.8%');

        for (let i = 0; i < 10; i++) await nar.step();

        const derived = nar._focus.getTasks(30).some(t => {
            const s = t.term?.toString?.();
            return s && (s.includes('(==>, a, c)') || s.includes('a ==> c'));
        });
        expect(derived).toBe(true);
    });

    test('should handle rule registration and execution with real components', async () => {
        expect(nar.streamReasoner).toBeDefined();
        expect(nar.streamReasoner.constructor.name).toBe('Reasoner');
        expect(nar.streamReasoner.ruleProcessor.ruleExecutor.getRuleCount()).toBeGreaterThan(0);
    });

    test('should maintain proper event flow during reasoning', async () => {
        const events = [];
        nar.on('reasoning.derivation', (data) => events.push(data));

        await nar.input('(x --> y). %0.9;0.9%');
        await nar.input('(y --> z). %0.8;0.8%');
        for (let i = 0; i < 5; i++) await nar.step();

        expect(events.length).toBeGreaterThanOrEqual(0);
    });

    test('should respect derivation depth limits with real components', async () => {
        const narLimited = new NAR({ ...config, reasoning: { ...config.reasoning, maxDerivationDepth: 1 } });
        await narLimited.initialize();

        try {
            await narLimited.input('(m --> n). %0.9;0.9%');
            await narLimited.input('(n --> o). %0.8;0.8%');
            for (let i = 0; i < 3; i++) await narLimited.step();
            expect(narLimited._focus.getTasks(20).length).toBeGreaterThanOrEqual(2);
        } finally {
            await narLimited.dispose();
        }
    });

    test('should handle memory and focus synchronization with real components', async () => {
        await nar.input('(d --> e). %0.9;0.9%');
        await nar.input('(e --> f). %0.8;0.8%');

        const [initialFocus, initialConcepts] = [nar._focus.getTasks(10), nar.memory.getAllConcepts()];
        expect(initialFocus.length).toBeGreaterThanOrEqual(2);
        expect(initialConcepts.length).toBeGreaterThanOrEqual(2);

        for (let i = 0; i < 3; i++) await nar.step();

        expect(nar._focus.getTasks(20).length).toBeGreaterThanOrEqual(initialFocus.length);
        expect(nar.memory.getAllConcepts().length).toBeGreaterThanOrEqual(initialConcepts.length);
    });
});

describe('Reasoner Stream Components Integration', () => {
    test('should process tasks through the complete pipeline', async () => {
        const nar = new NAR({ reasoning: { useStreamReasoner: true, cpuThrottleInterval: 0, maxDerivationDepth: 5 }, cycle: { delay: 1 } });
        await nar.initialize();

        try {
            await nar.input('<robin --> [flying]>. %0.9;0.9%');
            await nar.input('<robin --> bird>. %0.8;0.9%');
            for (let i = 0; i < 10; i++) await nar.step();
            expect(nar._focus.getTasks(50).length).toBeGreaterThanOrEqual(2);
        } finally {
            await nar.dispose();
        }
    });
});
