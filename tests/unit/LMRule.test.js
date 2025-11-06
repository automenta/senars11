/**
 * Unit tests for LMRule functionality
 */
import {LMRule} from '../../src/reason/LMRule.js';
import {Punctuation, Task, TruthValue} from '../../src/reason/TaskUtils.js';
import {
    createAnalogicalReasoningRule,
    createBeliefRevisionRule,
    createExplanationGenerationRule,
    createGoalDecompositionRule,
    createHypothesisGenerationRule,
    createInteractiveClarificationRule,
    createMetaReasoningGuidanceRule,
    createSchemaInductionRule,
    createTemporalCausalModelingRule,
    createUncertaintyCalibrationRule,
    createVariableGroundingRule
} from '../../src/reason/lm/index.js';
import {LMRuleFactory} from '../../src/lm/LMRuleFactory.js';
import {LMRuleUtils} from '../../src/reason/LMRuleUtils.js';

// Mock LM for testing
class MockLM {
    constructor(responses = {}) {
        this.responses = responses;
    }

    async generateText(prompt, options = {}) {
        // Return predefined responses for testing
        const key = Object.keys(this.responses).find(pattern => prompt.includes(pattern));
        if (key) {
            return this.responses[key];
        }
        // Default fallback response
        return "Default mock response";
    }

    async process(prompt, options = {}) {
        return this.generateText(prompt, options);
    }

    async query(prompt, options = {}) {
        return this.generateText(prompt, options);
    }
}

describe('LMRule', () => {
    let mockLM;

    beforeEach(() => {
        mockLM = new MockLM({
            "decompose": "Sub-goal: research topic\nSub-goal: create outline\nSub-goal: write draft",
            "hypothesis": "Regular exercise improves mental health",
            "causal": "rain --> wet streets"
        });
    });

    test('should create rule with basic configuration', () => {
        const rule = LMRule.create({
            id: 'test-rule',
            lm: mockLM,
            name: 'Test Rule',
            description: 'A test rule'
        });

        expect(rule.id).toBe('test-rule');
        expect(rule.name).toBe('Test Rule');
        expect(rule.lm).toBe(mockLM);
    });

    test('should apply basic condition function', () => {
        const rule = LMRule.create({
            id: 'conditional-rule',
            lm: mockLM,
            condition: (primary, secondary, context) => primary && primary.term?.name === 'test'
        });

        const testTask = new Task('test', Punctuation.JUDGMENT);
        const otherTask = new Task('other', Punctuation.JUDGMENT);

        expect(rule.canApply(testTask, null, {})).toBe(true);
        expect(rule.canApply(otherTask, null, {})).toBe(false);
    });

    test('should generate prompt using template', () => {
        const rule = LMRule.create({
            id: 'prompt-test',
            lm: mockLM,
            promptTemplate: 'Process: {{taskTerm}}',
            process: (response) => response,
            generate: (output) => []
        });

        const testTask = new Task('sample term', Punctuation.JUDGMENT);
        const prompt = rule.generatePrompt(testTask, null, {});

        expect(prompt).toBe('Process: sample term');
    });

    test('should execute LM and process result', async () => {
        const rule = LMRule.create({
            id: 'process-test',
            lm: mockLM,
            condition: () => true,
            prompt: () => 'decompose test goal',
            process: (response) => response.split('\n').filter(line => line.trim()),
            generate: (output) => output.map(item => new Task(item.trim(), Punctuation.JUDGMENT))
        });

        const result = await rule.apply(new Task('test goal', Punctuation.GOAL), null, {});

        expect(result).toHaveLength(3);
        expect(result[0].term.name).toContain('Sub-goal: research topic');
    });

    test('should handle errors gracefully', async () => {
        const errorLM = {
            generateText: () => {
                throw new Error('LM error');
            }
        };

        const rule = LMRule.create({
            id: 'error-test',
            lm: errorLM,
            condition: () => true,
            prompt: () => 'test prompt',
            process: (response) => response,
            generate: (output) => [new Task(output, Punctuation.JUDGMENT)]
        });

        const result = await rule.apply(new Task('test', Punctuation.JUDGMENT), null, {});

        expect(result).toEqual([]);
    });

    test('should track execution stats', async () => {
        const rule = LMRule.create({
            id: 'stats-test',
            lm: mockLM,
            condition: () => true,
            prompt: () => 'test prompt',
            process: (response) => response,
            generate: (output) => []
        });

        await rule.apply(new Task('test', Punctuation.JUDGMENT), null, {});

        const stats = rule.getStats();
        expect(stats.execution.totalExecutions).toBe(1);
        expect(stats.execution.successfulExecutions).toBe(1);
    });

    test('should support backward compatibility with promptTemplate', () => {
        const rule = new LMRule('compat-rule', mockLM, {
            promptTemplate: 'Template: {{taskTerm}}',
            responseProcessor: (response) => [new Task(response, Punctuation.JUDGMENT)]
        });

        const testTask = new Task('test-term', Punctuation.JUDGMENT);
        const prompt = rule.generatePrompt(testTask, null, {});
        expect(prompt).toBe('Template: test-term');
    });
});

