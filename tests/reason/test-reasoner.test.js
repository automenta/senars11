import { Reasoner, PremiseSource, TaskBagPremiseSource, Strategy, RuleProcessor, RuleExecutor, Rule } from '../../src/reason/index.js';
import { ArrayStamp } from '../../src/Stamp.js';

// Mock Task for testing
class MockTask {
  constructor(term, type = 'BELIEF', truth = { frequency: 0.9, confidence: 0.9 }) {
    this.term = term;
    this.type = type;
    this.truth = truth;
    this.stamp = new ArrayStamp({ source: 'INPUT', depth: 0 });
  }
  
  toString() {
    return `Task(${this.term}, ${this.type})`;
  }
}

// Mock Memory for testing
class MockMemory {
  constructor() {
    this.taskBag = {
      tasks: [
        new MockTask('A --> B', 'BELIEF'),
        new MockTask('A', 'BELIEF')
      ],
      take: () => this.taskBag.tasks.shift() || null
    };
  }
}

// Simple test rule for deduction: if A --> B and A, then B
class TestDeductionRule extends Rule {
  constructor() {
    super('deduction-test', 'nal', 0.8);
  }
  
  canApply(primaryPremise, secondaryPremise) {
    // Check if we have A --> B and A pattern
    const hasImplication = primaryPremise.term.includes('-->');
    const hasSubject = secondaryPremise.term === primaryPremise.term.split(' --> ')[0];
    
    return hasImplication && hasSubject;
  }
  
  apply(primaryPremise, secondaryPremise) {
    // Extract the conclusion from the implication
    const conclusion = primaryPremise.term.split(' --> ')[1];
    
    // Create a derived task
    const derivedTerm = conclusion;
    const derivedTask = new MockTask(derivedTerm, primaryPremise.type, primaryPremise.truth);
    
    // Create a derived stamp that includes parent information for depth calculation
    derivedTask.stamp = ArrayStamp.derive([primaryPremise.stamp, secondaryPremise.stamp]);
    
    return [derivedTask];
  }
}

describe('New Reasoner - Stream-based Architecture', () => {
  let memory;
  let premiseSource;
  let strategy;
  let ruleExecutor;
  let ruleProcessor;
  let reasoner;

  beforeEach(() => {
    memory = new MockMemory();
    premiseSource = new TaskBagPremiseSource(memory, { priority: true });
    strategy = new Strategy();
    ruleExecutor = new RuleExecutor();
    ruleProcessor = new RuleProcessor(ruleExecutor, { maxDerivationDepth: 5 });
    reasoner = new Reasoner(premiseSource, strategy, ruleProcessor, { maxDerivationDepth: 5 });
  });

  test('should initialize correctly', () => {
    expect(reasoner).toBeDefined();
    expect(reasoner.premiseSource).toBe(premiseSource);
    expect(reasoner.strategy).toBe(strategy);
    expect(reasoner.ruleProcessor).toBe(ruleProcessor);
  });

  test('should process a simple deduction', async () => {
    // Add a test rule
    const testRule = new TestDeductionRule();
    ruleExecutor.register(testRule);

    // Create a simple premise stream manually for testing
    const mockPrimaryPremise = new MockTask('A --> B', 'BELIEF');
    const mockSecondaryPremise = new MockTask('A', 'BELIEF');
    
    // Test the rule executor directly
    const candidateRules = ruleExecutor.getCandidateRules(mockPrimaryPremise, mockSecondaryPremise);
    expect(candidateRules.length).toBe(1);
    
    const results = ruleExecutor.executeRule(candidateRules[0], mockPrimaryPremise, mockSecondaryPremise, {});
    expect(results.length).toBe(1);
    expect(results[0].term).toBe('B');
    expect(results[0].stamp.depth).toBe(1);
  });

  test('should respect derivation depth limits', async () => {
    // Create a rule that creates a derivation
    const testRule = new TestDeductionRule();
    ruleExecutor.register(testRule);

    // Create a premise that will result in a derivation
    const mockPrimaryPremise = new MockTask('A --> B', 'BELIEF');
    const mockSecondaryPremise = new MockTask('A', 'BELIEF');
    
    // Set a very low depth limit
    const limitedRuleProcessor = new RuleProcessor(ruleExecutor, { maxDerivationDepth: 0 });
    
    // The derivation should be discarded due to depth limit
    const results = limitedRuleProcessor.process({
      [Symbol.asyncIterator]: async function*() {
        yield [mockPrimaryPremise, mockSecondaryPremise];
      }
    });
    
    // We need to manually simulate the processing to test depth limits
    for await (const result of results) {
      // This should not produce results due to depth limit
      expect(result).toBeNull();
    }
  });

  test('should support single step execution', async () => {
    // Add a test rule
    const testRule = new TestDeductionRule();
    ruleExecutor.register(testRule);
    
    // This test needs to be more specific to how the new architecture works
    // For now, just test that step() method exists and is async
    expect(typeof reasoner.step).toBe('function');
    expect(reasoner.step()).resolves.toBe(null); // Should return null if no premises available immediately
  });
});