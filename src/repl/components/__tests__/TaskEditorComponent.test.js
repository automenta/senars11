import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { TaskEditorComponent } from '../TaskEditorComponent.js';
import blessed from 'blessed';

describe('TaskEditorComponent', () => {
    let screen;
    let taskEditorComponent;
    let mockEventEmitter;

    beforeEach(() => {
        screen = blessed.screen({
            terminal: 'xterm-256color',
            autoPadding: true,
            smartCSR: true,
            fullUnicode: true,
            height: 25,
            width: 80
        });

        mockEventEmitter = {
            emit: vi.fn(),
            on: vi.fn()
        };
    });

    afterEach(() => {
        if (taskEditorComponent) {
            taskEditorComponent.destroy();
        }
        if (screen) {
            screen.destroy();
        }
    });

    test('should initialize without errors', () => {
        taskEditorComponent = new TaskEditorComponent({
            parent: screen,
            eventEmitter: mockEventEmitter
        });

        const element = taskEditorComponent.init();
        expect(element).toBeDefined();
        expect(taskEditorComponent.element).toBeDefined();
        expect(taskEditorComponent.contextMenu).toBeDefined();
    });

    test('should format tasks with priority indicators', () => {
        taskEditorComponent = new TaskEditorComponent({
            parent: screen,
            eventEmitter: mockEventEmitter
        });
        taskEditorComponent.init();

        const task = {
            id: 'test_1',
            content: 'Test task',
            priority: 0.8,
            timestamp: Date.now()
        };

        const formattedTask = taskEditorComponent._formatTaskForDisplay(task);
        expect(formattedTask).toContain('❗'); // High priority indicator for 0.8
        expect(formattedTask).toContain('Test task');
    });

    test('should calculate priority indicators correctly', () => {
        taskEditorComponent = new TaskEditorComponent({
            parent: screen,
            eventEmitter: mockEventEmitter
        });
        taskEditorComponent.init();

        expect(taskEditorComponent._getPriorityIndicator(0.9)).toContain('red');
        expect(taskEditorComponent._getPriorityIndicator(0.6)).toContain('yellow');
        expect(taskEditorComponent._getPriorityIndicator(0.1)).toContain('green');
    });

    test('should create priority bars based on priority value', () => {
        taskEditorComponent = new TaskEditorComponent({
            parent: screen,
            eventEmitter: mockEventEmitter
        });
        taskEditorComponent.init();

        const highPriorityBar = taskEditorComponent._getPriorityBar(0.9);
        expect(highPriorityBar).toContain('█'.repeat(9)); // 9 out of 10 filled

        const lowPriorityBar = taskEditorComponent._getPriorityBar(0.1);
        expect(lowPriorityBar).toContain('█'.repeat(1)); // 1 out of 10 filled
    });

    test('should add and update tasks properly', () => {
        taskEditorComponent = new TaskEditorComponent({
            parent: screen,
            eventEmitter: mockEventEmitter
        });
        taskEditorComponent.init();

        const task = {
            id: 'test_1',
            content: 'Test task',
            priority: 0.5,
            timestamp: Date.now()
        };

        taskEditorComponent.addTask(task);
        expect(taskEditorComponent.tasks).toHaveLength(1);
        expect(taskEditorComponent.tasks[0].content).toBe('Test task');

        taskEditorComponent.updateTaskStatus('test_1', { processed: true });
        expect(taskEditorComponent.tasks[0].processed).toBe(true);
    });

    test('should have context menu initialized', () => {
        taskEditorComponent = new TaskEditorComponent({
            parent: screen,
            eventEmitter: mockEventEmitter
        });
        taskEditorComponent.init();

        expect(taskEditorComponent.contextMenu).toBeDefined();
        expect(taskEditorComponent.contextMenu.element).toBeDefined();
    });
});