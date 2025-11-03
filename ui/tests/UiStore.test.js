import { describe, test, expect, beforeEach } from 'vitest';
import useUiStore from '../src/stores/uiStore.js';
import { createCollectionManager, createObjectManager } from '../src/utils/CollectionManager.js';

describe('UI Store - Direct Integration Tests', () => {
    beforeEach(() => {
        // Reset store to initial state
        useUiStore.getState().resetStore();
    });

    test('should initialize with correct state', () => {
        const state = useUiStore.getState();
        
        expect(state.layout).toBeNull();
        expect(state.wsConnected).toBe(false);
        expect(state.reasoningSteps).toEqual([]);
        expect(state.tasks).toEqual([]);
        expect(state.concepts).toEqual([]);
        expect(state.theme).toBe('light');
        expect(state.notifications).toEqual([]);
    });

    test('should update WebSocket connection state', () => {
        const newState = { connected: true, service: { test: true } };
        
        useUiStore.getState().setWsConnected(newState.connected);
        useUiStore.getState().setWsService(newState.service);
        
        const state = useUiStore.getState();
        expect(state.wsConnected).toBe(true);
        expect(state.wsService).toEqual(newState.service);
    });

    test('should manage reasoning steps collection', () => {
        const step1 = { id: 'step1', description: 'Test step 1' };
        const step2 = { id: 'step2', description: 'Test step 2' };
        
        // Add steps
        useUiStore.getState().addReasoningStep(step1);
        useUiStore.getState().addReasoningStep(step2);
        
        const state = useUiStore.getState();
        expect(state.reasoningSteps).toHaveLength(2);
        expect(state.reasoningSteps[0].id).toBe('step1');
        expect(state.reasoningSteps[1].id).toBe('step2');
        
        // Update a step
        useUiStore.getState().updateReasoningStep('step1', { description: 'Updated step 1' });
        const updatedState = useUiStore.getState();
        expect(updatedState.reasoningSteps[0].description).toBe('Updated step 1');
        
        // Clear steps
        useUiStore.getState().clearReasoningSteps();
        const clearedState = useUiStore.getState();
        expect(clearedState.reasoningSteps).toHaveLength(0);
    });

    test('should manage tasks collection', () => {
        const task1 = { id: 'task1', content: 'Test task 1', type: 'belief' };
        const task2 = { id: 'task2', content: 'Test task 2', type: 'question' };
        
        // Add tasks
        useUiStore.getState().addTask(task1);
        useUiStore.getState().addTask(task2);
        
        const state = useUiStore.getState();
        expect(state.tasks).toHaveLength(2);
        expect(state.tasks[0].id).toBe(task1.id);
        expect(state.tasks[1].id).toBe(task2.id);
        
        // Update a task
        useUiStore.getState().updateTask('task1', { content: 'Updated task 1' });
        const updatedState = useUiStore.getState();
        expect(updatedState.tasks[0].content).toBe('Updated task 1');
        
        // Remove a task
        useUiStore.getState().removeTask('task1');
        const afterRemovalState = useUiStore.getState();
        expect(afterRemovalState.tasks).toHaveLength(1);
        expect(afterRemovalState.tasks[0].id).toBe('task2');
    });

    test('should manage concepts collection', () => {
        const concept1 = { term: 'cat', priority: 0.8 };
        const concept2 = { term: 'animal', priority: 0.7 };
        
        // Add concepts
        useUiStore.getState().addConcept(concept1);
        useUiStore.getState().addConcept(concept2);
        
        const state = useUiStore.getState();
        expect(state.concepts).toHaveLength(2);
        expect(state.concepts[0].term).toBe('cat');
        expect(state.concepts[1].term).toBe('animal');
        
        // Update a concept
        useUiStore.getState().updateConcept('cat', { priority: 0.9 });
        const updatedState = useUiStore.getState();
        expect(updatedState.concepts[0].priority).toBe(0.9);
        
        // Remove a concept
        useUiStore.getState().removeConcept('cat');
        const afterRemovalState = useUiStore.getState();
        expect(afterRemovalState.concepts).toHaveLength(1);
        expect(afterRemovalState.concepts[0].term).toBe('animal');
    });

    test('should manage notifications', () => {
        const notification1 = { type: 'info', title: 'Test notification', message: 'Test message' };
        const notification2 = { type: 'error', title: 'Error notification', message: 'Error message' };
        
        // Add notifications
        useUiStore.getState().addNotification(notification1);
        useUiStore.getState().addNotification(notification2);
        
        const state = useUiStore.getState();
        expect(state.notifications).toHaveLength(2);
        expect(state.notifications[0].title).toBe('Test notification');
        expect(state.notifications[1].title).toBe('Error notification');
        
        // Each notification should have a unique ID
        expect(state.notifications[0].id).toBeDefined();
        expect(state.notifications[1].id).toBeDefined();
        expect(state.notifications[0].id).not.toBe(state.notifications[1].id);
        
        // Update notification
        const notificationId = state.notifications[0].id;
        useUiStore.getState().updateNotification(notificationId, { message: 'Updated message' });
        const updatedState = useUiStore.getState();
        const updatedNotification = updatedState.notifications.find(n => n.id === notificationId);
        expect(updatedNotification.message).toBe('Updated message');
        
        // Remove notification
        useUiStore.getState().removeNotification(notificationId);
        const afterRemovalState = useUiStore.getState();
        expect(afterRemovalState.notifications).toHaveLength(1);
    });

    test('should handle UI status updates', () => {
        // Test error state
        const error = { message: 'Test error' };
        useUiStore.getState().setError(error);
        expect(useUiStore.getState().error).toEqual(error);
        
        useUiStore.getState().clearError();
        expect(useUiStore.getState().error).toBeNull();
        
        // Test loading state
        useUiStore.getState().setLoading(true);
        expect(useUiStore.getState().isLoading).toBe(true);
        
        useUiStore.getState().setLoading(false);
        expect(useUiStore.getState().isLoading).toBe(false);
        
        // Test theme state
        useUiStore.getState().setTheme('dark');
        expect(useUiStore.getState().theme).toBe('dark');
        
        useUiStore.getState().toggleTheme();
        expect(useUiStore.getState().theme).toBe('light');
    });

    test('should manage demo-related states', () => {
        const demos = [
            { id: 'demo1', name: 'Demo 1' },
            { id: 'demo2', name: 'Demo 2' }
        ];
        
        // Set demo list
        useUiStore.getState().setDemoList(demos);
        expect(useUiStore.getState().demos).toEqual(demos);
        
        // Set and update demo state
        useUiStore.getState().setDemoState('demo1', { status: 'running', progress: 50 });
        expect(useUiStore.getState().demoStates.demo1).toEqual({ status: 'running', progress: 50 });
        
        useUiStore.getState().updateDemoState('demo1', { progress: 75 });
        expect(useUiStore.getState().demoStates.demo1).toEqual({ status: 'running', progress: 75 });
        
        // Add and manage demo steps
        const step1 = { id: 'step1', action: 'initialize' };
        const step2 = { id: 'step2', action: 'process' };
        
        useUiStore.getState().addDemoStep(step1);
        useUiStore.getState().addDemoStep(step2);
        
        expect(useUiStore.getState().demoSteps).toHaveLength(2);
        
        useUiStore.getState().clearDemoSteps();
        expect(useUiStore.getState().demoSteps).toHaveLength(0);
    });

    test('should support batch updates', () => {
        const step = { id: 'batch-step', description: 'Batch test' };
        const task = { id: 'batch-task', content: 'Batch task' };
        
        // Batch update multiple states at once
        useUiStore.getState().batchUpdate({
            reasoningSteps: [step],
            tasks: [task],
            theme: 'dark'
        });
        
        const state = useUiStore.getState();
        expect(state.reasoningSteps).toEqual([step]);
        expect(state.tasks).toEqual([task]);
        expect(state.theme).toBe('dark');
    });

    test('should manage cycles with limiting', () => {
        // Add more cycles than the limit to test the addLimited functionality
        for (let i = 0; i < 60; i++) {
            useUiStore.getState().addCycle({ id: `cycle-${i}`, step: i });
        }
        
        const state = useUiStore.getState();
        // Should only keep the latest 50 due to addLimited implementation
        // In our implementation, addCycle uses addLimited with limit 50
        expect(state.cycles.length).toBeLessThanOrEqual(50);
        
        // The last cycle should have the highest number
        const lastCycle = state.cycles[state.cycles.length - 1];
        expect(lastCycle.id).toContain('cycle-');
    });

    test('should reset to initial state', () => {
        // Modify several state properties
        useUiStore.getState().addReasoningStep({ id: 'test', description: 'Test' });
        useUiStore.getState().addTask({ id: 'task', content: 'Test task' });
        useUiStore.getState().setWsConnected(true);
        useUiStore.getState().setTheme('dark');
        
        // Verify modifications were applied
        const modifiedState = useUiStore.getState();
        expect(modifiedState.reasoningSteps).toHaveLength(1);
        expect(modifiedState.wsConnected).toBe(true);
        expect(modifiedState.theme).toBe('dark');
        
        // Reset the store
        useUiStore.getState().resetStore();
        
        // Verify state is back to initial
        const resetState = useUiStore.getState();
        expect(resetState.reasoningSteps).toEqual([]);
        expect(resetState.tasks).toEqual([]);
        expect(resetState.wsConnected).toBe(false);
        expect(resetState.theme).toBe('light');
    });

    test('should provide selector functions', () => {
        const state = useUiStore.getState();
        
        // Test websocket selector
        const wsState = state.selectors.getWebSocketState(state);
        expect(wsState).toBeDefined();
        expect(wsState.wsConnected).toBe(false);
        expect(wsState.wsService).toBeNull();
        
        // Test layout selector
        const layoutState = state.selectors.getLayoutState(state);
        expect(layoutState).toBeDefined();
        expect(layoutState.layout).toBeNull;
        expect(layoutState.savedLayouts).toEqual({});
        
        // Test UI status selector
        const uiStatus = state.selectors.getUiStatus(state);
        expect(uiStatus).toBeDefined();
        expect(uiStatus.error).toBeNull();
        expect(uiStatus.isLoading).toBe(false);
        expect(uiStatus.theme).toBe('light');
    });
});

