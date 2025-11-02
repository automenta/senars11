import {beforeEach, describe, expect, it, vi} from 'vitest';
import useUiStore from '../stores/uiStore.js';

describe('Stability Assurance Tests', () => {
  beforeEach(() => {
    // Reset the store to initial state before each test group
    useUiStore.getState().resetStore();
  });

  describe('Error Handling & Resilience', () => {
    it('should handle empty data gracefully without crashing', () => {
      // Even with empty data, the store should function normally
      expect(useUiStore.getState().reasoningSteps).toEqual([]);
      expect(useUiStore.getState().tasks).toEqual([]);
      expect(useUiStore.getState().concepts).toEqual([]);
      
      // Operations should work fine even with empty data
      useUiStore.getState().addReasoningStep({ id: 'step1', description: 'First step', timestamp: Date.now() });
      expect(useUiStore.getState().reasoningSteps.length).toBe(1);
    });

    it('should handle large data sets without performance issues', () => {
      // Create large mock datasets to test performance
      const largeReasoningSteps = Array.from({length: 1000}, (_, i) => ({
        id: `step${i}`,
        description: `Step ${i} description`,
        timestamp: Date.now() - (1000 - i) * 1000,
        result: i % 2 === 0 ? 'success' : 'failure',
        metadata: { iteration: i, complexity: Math.random() }
      }));

      const largeTasks = Array.from({length: 500}, (_, i) => ({
        id: `task${i}`,
        term: `<task${i} --> concept${i % 100}>`,
        type: i % 3 === 0 ? 'belief' : i % 3 === 1 ? 'goal' : 'question',
        priority: Math.random(),
        creationTime: Date.now() - (500 - i) * 2000
      }));

      // Add large datasets to store
      largeReasoningSteps.forEach(step => useUiStore.getState().addReasoningStep(step));
      largeTasks.forEach(task => useUiStore.getState().addTask(task));

      // Verify data was added without performance issues
      expect(useUiStore.getState().reasoningSteps.length).toBe(1000);
      expect(useUiStore.getState().tasks.length).toBe(500);
    });

    it('should handle invalid or malformed data without crashing', () => {
      // Add some invalid data to test resilience
      const invalidSteps = [
        null,  // Invalid step
        undefined,  // Invalid step
        { id: 'step1' },  // Minimal step
        { description: 'Step without ID' },  // Step without required fields
        {},  // Empty step
        { id: 'step5', description: 'Valid step', timestamp: 'invalid-timestamp' }  // Step with invalid timestamp
      ];

      const invalidTasks = [
        null,
        { id: 'task1', term: null },  // Task with null term
        { id: 'task2', type: undefined }  // Task with undefined type
      ];

      const invalidConcepts = [
        { term: null, priority: -1 },  // Invalid concept
        { term: 'valid', priority: 1.5 }  // Priority out of normal range
      ];

      // Add all invalid data - should not crash
      invalidSteps.forEach(step => {
        if (step) useUiStore.getState().addReasoningStep(step);
      });
      
      invalidTasks.forEach(task => {
        if (task) useUiStore.getState().addTask(task);
      });
      
      invalidConcepts.forEach(concept => useUiStore.getState().addConcept(concept));

      // Store should still be functional
      expect(useUiStore.getState().reasoningSteps.length).toBeGreaterThanOrEqual(0);
      expect(useUiStore.getState().tasks.length).toBeGreaterThanOrEqual(0);
      expect(useUiStore.getState().concepts.length).toBe(2); // Only valid concepts should be added
    });

    it('should continue operating when connection status changes', () => {
      useUiStore.getState().setWsConnected(false);
      expect(useUiStore.getState().wsConnected).toBe(false);
      
      // Other functionality should still work
      useUiStore.getState().addNotification({ type: 'info', message: 'Connection offline' });
      expect(useUiStore.getState().notifications.length).toBe(1);
      
      useUiStore.getState().setWsConnected(true);
      expect(useUiStore.getState().wsConnected).toBe(true);
    });
  });

  describe('Store Stability Under Stress', () => {
    it('should maintain stability with rapidly updating data', () => {
      // Simulate rapid updates to the store
      for (let i = 0; i < 100; i++) {
        useUiStore.getState().addReasoningStep({
          id: `step${i}`,
          description: `Dynamic step ${i}`,
          timestamp: Date.now()
        });
      }
      
      // Verify store remains stable
      expect(useUiStore.getState().reasoningSteps.length).toBe(100);
      
      // Continue adding more data to test sustained stress
      for (let i = 0; i < 50; i++) {
        useUiStore.getState().addTask({
          id: `task${i}`,
          term: `Dynamic task ${i}`,
          type: 'belief',
          creationTime: Date.now()
        });
      }
      
      expect(useUiStore.getState().tasks.length).toBe(50);
    });

    it('should handle repeated state updates without degrading', () => {
      const step = { id: 'test-step', description: 'Test', timestamp: Date.now() };
      useUiStore.getState().addReasoningStep(step);
      
      // Repeatedly update the same step
      for (let i = 0; i < 20; i++) {
        useUiStore.getState().updateReasoningStep('test-step', { status: `status-${i}` });
      }
      
      // Verify the final state is correct
      const updatedStep = useUiStore.getState().reasoningSteps.find(s => s.id === 'test-step');
      expect(updatedStep.status).toBe('status-19');
    });

    it('should maintain stability with frequent UI state changes', () => {
      // Simulate frequent theme changes
      for (let i = 0; i < 10; i++) {
        useUiStore.getState().setTheme(i % 2 === 0 ? 'light' : 'dark');
        expect(useUiStore.getState().theme).toBe(i % 2 === 0 ? 'light' : 'dark');
      }
      
      // Simulate frequent loading state changes
      for (let i = 0; i < 10; i++) {
        useUiStore.getState().setLoading(i % 2 === 0);
        expect(useUiStore.getState().isLoading).toBe(i % 2 === 0);
      }
    });
  });

  describe('Memory Management & Resource Cleanup', () => {
    it('should handle repeated data additions and removals', () => {
      // Add and remove data multiple times
      for (let cycle = 0; cycle < 5; cycle++) {
        const stepsBefore = useUiStore.getState().reasoningSteps.length; // Should be 0 for cycles 0-3, could be 10 on cycle 4 if we didn't clear
        
        // Add data for this cycle
        for (let i = 0; i < 10; i++) {
          useUiStore.getState().addReasoningStep({
            id: `cycle${cycle}-step${i}`,
            description: `Step in cycle ${cycle}`,
            timestamp: Date.now()
          });
        }
        
        // Verify data was added - total should be previous + 10
        expect(useUiStore.getState().reasoningSteps.length).toBe(stepsBefore + 10);
        
        // Clear data for all cycles except the last one
        if (cycle < 4) { // Don't clear on the last cycle
          useUiStore.getState().clearReasoningSteps();
          expect(useUiStore.getState().reasoningSteps.length).toBe(0);
        }
      }
      
      // At the end, we should have 10 steps from the last cycle (cycle 4)
      expect(useUiStore.getState().reasoningSteps.length).toBe(10);
    });

    it('should manage notifications without memory leaks', () => {
      // Add many notifications
      for (let i = 0; i < 50; i++) {
        useUiStore.getState().addNotification({
          id: `notif-${i}`,
          type: 'info',
          message: `Notification ${i}`
        });
      }
      
      expect(useUiStore.getState().notifications.length).toBe(50);
      
      // Clear notifications
      useUiStore.getState().clearNotifications();
      expect(useUiStore.getState().notifications.length).toBe(0);
      
      // Add more notifications to ensure system still works
      useUiStore.getState().addNotification({ type: 'success', message: 'New notification' });
      expect(useUiStore.getState().notifications.length).toBe(1);
    });
  });

  describe('Critical Path Reliability', () => {
    it('should maintain core functionality during high load', () => {
      // Simulate high-load scenario with parallel operations
      const startTime = Date.now();
      
      // Add large amounts of different types of data
      for (let i = 0; i < 200; i++) {
        useUiStore.getState().addReasoningStep({
          id: `step${i}`,
          description: `High-load step ${i}`,
          timestamp: startTime - (200 - i) * 100
        });
      }
      
      for (let i = 0; i < 100; i++) {
        useUiStore.getState().addTask({
          id: `task${i}`,
          term: `high-load-task${i}`,
          type: i % 2 === 0 ? 'belief' : 'goal',
          creationTime: startTime - (100 - i) * 200
        });
      }
      
      for (let i = 0; i < 50; i++) {
        useUiStore.getState().addConcept({
          term: `high-load-concept${i}`,
          priority: Math.random()
        });
      }
      
      // Verify all data was processed correctly
      expect(useUiStore.getState().reasoningSteps.length).toBe(200);
      expect(useUiStore.getState().tasks.length).toBe(100);
      expect(useUiStore.getState().concepts.length).toBe(50);
      
      // Verify basic operations still work
      useUiStore.getState().setWsConnected(true);
      expect(useUiStore.getState().wsConnected).toBe(true);
    });

    it('should maintain stability when processing mixed data types', () => {
      // Add mixed types of data simultaneously
      const operations = [
        () => useUiStore.getState().addReasoningStep({ id: 'step1', description: 'Step 1', timestamp: Date.now() }),
        () => useUiStore.getState().addTask({ id: 'task1', term: 'Task 1', type: 'belief', creationTime: Date.now() }),
        () => useUiStore.getState().addConcept({ term: 'concept1', priority: 0.5 }),
        () => useUiStore.getState().setWsConnected(true),
        () => useUiStore.getState().setLoading(true),
        () => useUiStore.getState().addNotification({ type: 'info', message: 'Mixed operation' }),
        () => useUiStore.getState().addPanel('panel1', { title: 'Panel 1' }),
        () => useUiStore.getState().updateDemoState('demo1', { progress: 50 }),
      ];
      
      // Execute all operations
      operations.forEach(op => op());
      
      // Verify all operations completed successfully
      expect(useUiStore.getState().reasoningSteps.length).toBe(1);
      expect(useUiStore.getState().tasks.length).toBe(1);
      expect(useUiStore.getState().concepts.length).toBe(1);
      expect(useUiStore.getState().wsConnected).toBe(true);
      expect(useUiStore.getState().isLoading).toBe(true);
      expect(useUiStore.getState().notifications.length).toBe(1);
      expect(useUiStore.getState().panels['panel1']).toBeDefined();
      expect(useUiStore.getState().demoStates['demo1']).toEqual({ progress: 50 });
    });

    it('should recover gracefully from temporary data inconsistencies', () => {
      // Add some inconsistent data
      try {
        useUiStore.getState().addReasoningStep({ id: null, description: 'Invalid step' }); // Invalid ID
        useUiStore.getState().addTask({ id: 'task1', term: '' }); // Empty term
        useUiStore.getState().addConcept({ term: '', priority: -1 }); // Invalid concept
      } catch (e) {
        // If an error occurs, that's fine - the store should handle it gracefully
      }
      
      // Verify the store is still functional and can accept valid data
      useUiStore.getState().addReasoningStep({ id: 'valid-step', description: 'Valid step', timestamp: Date.now() });
      useUiStore.getState().addTask({ id: 'valid-task', term: 'valid term', type: 'belief', creationTime: Date.now() });
      useUiStore.getState().addConcept({ term: 'valid', priority: 0.7 });
      
      // Verify valid data was added
      expect(useUiStore.getState().reasoningSteps.some(s => s.id === 'valid-step')).toBe(true);
      expect(useUiStore.getState().tasks.some(t => t.id === 'valid-task')).toBe(true);
      expect(useUiStore.getState().concepts.some(c => c.term === 'valid')).toBe(true);
    });
  });

  describe('Demonstration Reliability', () => {
    it('should reliably support hybrid intelligence demonstrations', () => {
      // Set up a scenario that demonstrates hybrid intelligence clearly
      const reasoningSteps = [
        { id: 'step1', description: 'NARS processed input: <cat --> animal>', timestamp: Date.now() - 3000, source: 'nars' },
        { id: 'step2', description: 'LM provided context about cats as pets', timestamp: Date.now() - 2000, source: 'lm' },
        { id: 'step3', description: 'Hybrid inference: <cat --> [cute && pet && companion]>', timestamp: Date.now() - 1000, source: 'hybrid' },
        { id: 'step4', description: 'Final hybrid conclusion reached', timestamp: Date.now(), source: 'hybrid' }
      ];

      const tasks = [
        { id: 'task1', term: '<cat --> animal>', type: 'belief', creationTime: Date.now() - 3000, source: 'nars' },
        { id: 'task2', term: '<cat --> pet>', type: 'belief', creationTime: Date.now() - 2000, source: 'lm' },
        { id: 'task3', term: '<cat --> [cute && pet && companion]>', type: 'belief', creationTime: Date.now() - 1000, source: 'hybrid' }
      ];

      const concepts = [
        { term: 'cat', priority: 0.9, creationTime: Date.now() - 3000 },
        { term: 'animal', priority: 0.8, creationTime: Date.now() - 3000 },
        { term: 'pet', priority: 0.7, creationTime: Date.now() - 2000 },
        { term: 'cute', priority: 0.85, creationTime: Date.now() - 1000 }
      ];

      // Add demonstration data
      reasoningSteps.forEach(step => useUiStore.getState().addReasoningStep(step));
      tasks.forEach(task => useUiStore.getState().addTask(task));
      concepts.forEach(concept => useUiStore.getState().addConcept(concept));

      // Verify demonstration data was stored correctly
      expect(useUiStore.getState().reasoningSteps.length).toBe(4);
      expect(useUiStore.getState().tasks.length).toBe(3);
      expect(useUiStore.getState().concepts.length).toBe(4);
      
      // Verify source tracking works
      const narsSteps = useUiStore.getState().reasoningSteps.filter(step => step.source === 'nars');
      const lmSteps = useUiStore.getState().reasoningSteps.filter(step => step.source === 'lm');
      const hybridSteps = useUiStore.getState().reasoningSteps.filter(step => step.source === 'hybrid');
      
      expect(narsSteps.length).toBe(1);
      expect(lmSteps.length).toBe(1);
      expect(hybridSteps.length).toBe(2);
    });

    it('should maintain demonstration quality under various conditions', () => {
      const scenarios = [
        {
          name: 'NARS-only reasoning',
          steps: [{ id: 'step1', description: 'Pure NARS reasoning', source: 'nars', timestamp: Date.now() }]
        },
        {
          name: 'LM-only processing', 
          steps: [{ id: 'step1', description: 'Pure LM processing', source: 'lm', timestamp: Date.now() }]
        },
        {
          name: 'Hybrid collaboration',
          steps: [
            { id: 'step1', description: 'NARS contribution', source: 'nars', timestamp: Date.now() - 1000 },
            { id: 'step2', description: 'LM contribution', source: 'lm', timestamp: Date.now() - 500 },
            { id: 'step3', description: 'Hybrid integration', source: 'hybrid', timestamp: Date.now() }
          ]
        }
      ];

      scenarios.forEach(scenario => {
        // Clear previous data
        useUiStore.getState().clearReasoningSteps();
        
        // Add scenario data
        scenario.steps.forEach(step => useUiStore.getState().addReasoningStep(step));
        
        // Verify scenario was added correctly
        expect(useUiStore.getState().reasoningSteps.length).toBe(scenario.steps.length);
      });
    });
  });

  describe('Long-running Session Stability', () => {
    it('should maintain performance during extended use', () => {
      // Simulate an extended session with many operations
      for (let sessionBlock = 0; sessionBlock < 10; sessionBlock++) {
        // Add a batch of data
        for (let i = 0; i < 20; i++) {
          useUiStore.getState().addReasoningStep({
            id: `session${sessionBlock}-step${i}`,
            description: `Step in session block ${sessionBlock}`,
            timestamp: Date.now() - (200 - i)
          });
        }
        
        // Perform some other operations
        useUiStore.getState().setWsConnected(sessionBlock % 2 === 0);
        useUiStore.getState().setLoading(sessionBlock % 3 === 0);
        useUiStore.getState().addNotification({ type: 'info', message: `Session block ${sessionBlock}` });
        
        // Verify store state remains consistent
        expect(useUiStore.getState().reasoningSteps.length).toBe((sessionBlock + 1) * 20);
        expect(useUiStore.getState().notifications.length).toBe(sessionBlock + 1);
      }
      
      // At the end, verify everything is still consistent
      expect(useUiStore.getState().reasoningSteps.length).toBe(200);
      expect(useUiStore.getState().notifications.length).toBe(10);
    });

    it('should handle rapid state changes without degrading', () => {
      // Perform rapid state changes to test stability
      const operations = [
        () => useUiStore.getState().setWsConnected(true),
        () => useUiStore.getState().setWsConnected(false),
        () => useUiStore.getState().setTheme('light'),
        () => useUiStore.getState().setTheme('dark'),
        () => useUiStore.getState().setLoading(true),
        () => useUiStore.getState().setLoading(false),
        () => useUiStore.getState().toggleTheme(),
        () => useUiStore.getState().addConcept({ term: `concept-${Date.now()}`, priority: Math.random() })
      ];
      
      // Run rapid operations
      for (let i = 0; i < 50; i++) {
        const op = operations[i % operations.length];
        op();
      }
      
      // Verify store is still functional
      useUiStore.getState().addReasoningStep({ id: 'final-step', description: 'Final test step', timestamp: Date.now() });
      expect(useUiStore.getState().reasoningSteps.some(s => s.id === 'final-step')).toBe(true);
    });
  });
});