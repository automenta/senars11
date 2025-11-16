import {beforeEach, describe, expect, it} from 'vitest';
import useUiStore from '../stores/uiStore';

// Unit tests for Zustand store
describe('UI Store', () => {
    beforeEach(() => {
        // Using the store's reset function to ensure complete reset
        useUiStore.getState().resetStore();
    });

    describe('Initialization', () => {
        it('should initialize with default values', () => {
            const state = useUiStore.getState();
            expect(state.wsConnected).toBe(false);
            expect(state.theme).toBe('light');
            expect(state.panels).toEqual({});
            expect(state.reasoningSteps).toEqual([]);
            expect(state.tasks).toEqual([]);
            expect(state.concepts).toEqual([]);
        });
    });

    describe('WebSocket state management', () => {
        it('should update connection status', () => {
            const {setWsConnected} = useUiStore.getState();
            setWsConnected(true);

            expect(useUiStore.getState().wsConnected).toBe(true);
        });

        it('should update WebSocket service', () => {
            // Create a simple test object that mimics the WebSocket service interface
            const wsService = {
                connect: () => {
                },
                disconnect: () => {
                },
                send: () => {
                },
                readyState: 1
            };
            const {setWsService} = useUiStore.getState();
            setWsService(wsService);

            expect(useUiStore.getState().wsService).toBe(wsService);
        });
    });

    describe('Panel management', () => {
        it('should add and remove panels', () => {
            const {addPanel, removePanel} = useUiStore.getState();

            addPanel('test-panel', {title: 'Test Panel'});
            expect(useUiStore.getState().panels['test-panel']).toEqual({title: 'Test Panel'});

            removePanel('test-panel');
            expect(useUiStore.getState().panels['test-panel']).toBeUndefined();
        });

        it('should update panel configuration', () => {
            const {addPanel, updatePanel} = useUiStore.getState();

            addPanel('test-panel', {title: 'Test Panel', visible: true});
            expect(useUiStore.getState().panels['test-panel']).toEqual({title: 'Test Panel', visible: true});

            updatePanel('test-panel', {visible: false});
            expect(useUiStore.getState().panels['test-panel']).toEqual({title: 'Test Panel', visible: false});
        });
    });

    describe('Reasoning engine state', () => {
        it('should add reasoning steps', () => {
            const {addReasoningStep} = useUiStore.getState();
            const step = {id: 'step1', description: 'Test step'};

            addReasoningStep(step);
            expect(useUiStore.getState().reasoningSteps).toEqual([step]);
        });

        it('should update reasoning steps', () => {
            const {addReasoningStep, updateReasoningStep} = useUiStore.getState();
            const step = {id: 'step1', description: 'Test step', status: 'pending'};

            addReasoningStep(step);
            updateReasoningStep('step1', {status: 'completed'});

            expect(useUiStore.getState().reasoningSteps[0].status).toBe('completed');
        });

        it('should clear reasoning steps', () => {
            const {addReasoningStep, clearReasoningSteps} = useUiStore.getState();
            const step = {id: 'step1', description: 'Test step'};

            addReasoningStep(step);
            expect(useUiStore.getState().reasoningSteps.length).toBe(1);

            clearReasoningSteps();
            expect(useUiStore.getState().reasoningSteps).toEqual([]);
        });
    });

    describe('Task management', () => {
        it('should add tasks', () => {
            const {addTask} = useUiStore.getState();
            const task = {id: 'task1', term: 'test', type: 'belief'};

            addTask(task);
            expect(useUiStore.getState().tasks).toEqual([task]);
        });

        it('should update tasks', () => {
            const {addTask, updateTask} = useUiStore.getState();
            const task = {id: 'task1', term: 'test', type: 'belief', priority: 0.5};

            addTask(task);
            updateTask('task1', {priority: 0.8});

            expect(useUiStore.getState().tasks[0].priority).toBe(0.8);
        });

        it('should remove tasks', () => {
            const {addTask, removeTask} = useUiStore.getState();
            const task = {id: 'task1', term: 'test', type: 'belief'};

            addTask(task);
            expect(useUiStore.getState().tasks.length).toBe(1);

            removeTask('task1');
            expect(useUiStore.getState().tasks.length).toBe(0);
        });

        it('should clear all tasks', () => {
            const {addTask, clearTasks} = useUiStore.getState();
            const task = {id: 'task1', term: 'test', type: 'belief'};

            addTask(task);
            expect(useUiStore.getState().tasks.length).toBe(1);

            clearTasks();
            expect(useUiStore.getState().tasks).toEqual([]);
        });
    });

    describe('Concept management', () => {
        it('should add concepts', () => {
            const {addConcept} = useUiStore.getState();
            const concept = {term: 'test', priority: 0.5};

            addConcept(concept);
            expect(useUiStore.getState().concepts).toEqual([concept]);
        });

        it('should update concepts', () => {
            const {addConcept, updateConcept} = useUiStore.getState();
            const concept = {term: 'test', priority: 0.5, status: 'active'};

            addConcept(concept);
            updateConcept('test', {priority: 0.8});

            expect(useUiStore.getState().concepts[0].priority).toBe(0.8);
        });

        it('should remove concepts', () => {
            const {addConcept, removeConcept} = useUiStore.getState();
            const concept = {term: 'test', priority: 0.5};

            addConcept(concept);
            expect(useUiStore.getState().concepts.length).toBe(1);

            removeConcept('test');
            expect(useUiStore.getState().concepts.length).toBe(0);
        });

        it('should clear all concepts', () => {
            const {addConcept, clearConcepts} = useUiStore.getState();
            const concept = {term: 'test', priority: 0.5};

            addConcept(concept);
            expect(useUiStore.getState().concepts.length).toBe(1);

            clearConcepts();
            expect(useUiStore.getState().concepts).toEqual([]);
        });
    });

    describe('Demo management', () => {
        it('should set demo list', () => {
            const {setDemoList} = useUiStore.getState();
            const demos = [{id: 'demo1', name: 'Test Demo'}];

            setDemoList(demos);
            expect(useUiStore.getState().demos).toEqual(demos);
        });

        it('should update demo state', () => {
            const {updateDemoState} = useUiStore.getState();

            updateDemoState('demo1', {status: 'running', progress: 50});
            expect(useUiStore.getState().demoStates['demo1']).toEqual({status: 'running', progress: 50});
        });

        it('should update demo metrics', () => {
            const {updateDemoMetrics} = useUiStore.getState();

            updateDemoMetrics('demo1', {cpu: 50, memory: 200});
            expect(useUiStore.getState().demoMetrics['demo1']).toEqual({cpu: 50, memory: 200});
        });
    });

    describe('UI state management', () => {
        it('should toggle theme', () => {
            const {toggleTheme} = useUiStore.getState();

            toggleTheme();
            expect(useUiStore.getState().theme).toBe('dark');

            toggleTheme();
            expect(useUiStore.getState().theme).toBe('light');
        });

        it('should manage loading state', () => {
            const {setLoading} = useUiStore.getState();

            setLoading(true);
            expect(useUiStore.getState().isLoading).toBe(true);

            setLoading(false);
            expect(useUiStore.getState().isLoading).toBe(false);
        });

        it('should manage error state', () => {
            const {setError, clearError} = useUiStore.getState();
            const error = {message: 'Test error', code: 500};

            setError(error);
            expect(useUiStore.getState().error).toEqual(error);

            clearError();
            expect(useUiStore.getState().error).toBeNull();
        });
    });

    describe('Notification management', () => {
        it('should add notifications with unique IDs', () => {
            const {addNotification} = useUiStore.getState();
            const notification = {type: 'info', message: 'Test notification'};

            addNotification(notification);
            const state = useUiStore.getState();

            expect(state.notifications.length).toBe(1);
            expect(state.notifications[0].id).toBeDefined();
            expect(state.notifications[0].message).toBe('Test notification');
        });

        it('should remove notifications by ID', () => {
            const {addNotification, removeNotification} = useUiStore.getState();
            const notification = {type: 'info', message: 'Test notification'};

            addNotification(notification);
            const initialNotifications = useUiStore.getState().notifications;
            const notificationId = initialNotifications[0].id;

            removeNotification(notificationId);
            expect(useUiStore.getState().notifications.length).toBe(0);
        });

        it('should update notifications', () => {
            const {addNotification, updateNotification} = useUiStore.getState();
            const notification = {type: 'info', message: 'Test notification'};

            addNotification(notification);
            const initialNotifications = useUiStore.getState().notifications;
            const notificationId = initialNotifications[0].id;

            updateNotification(notificationId, {message: 'Updated notification'});
            const updatedNotifications = useUiStore.getState().notifications;

            expect(updatedNotifications[0].message).toBe('Updated notification');
        });

        it('should clear all notifications', () => {
            const {addNotification, clearNotifications} = useUiStore.getState();
            const notification = {type: 'info', message: 'Test notification'};

            addNotification(notification);
            expect(useUiStore.getState().notifications.length).toBe(1);

            clearNotifications();
            expect(useUiStore.getState().notifications).toEqual([]);
        });
    });

    describe('Session management', () => {
        it('should set and end sessions', () => {
            const {setActiveSession, endSession} = useUiStore.getState();
            const session = {id: 'session1', name: 'Test Session'};

            setActiveSession(session);
            expect(useUiStore.getState().activeSession).toEqual(session);

            endSession();
            expect(useUiStore.getState().activeSession).toBeNull();
        });
    });

    describe('Layout management', () => {
        it('should set and save layouts', () => {
            const {setLayout, saveLayout, loadLayout} = useUiStore.getState();
            const layout = {id: 'layout1', config: {main: 'panel'}};
            const layoutName = 'test-layout';

            setLayout(layout);
            expect(useUiStore.getState().layout).toEqual(layout);

            saveLayout(layoutName, layout);
            expect(useUiStore.getState().savedLayouts[layoutName]).toEqual(layout);

            const loadedLayout = loadLayout(layoutName);
            expect(loadedLayout).toEqual(layout);
        });
    });

    describe('Batch updates', () => {
        it('should update multiple properties at once', () => {
            const {batchUpdate} = useUiStore.getState();
            const updates = {
                theme: 'dark',
                isLoading: true,
                error: {message: 'Test error'}
            };

            batchUpdate(updates);
            const state = useUiStore.getState();

            expect(state.theme).toBe('dark');
            expect(state.isLoading).toBe(true);
            expect(state.error).toEqual({message: 'Test error'});
        });
    });

    describe('Store reset', () => {
        it('should reset all store properties to initial values', () => {
            const {addTask, setWsConnected, setTheme, addNotification, resetStore} = useUiStore.getState();

            // Modify various store properties
            addTask({id: 'task1', term: 'test'});
            setWsConnected(true);
            setTheme('dark');
            addNotification({type: 'info', message: 'Test notification'});

            // Verify properties are set
            expect(useUiStore.getState().tasks.length).toBe(1);
            expect(useUiStore.getState().wsConnected).toBe(true);
            expect(useUiStore.getState().theme).toBe('dark');
            expect(useUiStore.getState().notifications.length).toBe(1);

            // Reset the store
            resetStore();

            // Verify properties are back to initial values
            expect(useUiStore.getState().tasks).toEqual([]);
            expect(useUiStore.getState().wsConnected).toBe(false);
            expect(useUiStore.getState().theme).toBe('light');
            expect(useUiStore.getState().notifications).toEqual([]);
        });
    });
});