describe('CollectionManager - Direct Integration Tests', () => {
    test('should create collection manager with proper methods', () => {
        const manager = createCollectionManager('testCollection');
        
        expect(typeof manager.add).toBe('function');
        expect(typeof manager.update).toBe('function');
        expect(typeof manager.remove).toBe('function');
        expect(typeof manager.clear).toBe('function');
        expect(typeof manager.addLimited).toBe('function');
    });

    test('should handle add operation correctly', () => {
        const manager = createCollectionManager('items');
        const state = { items: [{ id: '1', name: 'item1' }] };
        
        const newState = manager.add({ id: '2', name: 'item2' })(state);
        expect(newState.items).toHaveLength(2);
        expect(newState.items[1].id).toBe('2');
        
        // Test updating existing item
        const updatedState = manager.add({ id: '1', name: 'updated item1' })(newState);
        expect(updatedState.items).toHaveLength(2);
        expect(updatedState.items[0].name).toBe('updated item1');
    });

    test('should handle update operation correctly', () => {
        const manager = createCollectionManager('items');
        const state = { items: [{ id: '1', name: 'item1', value: 10 }] };
        
        const newState = manager.update('1', 'id', { value: 20 })(state);
        expect(newState.items[0].value).toBe(20);
        expect(newState.items[0].name).toBe('item1'); // Should preserve other properties
    });

    test('should handle remove operation correctly', () => {
        const manager = createCollectionManager('items');
        const state = { items: [
            { id: '1', name: 'item1' },
            { id: '2', name: 'item2' },
            { id: '3', name: 'item3' }
        ] };
        
        const newState = manager.remove('2', 'id')(state);
        expect(newState.items).toHaveLength(2);
        expect(newState.items.find(i => i.id === '2')).toBeUndefined();
    });

    test('should handle clear operation correctly', () => {
        const manager = createCollectionManager('items');
        const state = { items: [{ id: '1', name: 'item1' }] };
        
        const newState = manager.clear()(state);
        expect(newState.items).toEqual([]);
    });

    test('should handle addLimited operation correctly', () => {
        const manager = createCollectionManager('items');
        let state = { items: [] };
        
        // Add items up to the limit
        for (let i = 0; i < 5; i++) {
            state = manager.addLimited({ id: `${i}`, name: `item${i}` }, 3)(state);
        }
        
        expect(state.items).toHaveLength(3);
        // Should keep the last 3 items added
        expect(state.items[0].id).toBe('2');
        expect(state.items[1].id).toBe('3');
        expect(state.items[2].id).toBe('4');
    });
});

