import {describe, expect, it, beforeEach} from 'vitest';
import useUiStore from '../stores/uiStore.js';

describe('Core UI Components Functionality Tests', () => {
  beforeEach(() => {
    // Reset the store to initial state before each test group
    useUiStore.getState().resetStore();
  });

  describe('Core Store Functionality', () => {
    it('should have proper initial state', () => {
      const state = useUiStore.getState();
      expect(state.wsConnected).toBe(false);
      expect(state.reasoningSteps).toEqual([]);
      expect(state.tasks).toEqual([]);
      expect(state.concepts).toEqual([]);
      expect(state.theme).toBe('light');
    });

    it('should allow updating connection status', () => {
      useUiStore.getState().setWsConnected(true);
      expect(useUiStore.getState().wsConnected).toBe(true);
      
      useUiStore.getState().setWsConnected(false);
      expect(useUiStore.getState().wsConnected).toBe(false);
    });

    it('should manage reasoning steps', () => {
      const step = { id: 'step1', description: 'Test step', timestamp: Date.now() };
      useUiStore.getState().addReasoningStep(step);
      expect(useUiStore.getState().reasoningSteps).toEqual([step]);
    });

    it('should manage tasks', () => {
      const task = { id: 'task1', term: 'test', type: 'belief' };
      useUiStore.getState().addTask(task);
      expect(useUiStore.getState().tasks).toEqual([task]);
    });

    it('should manage concepts', () => {
      const concept = { term: 'test', priority: 0.5 };
      useUiStore.getState().addConcept(concept);
      expect(useUiStore.getState().concepts).toEqual([concept]);
    });
  });

  describe('Store Actions', () => {
    it('should update reasoning steps', () => {
      const step = { id: 'step1', description: 'Test', status: 'pending' };
      useUiStore.getState().addReasoningStep(step);
      useUiStore.getState().updateReasoningStep('step1', { status: 'completed' });
      expect(useUiStore.getState().reasoningSteps[0].status).toBe('completed');
    });

    it('should update tasks', () => {
      const task = { id: 'task1', term: 'test', priority: 0.5 };
      useUiStore.getState().addTask(task);
      useUiStore.getState().updateTask('task1', { priority: 0.8 });
      expect(useUiStore.getState().tasks[0].priority).toBe(0.8);
    });

    it('should update concepts', () => {
      const concept = { term: 'test', priority: 0.5 };
      useUiStore.getState().addConcept(concept);
      useUiStore.getState().updateConcept('test', { priority: 0.8 });
      expect(useUiStore.getState().concepts[0].priority).toBe(0.8);
    });
  });

  describe('UI State Management', () => {
    it('should toggle theme', () => {
      expect(useUiStore.getState().theme).toBe('light');
      useUiStore.getState().toggleTheme();
      expect(useUiStore.getState().theme).toBe('dark');
    });

    it('should manage loading state', () => {
      useUiStore.getState().setLoading(true);
      expect(useUiStore.getState().isLoading).toBe(true);
      
      useUiStore.getState().setLoading(false);
      expect(useUiStore.getState().isLoading).toBe(false);
    });

    it('should manage error state', () => {
      const error = { message: 'Test error', code: 500 };
      useUiStore.getState().setError(error);
      expect(useUiStore.getState().error).toEqual(error);
      
      useUiStore.getState().clearError();
      expect(useUiStore.getState().error).toBeNull();
    });
  });

  describe('Notification Management', () => {
    it('should add notifications', () => {
      const notification = { type: 'info', message: 'Test notification' };
      useUiStore.getState().addNotification(notification);
      const state = useUiStore.getState();
      expect(state.notifications.length).toBe(1);
      expect(state.notifications[0].message).toBe('Test notification');
    });

    it('should clear notifications', () => {
      const notification = { type: 'info', message: 'Test notification' };
      useUiStore.getState().addNotification(notification);
      expect(useUiStore.getState().notifications.length).toBe(1);
      
      useUiStore.getState().clearNotifications();
      expect(useUiStore.getState().notifications).toEqual([]);
    });
  });

  describe('Panel Management', () => {
    it('should manage panels', () => {
      useUiStore.getState().addPanel('test-panel', { title: 'Test Panel' });
      expect(useUiStore.getState().panels['test-panel']).toEqual({ title: 'Test Panel' });
      
      useUiStore.getState().removePanel('test-panel');
      expect(useUiStore.getState().panels['test-panel']).toBeUndefined();
    });

    it('should update panel configuration', () => {
      useUiStore.getState().addPanel('test-panel', { title: 'Test Panel', visible: true });
      useUiStore.getState().updatePanel('test-panel', { visible: false });
      expect(useUiStore.getState().panels['test-panel']).toEqual({ title: 'Test Panel', visible: false });
    });
  });

  describe('Session and Layout Management', () => {
    it('should manage sessions', () => {
      const session = { id: 'session1', name: 'Test Session' };
      useUiStore.getState().setActiveSession(session);
      expect(useUiStore.getState().activeSession).toEqual(session);
      
      useUiStore.getState().endSession();
      expect(useUiStore.getState().activeSession).toBeNull();
    });

    it('should manage layouts', () => {
      const layout = { id: 'layout1', config: { main: 'panel' } };
      const layoutName = 'test-layout';
      
      useUiStore.getState().setLayout(layout);
      expect(useUiStore.getState().layout).toEqual(layout);
      
      useUiStore.getState().saveLayout(layoutName, layout);
      expect(useUiStore.getState().savedLayouts[layoutName]).toEqual(layout);
      
      const loadedLayout = useUiStore.getState().loadLayout(layoutName);
      expect(loadedLayout).toEqual(layout);
    });
  });

  describe('Demo Management', () => {
    it('should manage demo list', () => {
      const demos = [{id: 'demo1', name: 'Test Demo'}];
      useUiStore.getState().setDemoList(demos);
      expect(useUiStore.getState().demos).toEqual(demos);
    });

    it('should update demo state', () => {
      useUiStore.getState().updateDemoState('demo1', {status: 'running', progress: 50});
      expect(useUiStore.getState().demoStates['demo1']).toEqual({status: 'running', progress: 50});
    });

    it('should update demo metrics', () => {
      useUiStore.getState().updateDemoMetrics('demo1', {cpu: 50, memory: 200});
      expect(useUiStore.getState().demoMetrics['demo1']).toEqual({cpu: 50, memory: 200});
    });
  });

  describe('Batch and Reset Operations', () => {
    it('should perform batch updates', () => {
      const updates = {
        theme: 'dark',
        isLoading: true,
        error: { message: 'Test error' }
      };
      
      useUiStore.getState().batchUpdate(updates);
      const state = useUiStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.isLoading).toBe(true);
      expect(state.error).toEqual({ message: 'Test error' });
    });

    it('should reset store to initial state', () => {
      // Modify state
      useUiStore.getState().setWsConnected(true);
      useUiStore.getState().setTheme('dark');
      const testStep = { id: 'step1', description: 'Test' };
      useUiStore.getState().addReasoningStep(testStep);
      
      useUiStore.getState().resetStore();
      
      const state = useUiStore.getState();
      // Check that state is back to initial
      expect(state.wsConnected).toBe(false);
      expect(state.theme).toBe('light');
      expect(state.reasoningSteps).toEqual([]);
    });
  });

  describe('Task Management Operations', () => {
    it('should remove specific tasks', () => {
      const task1 = { id: 'task1', term: 'test1', type: 'belief' };
      const task2 = { id: 'task2', term: 'test2', type: 'goal' };
      
      useUiStore.getState().addTask(task1);
      useUiStore.getState().addTask(task2);
      expect(useUiStore.getState().tasks.length).toBe(2);
      
      useUiStore.getState().removeTask('task1');
      expect(useUiStore.getState().tasks.length).toBe(1);
      expect(useUiStore.getState().tasks[0].id).toBe('task2');
    });

    it('should clear all tasks', () => {
      const task1 = { id: 'task1', term: 'test1', type: 'belief' };
      const task2 = { id: 'task2', term: 'test2', type: 'goal' };
      
      useUiStore.getState().addTask(task1);
      useUiStore.getState().addTask(task2);
      expect(useUiStore.getState().tasks.length).toBe(2);
      
      useUiStore.getState().clearTasks();
      expect(useUiStore.getState().tasks).toEqual([]);
    });
  });

  describe('Concept Management Operations', () => {
    it('should remove specific concepts', () => {
      const concept1 = { term: 'concept1', priority: 0.5 };
      const concept2 = { term: 'concept2', priority: 0.7 };
      
      useUiStore.getState().addConcept(concept1);
      useUiStore.getState().addConcept(concept2);
      expect(useUiStore.getState().concepts.length).toBe(2);
      
      useUiStore.getState().removeConcept('concept1');
      expect(useUiStore.getState().concepts.length).toBe(1);
      expect(useUiStore.getState().concepts[0].term).toBe('concept2');
    });

    it('should clear all concepts', () => {
      const concept1 = { term: 'concept1', priority: 0.5 };
      const concept2 = { term: 'concept2', priority: 0.7 };
      
      useUiStore.getState().addConcept(concept1);
      useUiStore.getState().addConcept(concept2);
      expect(useUiStore.getState().concepts.length).toBe(2);
      
      useUiStore.getState().clearConcepts();
      expect(useUiStore.getState().concepts).toEqual([]);
    });
  });
});