describe('Specific LM Rules from v9', () => {
    let mockLM;

    beforeEach(() => {
        mockLM = new MockLM({
            "decompose": "Research the topic\nCreate an outline\nWrite the first draft\nReview and edit",
            "hypothesis": "Practicing regularly improves performance",
            "causal": "exercise --> improved health",
            "revision": "Revised belief with nuance",
            "explanation": "This is a simple explanation of the formal statement",
            "analogy": "This works like how studying improves knowledge",
            "variable": "value1\nvalue2\nvalue3",
            "clarification": "What specific aspect of this problem are you addressing?\nHow will you measure success?",
            "strategy": "Decomposition strategy is recommended for this complex problem",
            "schema": "IF condition THEN action",
            "calibration": "0.75"
        });
    });

    test('GoalDecompositionRule should decompose goals', () => {
        const rule = createGoalDecompositionRule({lm: mockLM});

        const goalTask = new Task('Write a report', Punctuation.GOAL);
        goalTask.priority = 0.8;
        goalTask.truth = new TruthValue(0.7, 0.9);

        expect(rule.canApply(goalTask)).toBe(true);
    });

    test('HypothesisGenerationRule should generate hypotheses', () => {
        const rule = createHypothesisGenerationRule({lm: mockLM});

        const beliefTask = new Task('Regular exercise is beneficial', Punctuation.JUDGMENT);
        beliefTask.priority = 0.8;
        beliefTask.truth = new TruthValue(0.8, 0.9);

        expect(rule.canApply(beliefTask)).toBe(true);
    });

    test('TemporalCausalModelingRule should model causal relationships', () => {
        const rule = createTemporalCausalModelingRule({lm: mockLM});

        const beliefTask = new Task('Exercise leads to better health', Punctuation.JUDGMENT);
        beliefTask.priority = 0.8;
        beliefTask.truth = new TruthValue(0.8, 0.9);

        expect(rule.canApply(beliefTask)).toBe(true);
    });

    test('BeliefRevisionRule should identify contradictory beliefs', () => {
        const rule = createBeliefRevisionRule({lm: mockLM});

        const beliefTask = new Task('This contradicts that', Punctuation.JUDGMENT);
        beliefTask.priority = 0.9;
        beliefTask.truth = new TruthValue(0.8, 0.9);

        expect(rule.canApply(beliefTask)).toBe(true);
    });

    test('ExplanationGenerationRule should identify complex relations', () => {
        const rule = createExplanationGenerationRule({lm: mockLM});

        const beliefTask = new Task('A --> B', Punctuation.JUDGMENT);
        beliefTask.priority = 0.7;
        beliefTask.truth = new TruthValue(0.8, 0.9);

        expect(rule.canApply(beliefTask)).toBe(true);
    });

    test('AnalogicalReasoningRule should identify problem-solving goals', () => {
        const rule = createAnalogicalReasoningRule({lm: mockLM});

        const goalTask = new Task('Solve this problem', Punctuation.GOAL);
        goalTask.priority = 0.7;
        goalTask.truth = new TruthValue(0.8, 0.9);

        expect(rule.canApply(goalTask)).toBe(true);
    });

    test('VariableGroundingRule should identify variables', () => {
        const rule = createVariableGroundingRule({lm: mockLM});

        const task = new Task('Find value for $X', Punctuation.JUDGMENT);
        task.priority = 0.8;
        task.truth = new TruthValue(0.8, 0.9);

        expect(rule.canApply(task)).toBe(true);
    });

    test('InteractiveClarificationRule should identify ambiguous statements', () => {
        const rule = createInteractiveClarificationRule({lm: mockLM});

        const task = new Task('It should work', Punctuation.QUESTION);
        task.priority = 0.8;
        task.truth = new TruthValue(0.8, 0.9);

        expect(rule.canApply(task)).toBe(true);
    });

    test('MetaReasoningGuidanceRule should identify complex problems', () => {
        const rule = createMetaReasoningGuidanceRule({lm: mockLM});

        const task = new Task('Optimize this system', Punctuation.GOAL);
        task.priority = 0.9;
        task.truth = new TruthValue(0.8, 0.9);

        expect(rule.canApply(task)).toBe(true);
    });

    test('SchemaInductionRule should identify narrative text', () => {
        const rule = createSchemaInductionRule({lm: mockLM});

        const task = new Task('First do A, then do B', Punctuation.JUDGMENT);
        task.priority = 0.7;
        task.truth = new TruthValue(0.8, 0.9);

        expect(rule.canApply(task)).toBe(true);
    });

    test('UncertaintyCalibrationRule should identify uncertain language', () => {
        const rule = createUncertaintyCalibrationRule({lm: mockLM});

        const task = new Task('Maybe this will work', Punctuation.JUDGMENT);
        task.priority = 0.7;
        task.truth = new TruthValue(0.99, 0.99); // High confidence to trigger rule

        expect(rule.canApply(task)).toBe(true);
    });
});