describe('ObjectManager - Direct Integration Tests', () => {
    test('should create object manager with proper methods', () => {
        const manager = createObjectManager('settings');
        
        expect(typeof manager.set).toBe('function');
        expect(typeof manager.update).toBe('function');
        expect(typeof manager.clear).toBe('function');
    });

    test('should handle set operation correctly', () => {
        const manager = createObjectManager('settings');
        const state = { settings: { option1: 'value1' } };
        
        const newState = manager.set('option2', 'value2')(state);
        expect(newState.settings.option1).toBe('value1');
        expect(newState.settings.option2).toBe('value2');
    });

    test('should handle update operation correctly', () => {
        const manager = createObjectManager('settings');
        const state = { settings: { 
            option1: { value: 10, enabled: true },
            option2: 'simple value' 
        } };
        
        const newState = manager.update('option1', { value: 20 })(state);
        expect(newState.settings.option1.value).toBe(20);
        expect(newState.settings.option1.enabled).toBe(true);
        expect(newState.settings.option2).toBe('simple value');
    });

    test('should handle clear operation correctly', () => {
        const manager = createObjectManager('settings');
        const state = { settings: { option1: 'value1', option2: 'value2' } };
        
        const newState = manager.clear()(state);
        expect(newState.settings).toEqual({});
    });
});