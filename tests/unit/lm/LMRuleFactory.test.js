import {LMRuleFactory} from '../../../src/lm/LMRuleFactory.js';
import {LM} from '../../../src/lm/LM.js';
import {DummyProvider} from '../../../src/lm/DummyProvider.js';

describe('LMRuleFactory', () => {
    let lm;

    beforeEach(async () => {
        lm = new LM();
        await lm.initialize();

        const provider = new DummyProvider({id: 'test-provider'});
        lm.registerProvider('test-provider', provider);
    });

    test('should create a basic LM rule', () => {
        const promptTemplate = 'Process: {{taskTerm}}';
        const responseProcessor = async (response, task) => [];

        const rule = LMRuleFactory.create({
            id: 'test-rule',
            lm,
            promptTemplate,
            responseProcessor,
            priority: 0.7
        });

        expect(rule.id).toBe('test-rule');
        expect(rule.lm).toBe(lm);
        expect(rule.priority).toBe(0.7);
        expect(rule.promptTemplate).toBe('Process: {{taskTerm}}');
    });

    test('should throw error when required parameters are missing', () => {
        expect(() => {
            LMRuleFactory.create({});
        }).toThrow();

        expect(() => {
            LMRuleFactory.create({id: 'test-rule'});
        }).toThrow();

        expect(() => {
            LMRuleFactory.create({lm});
        }).toThrow();
    });

    test('should create simple rule', () => {
        const rule = LMRuleFactory.createSimple({
            id: 'simple-rule',
            lm,
            promptTemplate: 'Template: {{taskTerm}}',
            priority: 0.6
        });

        expect(rule.id).toBe('simple-rule');
        expect(rule.lm).toBe(lm);
        expect(rule.priority).toBe(0.6);
        expect(rule.promptTemplate).toBe('Template: {{taskTerm}}');
    });

    test('should create inference rule', () => {
        const rule = LMRuleFactory.createInferenceRule({
            id: 'inference-rule',
            lm,
            priority: 0.5
        });

        expect(rule.id).toBe('inference-rule');
        expect(rule.lm).toBe(lm);
        expect(rule.priority).toBe(0.5);
        expect(rule.promptTemplate).toContain('Given the task');
    });

    test('should create hypothesis rule', () => {
        const rule = LMRuleFactory.createHypothesisRule({
            id: 'hypothesis-rule',
            lm,
            priority: 0.4
        });

        expect(rule.id).toBe('hypothesis-rule');
        expect(rule.lm).toBe(lm);
        expect(rule.priority).toBe(0.4);
        expect(rule.promptTemplate).toContain('generate a plausible hypothesis');
    });
});