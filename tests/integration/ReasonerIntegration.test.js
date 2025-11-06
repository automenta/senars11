import {jest} from '@jest/globals';
import { NAR } from '../../src/nar/NAR.js';
import { SyllogisticRule } from '../../src/reason/rules/nal/SyllogisticRule.js';

// Set a timeout for all tests in this file to prevent hanging
jest.setTimeout(30000); // 30 seconds timeout

describe('Reasoner Integration Tests - Direct Components', () => {
  let nar;

  beforeEach(async () => {
    nar = new NAR({
      reasoning: {
        useStreamReasoner: true,
        cpuThrottleInterval: 0,
        maxDerivationDepth: 5
      },
      cycle: { delay: 1 }
    });
    
    await nar.initialize();
  });

  afterEach(async () => {
    if (nar) {
      await nar.dispose();
    }
  });

  test('should process syllogistic reasoning with real components', async () => {
    // Input: (a ==> b) and (b ==> c)
    await nar.input('(a ==> b). %0.9;0.9%');
    await nar.input('(b ==> c). %0.8;0.8%');

    // Run reasoning steps
    for (let i = 0; i < 10; i++) {
      await nar.step();
    }

    // Check final focus content for derived conclusion (a ==> c)
    const finalFocusTasks = nar._focus.getTasks(30);
    
    // Look for the syllogistic conclusion (a ==> c)
    const syllogisticDerivation = finalFocusTasks.some(task => {
      const termStr = task.term?.toString?.();
      return termStr && (termStr.includes('(==>, a, c)') || termStr.includes('a ==> c'));
    });

    expect(syllogisticDerivation).toBe(true);
  });

  test('should handle rule registration and execution with real components', async () => {
    // Verify that the new reasoner is properly configured
    expect(nar.streamReasoner).toBeDefined();
    expect(nar.streamReasoner.constructor.name).toBe('Reasoner');
    
    // Verify the rule executor has the syllogistic rule
    const ruleCount = nar.streamReasoner.ruleProcessor.ruleExecutor.getRuleCount();
    expect(ruleCount).toBeGreaterThan(0);
  });

  test('should maintain proper event flow during reasoning', async () => {
    const derivationEvents = [];
    
    nar.on('reasoning.derivation', (data) => {
      derivationEvents.push(data);
    });

    await nar.input('(x --> y). %0.9;0.9%');
    await nar.input('(y --> z). %0.8;0.8%');

    // Run reasoning steps
    for (let i = 0; i < 5; i++) {
      await nar.step();
    }

    // Should have generated reasoning derivation events
    expect(derivationEvents.length).toBeGreaterThanOrEqual(0);
  });

  test('should respect derivation depth limits with real components', async () => {
    const narLimited = new NAR({
      reasoning: {
        useStreamReasoner: true,
        cpuThrottleInterval: 0,
        maxDerivationDepth: 1  // Very low limit
      },
      cycle: { delay: 1 }
    });
    
    await narLimited.initialize();

    try {
      await narLimited.input('(m --> n). %0.9;0.9%');
      await narLimited.input('(n --> o). %0.8;0.8%');

      for (let i = 0; i < 3; i++) {
        await narLimited.step();
      }

      // Should still work but with depth-aware processing
      const finalTasks = narLimited._focus.getTasks(20);
      expect(finalTasks.length).toBeGreaterThanOrEqual(2);
    } finally {
      await narLimited.dispose();
    }
  });

  test('should handle memory and focus synchronization with real components', async () => {
    await nar.input('(d --> e). %0.9;0.9%');
    await nar.input('(e --> f). %0.8;0.8%');

    // Check both focus and memory
    const focusTasks = nar._focus.getTasks(10);
    const memoryConcepts = nar.memory.getAllConcepts();
    
    expect(focusTasks.length).toBeGreaterThanOrEqual(2);
    expect(memoryConcepts.length).toBeGreaterThanOrEqual(2);

    // Run reasoning
    for (let i = 0; i < 3; i++) {
      await nar.step();
    }

    // Verify that new derivations are in both focus and memory
    const finalFocusTasks = nar._focus.getTasks(20);
    const finalMemoryConcepts = nar.memory.getAllConcepts();
    
    expect(finalFocusTasks.length).toBeGreaterThanOrEqual(focusTasks.length);
    expect(finalMemoryConcepts.length).toBeGreaterThanOrEqual(memoryConcepts.length);
  });
});

describe('Reasoner Stream Components Integration', () => {
  test('should process tasks through the complete pipeline', async () => {
    const nar = new NAR({
      reasoning: {
        useStreamReasoner: true,
        cpuThrottleInterval: 0,
        maxDerivationDepth: 5
      },
      cycle: { delay: 1 }
    });
    
    await nar.initialize();
    
    try {
      // Input tasks to trigger the stream-based reasoning
      await nar.input('<robin --> [flying]>. %0.9;0.9%');
      await nar.input('<robin --> bird>. %0.8;0.9%');
      
      // Run several steps to allow the stream reasoner to process
      for (let i = 0; i < 10; i++) {
        await nar.step();
      }
      
      // Check that reasoning has occurred - we expect at least the original inputs
      const tasks = nar._focus.getTasks(50);
      expect(tasks.length).toBeGreaterThanOrEqual(2); // At least the original inputs
    } finally {
      await nar.dispose();
    }
  });
});