import { BaseComponent } from './BaseComponent.js';
import blessed from 'blessed';

/**
 * Task Editor Component - displays and manages user input tasks
 */
export class TaskEditorComponent extends BaseComponent {
    constructor(config = {}) {
        super(config);
        this.engine = config.engine;
        this.elementType = 'list';
        this.tasks = [];
        this.selectedIndex = 0;

        // Set default element config if not provided
        this.elementConfig = this.elementConfig || {
            top: '0',
            left: '0',
            width: '40%',
            height: '100%-1',
            border: { type: 'line' },
            style: {
                fg: 'white',
                bg: 'black',
                border: { fg: 'green' },
                selected: {
                    fg: 'black',
                    bg: 'lightgreen'
                }
            },
            selectedFg: 'black',
            selectedBg: 'lightgreen',
            selectedBold: true,
            items: [],
            interactive: true,
            scrollable: true,
            mouse: true,
            keys: true,
            vi: true
        };
    }

    init() {
        this.element = blessed.list(this.elementConfig);

        if (this.parent && this.element) {
            this.parent.append(this.element);
        }

        this._setupEventHandlers();
        this.isInitialized = true;
        return this.element;
    }

    _setupEventHandlers() {
        if (!this.element) return;

        const handlers = {
            'select': (item, index) => this.openContextMenu(index),
            'keypress': (ch, key) => this._handleKeyPress(ch, key)
        };

        Object.entries(handlers).forEach(([event, handler]) => {
            this.element.on(event, handler);
        });

        // Set up keyboard shortcuts
        this._setupKeyBindings();
    }

    _setupKeyBindings() {
        const shortcuts = {
            'enter': () => this.openContextMenu(this.element.selected),
            'e': () => this.editTask(this.element.selected),
            'd': () => this.deleteTask(this.element.selected),
            'p': () => this.adjustPriority(this.element.selected),
            'up': () => this.element.up(),
            'down': () => this.element.down(),
            'pageup': () => this.element.pageup(),
            'pagedown': () => this.element.pagedown()
        };

        Object.entries(shortcuts).forEach(([key, handler]) => {
            this.element.key([key], (ch, k) => {
                if (['up', 'down', 'pageup', 'pagedown'].includes(key)) {
                    handler();
                    this.selectedIndex = this.element.selected;
                } else {
                    this.selectedIndex = this.element.selected;
                    handler();
                }
            });
        });
    }

    _handleKeyPress(ch, key) {
        // Handle additional key press logic if needed
    }

    setTasks(tasks = []) {
        this.tasks = [...tasks];
        this._updateDisplay();
    }

    addTask(task) {
        this.tasks.push(task);
        this._updateDisplay();
    }

    removeTask(index) {
        if (index >= 0 && index < this.tasks.length) {
            this.tasks.splice(index, 1);
            this._updateDisplay();
        }
    }

    _updateDisplay() {
        if (!this.element) return;

        const items = this.tasks.map((task, index) => this._formatTaskForDisplay(task));
        this.element.setItems(items);
        this.render();
    }

    _formatTaskForDisplay(task) {
        const priority = task.priority || 0;
        const priorityIndicator = this._getPriorityIndicator(priority);
        const statusColor = this._getStatusColor(task);
        const timestamp = new Date(task.timestamp || Date.now()).toLocaleTimeString();

        return `{${statusColor}}${priorityIndicator} [${timestamp}] ${task.content || 'Unknown Task'}{/}`;
    }

    _getPriorityIndicator(priority) {
        const indicators = [
            { threshold: 0.8, indicator: '🔴' }, // High priority
            { threshold: 0.5, indicator: '🟡' }, // Medium priority
            { threshold: 0.2, indicator: '🟢' }, // Low priority
        ];

        const matched = indicators.find(item => priority >= item.threshold);
        return matched ? matched.indicator : '⚪'; // Very low priority
    }

    _getStatusColor(task) {
        const statusMap = {
            processed: 'green',
            error: 'red',
            pending: 'yellow'
        };

        return statusMap[Object.keys(statusMap).find(status => task[status])] || 'blue';
    }

    openContextMenu(index) {
        if (index >= 0 && index < this.tasks.length) {
            const task = this.tasks[index];
            this._showOperationMenu(task, index);
        }
    }

    _showOperationMenu(task, index) {
        const menuItems = [
            { label: 'Delete Task (D)', action: () => this.deleteTask(index) },
            { label: 'Edit Task (E)', action: () => this.editTask(index) },
            { label: 'Adjust Priority (P)', action: () => this.adjustPriority(index) },
            { label: 'Cancel', action: () => {} }
        ];

        // Emit event for menu handling
        this.emit('context-menu', { task, index, menuItems });
    }

    deleteTask(index) {
        if (index >= 0 && index < this.tasks.length) {
            const task = this.tasks[index];

            this.emit('confirm-delete', {
                task,
                index,
                onConfirm: () => {
                    this.removeTask(index);
                    this.emit('task-deleted', { task, index });
                }
            });
        }
    }

    editTask(index) {
        if (index >= 0 && index < this.tasks.length) {
            const task = this.tasks[index];

            this.emit('edit-task', {
                task,
                index,
                onConfirm: (newContent) => {
                    const oldTask = { ...this.tasks[index] };
                    this.tasks[index].content = newContent;
                    this._updateDisplay();

                    this.emit('task-edited', {
                        oldTask,
                        newTask: this.tasks[index],
                        index
                    });
                }
            });
        }
    }

    adjustPriority(index) {
        if (index >= 0 && index < this.tasks.length) {
            const task = this.tasks[index];

            this.emit('adjust-priority', {
                task,
                index,
                onConfirm: (newPriority, mode) => {
                    const oldPriority = task.priority;
                    this.tasks[index].priority = newPriority;
                    this._updateDisplay();

                    this.emit('priority-adjusted', {
                        task: this.tasks[index],
                        oldPriority,
                        newPriority,
                        mode,
                        index
                    });
                }
            });
        }
    }

    addNewTaskInput(parent) {
        const inputField = blessed.textarea({
            top: '100%-1',
            left: '0',
            width: '100%',
            height: '1',
            border: { type: 'line' },
            style: {
                fg: 'white',
                bg: 'black',
                border: { fg: 'cyan' }
            },
            inputOnFocus: true
        });

        if (parent) parent.append(inputField);

        inputField.on('submit', (inputText) => {
            this._handleNewTaskInput(inputText);
            inputField.clearValue();
        });

        inputField.key(['enter'], () => {
            const inputText = inputField.getValue();
            if (inputText.trim()) {
                this._handleNewTaskInput(inputText.trim());
                inputField.clearValue();
            }
        });

        return inputField;
    }

    _handleNewTaskInput(inputText) {
        if (inputText.trim()) {
            const newTask = {
                id: Date.now().toString(),
                content: inputText.trim(),
                priority: 0.5, // Default priority
                timestamp: Date.now(),
                processed: false,
                pending: true
            };

            this.addTask(newTask);
            this.emit('new-task', { task: newTask });
        }
    }

    updateTaskStatus(taskId, updates) {
        const index = this.tasks.findIndex(task => task.id === taskId);
        if (index !== -1) {
            this.tasks[index] = { ...this.tasks[index], ...updates };
            this._updateDisplay();
        }
    }
}