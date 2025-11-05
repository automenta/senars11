import {jest} from '@jest/globals';
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
  constructor(tasks = null) {
    this.taskBag = {
      tasks: tasks || [
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
    const hasImplication = primaryPremise.term && primaryPremise.term.includes('-->');
    const hasSubject = secondaryPremise.term === (primaryPremise.term?.split(' --> ')[0]);
    
    return hasImplication && hasSubject;
  }
  
  apply(primaryPremise, secondaryPremise) {
    if (!this.canApply(primaryPremise, secondaryPremise)) {
      return [];
    }
    
    // Extract the conclusion from the implication
    const conclusion = primaryPremise.term.split(' --> ')[1];
    
    // Create a derived task
    const derivedTask = new MockTask(conclusion, primaryPremise.type, primaryPremise.truth);
    
    // Create a derived stamp that includes parent information for depth calculation
    // Use ArrayStamp.derive to properly create a derived stamp with parent relationship
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

  test('should initialize correctly with all components', () => {
    expect(reasoner).toBeDefined();
    expect(reasoner.premiseSource).toBe(premiseSource);
    expect(reasoner.strategy).toBe(strategy);
    expect(reasoner.ruleProcessor).toBe(ruleProcessor);
    expect(reasoner.config.maxDerivationDepth).toBe(5);
    expect(reasoner.config.cpuThrottleInterval).toBe(0);
  });

  test('should process a simple deduction using rule executor', async () => {
    // Add a test rule
    const testRule = new TestDeductionRule();
    ruleExecutor.register(testRule);

    // Create test premises
    const mockPrimaryPremise = new MockTask('A --> B', 'BELIEF');
    const mockSecondaryPremise = new MockTask('A', 'BELIEF');
    
    // Test the rule executor directly
    const candidateRules = ruleExecutor.getCandidateRules(mockPrimaryPremise, mockSecondaryPremise);
    expect(candidateRules.length).toBe(1);
    
    // Execute the rule and check result
    const results = ruleExecutor.executeRule(candidateRules[0], mockPrimaryPremise, mockSecondaryPremise, {});
    expect(results.length).toBe(1);
    expect(results[0].term).toBe('B');
    expect(results[0].stamp.depth).toBe(1); // Should have depth 1 after derivation
  });

  test('should respect derivation depth limits in rule processor', async () => {
    // Mock console.debug to prevent test output pollution
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    
    try {
      // Add the test rule
      const testRule = new TestDeductionRule();
      ruleExecutor.register(testRule);

      // Create a mock premise pair stream
      async function* mockPremiseStream() {
        yield [new MockTask('A --> B', 'BELIEF'), new MockTask('A', 'BELIEF')];
      }
      
      // Create a rule processor with a depth limit of 0 (should discard everything)
      const limitedRuleProcessor = new RuleProcessor(ruleExecutor, { maxDerivationDepth: 0 });
      
      // Process the stream
      const results = [];
      for await (const result of limitedRuleProcessor.process(mockPremiseStream())) {
        results.push(result);
      }
      
      // Should have no results because they were all discarded due to depth limit
      expect(results.length).toBe(0);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  test('should handle single step execution', async () => {
    // This test verifies that the step() method exists and works appropriately
    expect(typeof reasoner.step).toBe('function');
    
    // Since there's no active premise source feeding data, step should return an empty array
    const result = await reasoner.step();
    // The result is an array (may be empty if no premises are immediately available)
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  test('should handle empty premise stream gracefully', async () => {
    // Create a memory with empty task bag to test empty stream handling
    const emptyMemory = new MockMemory([]);
    const emptyPremiseSource = new TaskBagPremiseSource(emptyMemory, { priority: true });
    
    const emptyReasoner = new Reasoner(emptyPremiseSource, strategy, ruleProcessor, { maxDerivationDepth: 5 });
    
    // Single step should return an empty array for empty stream
    const result = await emptyReasoner.step();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  test('should support start/stop functionality', async () => {
    // Mock console.warn to prevent test output pollution when starting already running reasoner
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    try {
      // Verify that start and stop methods exist
      expect(typeof reasoner.start).toBe('function');
      expect(typeof reasoner.stop).toBe('function');
      
      // Initially should not be running
      expect(reasoner.isRunning).toBe(false);
      
      // Start should work
      reasoner.start();
      // We can't easily check isRunning here because it runs async, but we can at least verify start doesn't throw
      expect(() => reasoner.start()).not.toThrow();
      
      // Stop should work
      reasoner.stop();
      expect(reasoner.isRunning).toBe(false);
    } finally {
      consoleSpy.mockRestore();
    }
  });
});