describe('LMRuleFactory', () => {
    let mockLM;

    beforeEach(() => {
        mockLM = new MockLM({
            "inference": "Derived inference from input",
            "hypothesis": "Possible hypothesis"
        });
    });

    test('should create basic rule', () => {
        const rule = LMRule.create({
            id: 'factory-test',
            lm: mockLM
        });

        expect(rule.id).toBe('factory-test');
        expect(rule.lm).toBe(mockLM);
    });

    test('should create inference rule', () => {
        const rule = LMRule.create({
            id: 'inference-rule',
            lm: mockLM,
            name: 'Inference Rule',
            description: 'Generates logical inferences'
        });

        expect(rule.name).toBe('Inference Rule');
        expect(rule.description).toBe('Generates logical inferences');
    });

    test('should create common rules via factory', () => {
        const goalRule = LMRuleFactory.createCommonRule('goal-decomposition', {lm: mockLM});
        const hypRule = LMRuleFactory.createCommonRule('hypothesis-generation', {lm: mockLM});
        const causalRule = LMRuleFactory.createCommonRule('causal-analysis', {lm: mockLM});

        expect(goalRule.id).toBe('goal-decomposition');
        expect(hypRule.id).toBe('hypothesis-generation');
        expect(causalRule.id).toBe('causal-analysis');
    });
});

describe('LMRuleUtils', () => {
    let mockLM;

    beforeEach(() => {
        mockLM = new MockLM({});
    });

    test('should create pattern-based rules', () => {
        const rule = LMRuleUtils.createPatternBasedRule({
            id: 'pattern-test',
            lm: mockLM,
            patternType: 'problemSolving'
        });

        const task = new Task('Solve the equation', Punctuation.GOAL);
        task.priority = 0.8;

        expect(rule.canApply(task)).toBe(true);
    });

    test('should create punctuation-based rules', () => {
        const rule = LMRuleUtils.createPunctuationBasedRule({
            id: 'punct-test',
            lm: mockLM,
            punctuation: Punctuation.GOAL
        });

        const goalTask = new Task('goal', Punctuation.GOAL);
        const judgmentTask = new Task('judgment', Punctuation.JUDGMENT);

        expect(rule.canApply(goalTask)).toBe(true);
        expect(rule.canApply(judgmentTask)).toBe(false);
    });

    test('should create priority-based rules', () => {
        const rule = LMRuleUtils.createPriorityBasedRule({
            id: 'priority-test',
            lm: mockLM,
            minPriority: 0.6
        });

        const highPriorityTask = new Task('task', Punctuation.JUDGMENT);
        highPriorityTask.priority = 0.8;

        const lowPriorityTask = new Task('task', Punctuation.JUDGMENT);
        lowPriorityTask.priority = 0.4;

        expect(rule.canApply(highPriorityTask)).toBe(true);
        expect(rule.canApply(lowPriorityTask)).toBe(false);
    });

    test('should create prompt templates', () => {
        const goalTemplate = LMRuleUtils.createPromptTemplate('goalDecomposition');
        expect(goalTemplate.toLowerCase()).toContain('decompose');

        const hypTemplate = LMRuleUtils.createPromptTemplate('hypothesisGeneration');
        expect(hypTemplate).toContain('hypothesis');
    });

    test('should create response processors', () => {
        const listProcessor = LMRuleUtils.createResponseProcessor('list');
        const processed = listProcessor('Item 1\nItem 2\nItem 3');
        expect(processed).toHaveLength(3);

        const singleProcessor = LMRuleUtils.createResponseProcessor('single');
        expect(singleProcessor('  Clean this text  ')).toBe('Clean this text');

        const numberProcessor = LMRuleUtils.createResponseProcessor('number');
        expect(numberProcessor('The value is 0.75')).toBe(0.75);
    });
});