describe('Critical Demonstration Workflows', () => {
  beforeEach(() => {
    // Reset the store to initial state before each test group
    useUiStore.getState().resetStore();
  });

  it('should handle end-to-end reasoning data flow', () => {
    // Add reasoning data
    const step = { id: 'step1', description: 'Initial belief accepted', timestamp: Date.now() };
    const task = { id: 'task1', term: '<cat --> animal>', type: 'belief', creationTime: Date.now() };
    const concept = { term: 'cat', priority: 0.8 };
    
    useUiStore.getState().addReasoningStep(step);
    useUiStore.getState().addTask(task);
    useUiStore.getState().addConcept(concept);
    
    // Verify data is accessible
    expect(useUiStore.getState().reasoningSteps).toEqual([step]);
    expect(useUiStore.getState().tasks).toEqual([task]);
    expect(useUiStore.getState().concepts).toEqual([concept]);
  });

  it('should maintain data consistency during updates', () => {
    // Add and update data
    const task = { id: 'task1', term: '<dog --> animal>', priority: 0.5 };
    useUiStore.getState().addTask(task);
    useUiStore.getState().updateTask('task1', { priority: 0.8, confidence: 0.9 });
    
    const updatedTask = useUiStore.getState().tasks[0];
    expect(updatedTask.priority).toBe(0.8);
    expect(updatedTask.confidence).toBe(0.9);
  });

  it('should support multiple concurrent operations', () => {
    // Simulate multiple operations happening
    const operations = [
      () => useUiStore.getState().addReasoningStep({ id: 'step1', description: 'Step 1', timestamp: Date.now() }),
      () => useUiStore.getState().addTask({ id: 'task1', term: 'Task 1', type: 'belief', creationTime: Date.now() }),
      () => useUiStore.getState().addConcept({ term: 'concept1', priority: 0.5 }),
      () => useUiStore.getState().updateReasoningStep('step1', { result: 'Success' }),
      () => useUiStore.getState().updateTask('task1', { priority: 0.7 }),
      () => useUiStore.getState().updateConcept('concept1', { priority: 0.6 }),
    ];
    
    operations.forEach(op => op());
    
    // Verify all operations completed successfully
    expect(useUiStore.getState().reasoningSteps[0].result).toBe('Success');
    expect(useUiStore.getState().tasks[0].priority).toBe(0.7);
    expect(useUiStore.getState().concepts[0].priority).toBe(0.6);
  });

  it('should handle complex reasoning trace scenarios', () => {
    // Add a series of reasoning steps to simulate a complex trace
    for (let i = 0; i < 10; i++) {
      useUiStore.getState().addReasoningStep({
        id: `step${i}`,
        description: `Reasoning step ${i}`,
        timestamp: Date.now() - (10 - i) * 1000,
        source: i % 2 === 0 ? 'nars' : 'lm'
      });
    }
    
    // Add related tasks
    for (let i = 0; i < 5; i++) {
      useUiStore.getState().addTask({
        id: `task${i}`,
        term: `<task${i} --> concept${i}>`,
        type: i % 3 === 0 ? 'belief' : i % 3 === 1 ? 'goal' : 'question',
        creationTime: Date.now() - (5 - i) * 2000,
        priority: 0.5 + (i * 0.1)
      });
    }
    
    // Verify all data was added correctly
    expect(useUiStore.getState().reasoningSteps.length).toBe(10);
    expect(useUiStore.getState().tasks.length).toBe(5);
    
    // Verify filtering would work correctly
    const narsSteps = useUiStore.getState().reasoningSteps.filter(step => step.source === 'nars');
    expect(narsSteps.length).toBe(5); // Every other step should be from NARS
    
    const goals = useUiStore.getState().tasks.filter(task => task.type === 'goal');
    expect(goals.length).toBe(2); // tasks 1 and 4 should be goals
  });
});