import {beforeEach, describe, expect, it} from 'vitest';
import useUiStore from '../stores/uiStore.js';

const resetStore = () => useUiStore.getState().resetStore();

describe('User Experience Validation Tests', () => {
  beforeEach(resetStore);

  describe('Reasoning Observability', () => {
    it('should allow users to observe reasoning steps in chronological order', () => {
      const mockReasoningSteps = [
        { id: 'step1', description: 'Belief accepted: <cat --> animal>', timestamp: Date.now() - 2000 },
        { id: 'step2', description: 'Inference generated: <cat --> mammal>', timestamp: Date.now() - 1000 },
        { id: 'step3', description: 'Goal processed: <want(cat) --> ??>', timestamp: Date.now() }
      ];

      mockReasoningSteps.forEach(step => useUiStore.getState().addReasoningStep(step));
      
      expect(useUiStore.getState().reasoningSteps.length).toBe(3);
      
      const sortedSteps = [...useUiStore.getState().reasoningSteps].sort((a, b) => a.timestamp - b.timestamp);
      expect(sortedSteps[0].description).toBe('Belief accepted: <cat --> animal>');
      expect(sortedSteps[2].description).toBe('Goal processed: <want(cat) --> ??>');
    });

    it('should maintain data integrity during filtering scenarios', () => {
      const steps = [
        { id: 'step1', description: 'Reasoning step', timestamp: Date.now() },
        { id: 'step2', description: 'Another step', timestamp: Date.now() + 1000 }
      ];
      const tasks = [
        { id: 'task1', term: 'test task', type: 'belief', creationTime: Date.now() + 2000 },
        { id: 'task2', term: 'another task', type: 'goal', creationTime: Date.now() + 3000 }
      ];

      steps.forEach(step => useUiStore.getState().addReasoningStep(step));
      tasks.forEach(task => useUiStore.getState().addTask(task));

      expect(useUiStore.getState().reasoningSteps.length).toBe(2);
      expect(useUiStore.getState().tasks.length).toBe(2);
    });

    it('should support searching for specific reasoning content', () => {
      const mockReasoningSteps = [
        { id: 'step1', description: 'Processing belief: <cat --> animal>', result: 'Accepted with confidence 0.9' },
        { id: 'step2', description: 'Deriving inference: <dog --> mammal>', result: 'Accepted with confidence 0.85' }
      ];

      mockReasoningSteps.forEach(step => useUiStore.getState().addReasoningStep(step));
      
      const searchResults = useUiStore.getState().reasoningSteps.filter(step => 
        step.description.includes('cat') || step.result.includes('0.9')
      );
      
      expect(searchResults.length).toBe(1);
      expect(searchResults[0].description).toContain('cat');
    });

    it('should provide access to detailed reasoning information', () => {
      const mockReasoningStep = {
        id: 'step1',
        description: 'Complex inference process',
        result: 'New belief formed',
        metadata: { source: 'NARS', confidence: 0.85, complexity: 'high' }
      };

      useUiStore.getState().addReasoningStep(mockReasoningStep);
      
      const state = useUiStore.getState();
      expect(state.reasoningSteps[0].id).toBe('step1');
      expect(state.reasoningSteps[0].description).toBe('Complex inference process');
      expect(state.reasoningSteps[0].result).toBe('New belief formed');
      expect(state.reasoningSteps[0].metadata.source).toBe('NARS');
      expect(state.reasoningSteps[0].metadata.confidence).toBe(0.85);
    });
  });

  describe('Task Understanding', () => {
    it('should allow users to track individual tasks through the system', () => {
      const mockTasks = [
        { id: 'task1', term: '<cat --> animal>', type: 'belief', priority: 0.8, creationTime: Date.now() },
        { id: 'task2', term: '<dog --> mammal>', type: 'goal', priority: 0.7, creationTime: Date.now() + 1000 }
      ];

      mockTasks.forEach(task => useUiStore.getState().addTask(task));
      
      const state = useUiStore.getState();
      expect(state.tasks.length).toBe(2);
      expect(state.tasks[0].id).toBe('task1');
      expect(state.tasks[0].term).toBe('<cat --> animal>');
      expect(state.tasks[0].type).toBe('belief');
      expect(state.tasks[0].priority).toBe(0.8);
    });

    it('should preserve task transformations and influences', () => {
      const mockTask = {
        id: 'task1',
        term: '<cat --> [cute]>', 
        type: 'belief',
        priority: 0.9,
        creationTime: Date.now(),
        derivations: ['task2', 'task3'],
        sources: ['input1', 'inference_result_1']
      };

      useUiStore.getState().addTask(mockTask);
      
      const state = useUiStore.getState();
      expect(state.tasks[0].derivations).toEqual(['task2', 'task3']);
      expect(state.tasks[0].sources).toEqual(['input1', 'inference_result_1']);
    });
  });

  describe('Concept Evolution Understanding', () => {
    it('should support visualization of concept connections and evolution', () => {
      const mockConcepts = [
        { term: 'cat', priority: 0.8, creationTime: Date.now() - 2000, relations: ['animal', 'pet'] },
        { term: 'animal', priority: 0.9, creationTime: Date.now() - 3000, relations: ['cat', 'dog', 'mammal'] },
        { term: 'pet', priority: 0.6, creationTime: Date.now() - 1000, relations: ['cat', 'dog'] }
      ];

      mockConcepts.forEach(concept => useUiStore.getState().addConcept(concept));
      
      const state = useUiStore.getState();
      expect(state.concepts.length).toBe(3);
      expect(state.concepts.find(c => c.term === 'cat').relations).toEqual(['animal', 'pet']);
      expect(state.concepts.find(c => c.term === 'animal').relations).toEqual(['cat', 'dog', 'mammal']);
    });

    it('should show relationships between concepts', () => {
      const mockConcept = {
        term: 'cat',
        priority: 0.8,
        creationTime: Date.now(),
        relations: [
          { term: 'animal', strength: 0.9, confidence: 0.8 },
          { term: 'pet', strength: 0.7, confidence: 0.6 }
        ]
      };

      useUiStore.getState().addConcept(mockConcept);
      
      const state = useUiStore.getState();
      const concept = state.concepts[0];
      expect(concept.term).toBe('cat');
      expect(concept.relations.length).toBe(2);
      expect(concept.relations[0].term).toBe('animal');
      expect(concept.relations[0].strength).toBe(0.9);
      expect(concept.relations[1].confidence).toBe(0.6);
    });
  });

  describe('Hybrid Intelligence Performance Insights', () => {
    it('should track metrics comparing NARS-only vs LM-assisted reasoning', () => {
      const metrics = {
        narsPerformance: { speed: 0.8, accuracy: 0.75 },
        lmAssistedPerformance: { speed: 0.9, accuracy: 0.85 },
        hybridAdvantage: 0.15
      };
      
      useUiStore.getState().updateDemoMetrics('demo1', metrics);
      
      expect(useUiStore.getState().demoMetrics['demo1']).toEqual(metrics);
      expect(useUiStore.getState().demoMetrics['demo1'].hybridAdvantage).toBe(0.15);
    });

    it('should capture moments of hybrid value addition', () => {
      const hybridValueMoment = {
        time: Date.now(),
        reason: 'Complex inference required LM assistance',
        valueAdded: 0.3
      };
      
      const demoMetrics = {
        hybridValueMoments: [hybridValueMoment]
      };
      
      useUiStore.getState().updateDemoMetrics('demo1', demoMetrics);
      
      expect(useUiStore.getState().demoMetrics['demo1'].hybridValueMoments.length).toBe(1);
      expect(useUiStore.getState().demoMetrics['demo1'].hybridValueMoments[0].reason).toBe('Complex inference required LM assistance');
    });
  });

  describe('Configuration and Control', () => {
    it('should manage different AI source configurations', () => {
      expect(typeof useUiStore.getState().addNotification).toBe('function');
      expect(typeof useUiStore.getState().setLMTestResult).toBe('function');
    });

    it('should handle connection testing feedback', () => {
      useUiStore.getState().setLMTestResult({ success: true, message: 'Connection successful', model: 'gpt-4' });
      expect(useUiStore.getState().lmTestResult.success).toBe(true);
      expect(useUiStore.getState().lmTestResult.message).toBe('Connection successful');
      
      useUiStore.getState().setLMTestResult({ success: false, message: 'Invalid API key' });
      expect(useUiStore.getState().lmTestResult.success).toBe(false);
      expect(useUiStore.getState().lmTestResult.message).toBe('Invalid API key');
    });
  });

  describe('System Transparency', () => {
    it('should show connection status clearly', () => {
      useUiStore.getState().setWsConnected(true);
      expect(useUiStore.getState().wsConnected).toBe(true);
      
      useUiStore.getState().setWsConnected(false);
      expect(useUiStore.getState().wsConnected).toBe(false);
    });

    it('should handle disconnection gracefully', () => {
      useUiStore.getState().setWsConnected(false);
      expect(useUiStore.getState().wsConnected).toBe(false);
      
      useUiStore.getState().addNotification({ type: 'warning', message: 'Connection lost' });
      expect(useUiStore.getState().notifications.length).toBe(1);
    });

    it('should provide clear error messages', () => {
      const error = { message: 'Connection failed', code: 500 };
      useUiStore.getState().setError(error);
      
      expect(useUiStore.getState().error).toEqual(error);
      expect(useUiStore.getState().error.message).toBe('Connection failed');
      expect(useUiStore.getState().error.code).toBe(500);
    });
  });

  describe('User Workflow Validation', () => {
    it('should support complete demonstration workflow', () => {
      useUiStore.getState().setWsConnected(true);
      useUiStore.getState().addReasoningStep({ id: 'step1', description: 'User input processed', timestamp: Date.now() });
      useUiStore.getState().addTask({ id: 'task1', term: '<cat --> animal>', type: 'belief', creationTime: Date.now() });
      useUiStore.getState().addConcept({ term: 'cat', priority: 0.8, creationTime: Date.now() });
      
      const state = useUiStore.getState();
      expect(state.wsConnected).toBe(true);
      expect(state.reasoningSteps.length).toBe(1);
      expect(state.tasks.length).toBe(1);
      expect(state.concepts.length).toBe(1);
      
      useUiStore.getState().clearTasks();
      expect(useUiStore.getState().tasks.length).toBe(0);
    });

    it('should provide meaningful feedback during operations', () => {
      useUiStore.getState().setLoading(true);
      expect(useUiStore.getState().isLoading).toBe(true);
      
      useUiStore.getState().addNotification({ type: 'info', message: 'Processing request' });
      expect(useUiStore.getState().notifications.length).toBe(1);
      expect(useUiStore.getState().notifications[0].message).toBe('Processing request');
    });

    it('should handle normal usage patterns', () => {
      const steps = Array.from({length: 100}, (_, i) => ({
        id: `step${i}`,
        description: `Step ${i} description`,
        timestamp: Date.now() - (100 - i) * 1000
      }));
      
      steps.forEach(step => useUiStore.getState().addReasoningStep(step));
      
      expect(useUiStore.getState().reasoningSteps.length).toBe(100);
      
      useUiStore.getState().updateReasoningStep('step0', { status: 'completed' });
      const step0 = useUiStore.getState().reasoningSteps.find(s => s.id === 'step0');
      expect(step0.status).toBe('completed');
    });
  });

  describe('User Experience Under Various Conditions', () => {
    it('should maintain responsiveness with moderate data loads', () => {
      for (let i = 0; i < 50; i++) {
        useUiStore.getState().addReasoningStep({
          id: `step${i}`,
          description: `Step ${i} description`,
          timestamp: Date.now() - (50 - i) * 1000
        });
        
        useUiStore.getState().addTask({
          id: `task${i}`,
          term: `<task${i} --> concept${i}>`,
          type: i % 2 === 0 ? 'belief' : 'goal',
          creationTime: Date.now() - (50 - i) * 1500
        });
      }
      
      expect(useUiStore.getState().reasoningSteps.length).toBe(50);
      expect(useUiStore.getState().tasks.length).toBe(50);
      
      useUiStore.getState().addConcept({ term: 'test', priority: 0.5 });
      expect(useUiStore.getState().concepts.length).toBe(1);
    });

    it('should handle concurrent data updates', () => {
      const updateFunctions = [
        () => useUiStore.getState().addReasoningStep({ id: 'step1', description: 'Concurrent step', timestamp: Date.now() }),
        () => useUiStore.getState().addTask({ id: 'task1', term: 'Concurrent task', type: 'belief', creationTime: Date.now() }),
        () => useUiStore.getState().addConcept({ term: 'concurrent', priority: 0.5 }),
        () => useUiStore.getState().setWsConnected(true),
        () => useUiStore.getState().setTheme('dark')
      ];
      
      updateFunctions.forEach(fn => fn());
      
      const state = useUiStore.getState();
      expect(state.reasoningSteps.length).toBe(1);
      expect(state.tasks.length).toBe(1);
      expect(state.concepts.length).toBe(1);
      expect(state.wsConnected).toBe(true);
      expect(state.theme).toBe('dark');
    });

    it('should support common user exploration patterns', () => {
      const reasoningSteps = Array.from({length: 20}, (_, i) => ({
        id: `step${i}`,
        description: `Reasoning step ${i}`,
        source: i % 3 === 0 ? 'nars' : i % 3 === 1 ? 'lm' : 'hybrid',
        timestamp: Date.now() - (20 - i) * 1000
      }));
      
      reasoningSteps.forEach(step => useUiStore.getState().addReasoningStep(step));
      
      const narsSteps = useUiStore.getState().reasoningSteps.filter(step => step.source === 'nars');
      const lmSteps = useUiStore.getState().reasoningSteps.filter(step => step.source === 'lm');
      const hybridSteps = useUiStore.getState().reasoningSteps.filter(step => step.source === 'hybrid');
      
      expect(narsSteps.length).toBeGreaterThan(0);
      expect(lmSteps.length).toBeGreaterThan(0);
      expect(hybridSteps.length).toBeGreaterThan(0);
      
      const recentSteps = [...useUiStore.getState().reasoningSteps]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5);
        
      expect(recentSteps.length).toBe(5);
    });
  });
});