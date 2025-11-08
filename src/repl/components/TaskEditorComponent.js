import { BaseComponent } from './BaseComponent.js';
import { ContextMenu } from './ContextMenu.js';
import blessed from 'blessed';

/**
 * Task Editor Component - displays and manages user input tasks
 */
export class TaskEditorComponent extends BaseComponent {
    constructor(config = {}) {
        super(config);
        const { engine } = config;
        this.engine = engine;
        this.elementType = 'list';
        this.tasks = [];
        this.selectedIndex = 0;
        this.contextMenu = null;
        this.selectedIndices = [];
        this.lastSelectedIndex = -1;
        this.expandedGroups = new Set();
        this.allGroupsExpanded = false;

        this.elementConfig = this.elementConfig ?? this._getDefaultElementConfig();
    }

    _getDefaultElementConfig() {
        return {
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

        this.parent?.append?.(this.element);

        this.contextMenu = new ContextMenu({
            parent: this.parent,
            eventEmitter: this.eventEmitter
        });
        this.contextMenu.init();

        this._setupEventHandlers();
        this.isInitialized = true;
        return this.element;
    }

    // Event handling methods
    _setupEventHandlers() {
        if (!this.element) return;

        const handlers = {
            'select': (item, index) => this.openContextMenu(index),
            'keypress': (ch, key) => this._handleKeyPress(ch, key),
            'mousedown': (data) => this._handleMouseClick(data)
        };

        Object.entries(handlers).forEach(([event, handler]) => {
            this.element.on(event, handler);
        });

        this._setupKeyBindings();
    }

    _setupKeyBindings() {
        const shortcuts = this._getKeyboardShortcuts();
        const navigationKeys = new Set(['up', 'down', 'pageup', 'pagedown']);

        Object.entries(shortcuts).forEach(([key, handler]) => {
            this.element.key([key], (ch, k) => {
                handler();
                if (navigationKeys.has(key)) {
                    this.selectedIndex = this.element.selected;
                } else {
                    this.selectedIndex = this.element.selected;
                }
            });
        });
    }

    _getKeyboardShortcuts() {
        const selectedIndex = () => this.element.selected;
        return {
            'enter': () => this.openContextMenu(selectedIndex()),
            'e': () => this.editTask(selectedIndex()),
            'E': () => this.editTask(selectedIndex()),
            'd': () => this.deleteTask(selectedIndex()),
            'D': () => this.deleteTask(selectedIndex()),
            'delete': () => this.deleteTask(selectedIndex()),
            'p': () => this.adjustPriority(selectedIndex()),
            'P': () => this.adjustPriority(selectedIndex()),
            'g': () => this._showGroupingMenu(),
            'G': () => this._cycleGroupingModes(),
            'C-g': () => this.cycleGroupingCriteria(),
            'C-t': () => this.setGroupingCriteria('time-daily'),
            'C-r': () => this.setGroupingCriteria('relationships'),
            'C-s': () => this.setGroupingCriteria('similarity-content'),
            'C-p': () => this.setGroupingCriteria('priority'),
            'C-e': () => this.expandAllGroups(),
            'C-h': () => this.collapseAllGroups(),
            'C-a': () => this._selectAllTasks(),
            'C-u': () => this._clearSelection(),
            'C-d': () => this._duplicateTask(selectedIndex()),
            's': () => this._toggleSelection(selectedIndex()),
            'S': () => this._toggleSelection(selectedIndex()),
            'u': () => this._clearSelection(),
            'up': () => this.element.up(),
            'down': () => this.element.down(),
            'pageup': () => this.element.pageup(),
            'pagedown': () => this.element.pagedown(),
            'home': () => this.element.setScroll(0),
            'end': () => this.element.setScrollPerc(100),
            'f': () => this._showFilterMenu(),
            'F': () => this._showSearchDialog(),
            'x': () => this._executeSelectedTask(),
            'X': () => this._executeAllSelectedTasks(),
            'c': () => this._copyTaskContent(selectedIndex()),
            'C': () => this._copyTaskContent(selectedIndex()),
            'v': () => this._pasteTaskContent(),
            'V': () => this._pasteTaskContent()
        };
    }

    _handleKeyPress(ch, key) {
        if (key.name === 'up' || key.name === 'down') {
            this.lastSelectedIndex = this.element.selected;
        }
    }

    _handleMouseClick(data) {
        if (this.enableGrouping && this.currentGrouping) {
            this._handleGroupingClick(data);
        } else {
            const clickedIndex = this._getIndexFromPosition(data.y);
            if (clickedIndex === -1) return;

            if (data.ctrl) {
                this._toggleSelection(clickedIndex);
            } else if (data.shift && this.lastSelectedIndex !== -1) {
                this._selectRange(this.lastSelectedIndex, clickedIndex);
            } else {
                this._selectSingle(clickedIndex);
            }

            this.lastSelectedIndex = clickedIndex;
        }
    }

    _handleGroupingClick(data) {
        const clickedIndex = this._getIndexFromPosition(data.y);
        if (clickedIndex === -1) return;
    }

    _getIndexFromPosition(y) {
        if (!this.element) return -1;
        const scroll = this.element.getScroll || 0;
        return Math.min(this.tasks.length - 1, Math.max(0, y - 1 + scroll));
    }

    // Selection methods
    _selectSingle(index) {
        this.selectedIndices = [index];
        this.lastSelectedIndex = index;
    }

    _selectRange(startIndex, endIndex) {
        const minIndex = Math.min(startIndex, endIndex);
        const maxIndex = Math.max(startIndex, endIndex);

        this.selectedIndices = [];
        for (let i = minIndex; i <= maxIndex; i++) {
            this.selectedIndices.push(i);
        }
        this._updateDisplay();
    }

    _toggleSelection(index) {
        if (this.selectedIndices.includes(index)) {
            this.selectedIndices = this.selectedIndices.filter(i => i !== index);
        } else {
            this.selectedIndices.push(index);
        }
        this._updateDisplay();
    }

    _selectAllTasks() {
        this.selectedIndices = Array.from({ length: this.tasks.length }, (_, i) => i);
        this._updateDisplay();
        this.emit('tasks-selected', { count: this.selectedIndices.length, indices: this.selectedIndices });
    }

    _clearSelection() {
        this.selectedIndices = [];
        this._updateDisplay();
    }

    getSelectedTasks() {
        return this.selectedIndices.map(index => ({
            index,
            task: this.tasks[index]
        })).filter(item => item.task !== undefined);
    }

    getSelectedIndices() {
        return [...this.selectedIndices];
    }

    // Task management methods
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

    // Priority and state animation methods
    /**
     * Animate task state transitions using visual feedback
     */
    animateTaskStateChange(taskId, newState, duration = 300) {
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        if (taskIndex === -1) return;

        // Flash the task to indicate state change
        this.addVisualFeedback(null, {
            animate: true,
            color: this._getStateChangeColor(newState),
            flashDuration: duration,
            callback: () => {
                // Update the display after animation
                this._updateDisplay();
            }
        });
    }

    /**
     * Determine color based on state change
     */
    _getStateChangeColor(newState) {
        const stateColors = {
            processed: 'green',
            error: 'red',
            pending: 'yellow',
            running: 'cyan'
        };

        return stateColors[newState] || 'white'; // Default color
    }

    /**
     * Add a sliding animation when adding tasks
     */
    addTaskWithAnimation(task) {
        // Add visual feedback when adding task
        const originalSetItems = this.element.setItems;

        // Temporarily override setItems to add animation
        this.element.setItems = (items) => {
            // Add the new task to our local list
            this.tasks.push(task);
            this._updateDisplay();

            // After updating display, restore original function
            this.element.setItems = originalSetItems;
        };

        // Trigger update with animation
        this.addVisualFeedback(null, {
            animate: true,
            color: 'cyan',
            flashDuration: 150
        });
    }

    /**
     * Smoothly update task status with animation
     */
    updateTaskStatusWithAnimation(taskId, updates) {
        const index = this.tasks.findIndex(task => task.id === taskId);
        if (index !== -1) {
            // Store old status for animation comparison
            const oldTask = { ...this.tasks[index] };
            this.tasks[index] = { ...this.tasks[index], ...updates };

            // Animate the change
            this.animateTaskStateChange(taskId, updates.status || 'updated');
        }
    }

    updateTaskStatus(taskId, updates) {
        this.updateTaskStatusWithAnimation(taskId, updates);
    }

    // Display and formatting methods
    _updateDisplay() {
        if (!this.element) return;

        const items = this.enableGrouping && this.currentGrouping
            ? this._getGroupedDisplayItems()
            : this._getUngroupedDisplayItems();

        this.element.setItems(items);
        this.render();
    }

    _getUngroupedDisplayItems() {
        return this.tasks.map((task, index) => {
            const isSelected = this.selectedIndices.includes(index);
            const formattedTask = this._formatTaskForDisplay(task);
            return isSelected ? `✓ ${formattedTask}` : `  ${formattedTask}`;
        });
    }

    _getGroupedDisplayItems() {
        const grouped = this.groupTasksBy(this.currentGrouping);
        const items = [];

        for (const [groupKey, groupTasks] of Object.entries(grouped)) {
            const isExpanded = this.allGroupsExpanded || this.expandedGroups.has(groupKey);
            const expansionIndicator = isExpanded ? '▼' : '►';

            items.push(`{bold}${expansionIndicator} ${groupKey} (${groupTasks.length} tasks){/bold}`);

            if (isExpanded) {
                for (const task of groupTasks) {
                    const taskIndex = this.tasks.findIndex(t => t.id === task.id);
                    const isSelected = taskIndex !== -1 && this.selectedIndices.includes(taskIndex);
                    const formattedTask = this._formatTaskForDisplay(task);
                    items.push(isSelected ? `  ✓ ${formattedTask}` : `    ${formattedTask}`);
                }
            }

            items.push('');
        }

        return items;
    }

    _formatTaskForDisplay(task) {
        const priority = task.priority ?? 0;
        const priorityIndicator = this._getPriorityIndicator(priority);
        const priorityBar = this._getPriorityBarStyle(priority, 'gradient'); // Use gradient style by default
        const statusColor = this._getStatusColor(task);
        const priorityBgColor = this._getPriorityBgColor(priority);
        const timestamp = new Date(task.timestamp ?? Date.now()).toLocaleTimeString();
        const content = task.content ?? 'Unknown Task';
        const relationshipIndicator = this._getRelationshipIndicator(task);

        return `{${priorityBgColor}}{${statusColor}}${priorityIndicator} ${priorityBar} ${relationshipIndicator} [${timestamp}] ${content}{/}{/}`;
    }

    // Priority display methods
    /**
     * Allow users to toggle between different priority bar styles
     */
    _getPriorityBarStyle(priority, style = 'gradient') {
        switch (style) {
            case 'gradient':
                return this._getGradientPriorityBar(priority);
            case 'standard':
                return this._getPriorityBar(priority);
            default:
                return this._getPriorityBar(priority);
        }
    }

    /**
     * Get gradient color based on priority value
     * Creates a smooth gradient from red (high priority) to green (low priority)
     */
    _getPriorityGradientColor(priority) {
        const priorityColors = [
            { threshold: 0.9, color: 'red' },
            { threshold: 0.7, color: 'lightred' },
            { threshold: 0.5, color: 'yellow' },
            { threshold: 0.3, color: 'lightyellow' },
            { threshold: 0.1, color: 'green' }
        ];

        const matched = priorityColors.find(({ threshold }) => priority >= threshold);
        return matched?.color || 'lightgreen'; // Default to lightgreen for lowest priority
    }

    _getPriorityBar(priority) {
        const barWidth = 10;
        const filledChars = Math.floor(priority * barWidth);
        const emptyChars = barWidth - filledChars;

        const filledBar = '█'.repeat(filledChars);
        const emptyBar = '░'.repeat(emptyChars);

        // Create gradient color scheme based on priority
        const gradientColor = this._getPriorityGradientColor(priority);

        return `{${gradientColor}}[${filledBar}${emptyBar}]{/}`;
    }

    /**
     * Generate a gradient bar using multiple colors to show the full spectrum
     */
    _getGradientPriorityBar(priority) {
        const barWidth = 10;
        const filledChars = Math.floor(priority * barWidth);

        // Build gradient by combining multiple colors
        let gradientBar = '';
        for (let i = 0; i < barWidth; i++) {
            const position = i / barWidth;
            const intensity = 1 - position; // Higher priority areas get different colors

            let color;
            if (position < 0.3) {
                color = 'red';
            } else if (position < 0.5) {
                color = 'lightred';
            } else if (position < 0.7) {
                color = 'yellow';
            } else if (position < 0.85) {
                color = 'lightyellow';
            } else {
                color = 'green';
            }

            if (i < filledChars) {
                gradientBar += `{${color}}█{/}`;
            } else {
                gradientBar += '{gray}░{/}';
            }
        }

        return `[${gradientBar}]`;
    }

    _getPriorityIndicator(priority) {
        // Use the gradient color function for a smooth transition
        const color = this._getPriorityGradientColor(priority);

        const priorityIndicators = [
            { threshold: 0.9, indicator: '🔴' },
            { threshold: 0.7, indicator: '❗' },
            { threshold: 0.5, indicator: '🟡' },
            { threshold: 0.3, indicator: '🔸' },
            { threshold: 0.1, indicator: '🟢' }
        ];

        const matched = priorityIndicators.find(({ threshold }) => priority >= threshold);
        const indicator = matched?.indicator ?? '⚪';

        return `{${color}}${indicator}{/}`;
    }

    /**
     * Get background color based on task priority to simulate gradient effect
     */
    _getPriorityBgColor(priority) {
        const priorityBgColors = [
            { threshold: 0.9, color: 'bg-red' },
            { threshold: 0.7, color: 'bg-lightred' },
            { threshold: 0.5, color: 'bg-yellow' },
            { threshold: 0.3, color: 'bg-lightyellow' },
            { threshold: 0.1, color: 'bg-green' }
        ];

        const matched = priorityBgColors.find(({ threshold }) => priority >= threshold);
        return matched?.color || 'bg-black'; // Default to black for minimal priority
    }

    _getRelationshipIndicator(task) {
        const hasDependencies = task.originalTaskId || (this.engine?.inputManager?.getTaskDependencies &&
            this.engine.inputManager.getTaskDependencies(task.id)?.length > 0);
        const hasDerived = task.derivedTasks?.length > 0;

        if (hasDependencies && hasDerived) return '🔗';
        if (hasDependencies) return '⬇️';
        if (hasDerived) return '⬆️';
        return '🔹';
    }

    _getStatusColor(task) {
        const statusPriority = ['error', 'success', 'running', 'pending', 'queued', 'processed'];
        const statusColors = {
            processed: 'green',
            error: 'red',
            pending: 'yellow',
            success: 'green',
            running: 'blue',
            queued: 'cyan'
        };

        // Check status in priority order
        for (const status of statusPriority) {
            if (task[status]) return statusColors[status];
        }
        return 'blue'; // Default color for normal tasks
    }

    // Grouping management methods
    groupTasksBy(criteria = 'priority') {
        const groupingFunction = this._getGroupingFunction(criteria);
        const grouped = {};

        for (const task of this.tasks) {
            const groupKey = groupingFunction(task);
            if (!grouped[groupKey]) {
                grouped[groupKey] = [];
            }
            grouped[groupKey].push(task);
        }

        return grouped;
    }

    _getGroupingFunction(criteria) {
        const groupingFunctions = {
            priority: (task) => {
                const priorityRange = Math.floor(task.priority * 10) / 10;
                return `Priority: ${priorityRange.toFixed(1)}`;
            },
            time: (task) => `Date: ${new Date(task.timestamp).toDateString()}`,
            'time-hourly': (task) => {
                const date = new Date(task.timestamp);
                return `Hour: ${date.getHours()}:00`;
            },
            'time-daily': (task) => `Date: ${new Date(task.timestamp).toDateString()}`,
            'time-weekly': (task) => {
                const date = new Date(task.timestamp);
                const startOfWeek = new Date(date);
                startOfWeek.setDate(date.getDate() - date.getDay());
                return `Week of: ${startOfWeek.toDateString()}`;
            },
            'time-monthly': (task) => {
                const date = new Date(task.timestamp);
                return `Month: ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            },
            status: (task) => `Status: ${this._getTaskStatus(task)}`,
            derived: (task) => task.originalTaskId ? 'Derived Tasks' : 'Original Tasks',
            similarity: (task) => {
                const firstWord = task.content?.split(' ')[0] ?? 'Other';
                return `Category: ${firstWord}`;
            },
            // Enhanced similarity-based grouping
            'similarity-content': (task) => {
                if (!task.content) return 'No Content';

                // Extract key terms and create category
                const content = task.content.toLowerCase();
                const keyTerms = content.match(/\b\w{4,}\b/g) || [];

                // Create groups based on common terms
                if (keyTerms.length > 0) {
                    // Use the most significant term as the group identifier
                    const significantTerm = keyTerms.sort((a, b) => b.length - a.length)[0];
                    return `Topic: ${significantTerm}`;
                }

                return 'Other Content';
            },
            'similarity-keywords': (task) => {
                if (!task.content) return 'No Content';

                // Define common keywords to group by
                const keywords = ['think', 'consider', 'analyze', 'compute', 'process', 'remember', 'believe', 'wonder', 'question', 'answer', 'plan', 'execute', 'create', 'find', 'solve'];

                for (const keyword of keywords) {
                    if (task.content.toLowerCase().includes(keyword)) {
                        return `Action: ${keyword}`;
                    }
                }

                return 'Other Actions';
            },
            'similarity-terms': (task) => {
                if (!task.content) return 'No Content';

                // For NARS-like content, group by terms
                const termRegex = /<([^>]+)>|([^<>\s]+)/g;
                const matches = [...task.content.matchAll(termRegex)];

                if (matches.length > 0) {
                    // Group by the first significant term
                    const firstTerm = matches[0][1] || matches[0][0];
                    return `Term: ${firstTerm.substring(0, 20)}...`;
                }

                return 'Other Terms';
            },
            relationships: (task) => {
                // Enhanced relationship-based grouping with more detailed categorization
                const hasDependencies = task.originalTaskId || (this.engine?.inputManager?.getTaskDependencies &&
                    this.engine.inputManager.getTaskDependencies(task.id)?.length > 0);
                const hasDerived = task.derivedTasks?.length > 0;
                const parentTaskId = task.originalTaskId;

                if (hasDependencies && hasDerived) {
                    return 'Complex Relationships';
                } else if (hasDependencies) {
                    return 'Dependent Tasks';
                } else if (hasDerived) {
                    return 'Parent Tasks';
                } else {
                    return 'Standalone Tasks';
                }
            },
            // New relationship-based grouping with more granular control
            'task-relationships': (task) => {
                if (!this.engine?.inputManager) return 'No Relations';

                const dependencies = this.engine.inputManager.getTaskDependencies?.(task.id) || [];
                const parentTask = dependencies.length > 0 ? dependencies[0] : null;

                if (parentTask) {
                    // Group by original input that spawned this task
                    return `From: ${parentTask.content?.substring(0, 30) || 'Original Input'}...`;
                }

                return 'Original Input';
            },
            'derivation-path': (task) => {
                if (!this.engine?.inputManager) return 'No Path';

                const path = this.engine.inputManager.getDerivationPath?.(task.id) || [];
                if (path.length > 0) {
                    return `Derivation Level: ${path.length}`;
                }
                return 'Input Level';
            },
            // Group by NARS inference type if available
            'inference-type': (task) => {
                // If task has specific NARS inference type metadata, group by it
                if (task.inferenceType) {
                    return `Inference: ${task.inferenceType}`;
                } else if (task.content?.includes('?')) {
                    return 'Questions';
                } else {
                    return 'Statements';
                }
            }
        };

        return groupingFunctions[criteria] ?? (() => 'All');
    }

    _getTaskStatus(task) {
        return task.processed ? 'Processed' :
               task.pending ? 'Pending' :
               task.error ? 'Error' : 'Unknown';
    }

    setCurrentGrouping(criteria) {
        this.currentGrouping = criteria;
        this.enableGrouping = true;
        this._updateDisplay();
    }

    getCurrentGrouping() {
        return this.currentGrouping || 'priority';
    }

    _cycleGroupingModes() {
        const groupingModes = ['priority', 'time', 'status', 'derived', 'similarity', 'relationships'];
        const currentIndex = groupingModes.indexOf(this.currentGrouping || 'priority');
        const nextIndex = (currentIndex + 1) % groupingModes.length;
        this.setCurrentGrouping(groupingModes[nextIndex]);

        this.emit('grouping-mode-changed', {
            mode: groupingModes[nextIndex],
            totalModes: groupingModes.length
        });
    }

    _showGroupingMenu() {
        const groupingOptions = [
            { label: 'Group by Priority', action: () => this.setCurrentGrouping('priority') },
            { label: 'Group by Time (Daily)', action: () => this.setCurrentGrouping('time-daily') },
            { label: 'Group by Time (Hourly)', action: () => this.setCurrentGrouping('time-hourly') },
            { label: 'Group by Time (Weekly)', action: () => this.setCurrentGrouping('time-weekly') },
            { label: 'Group by Time (Monthly)', action: () => this.setCurrentGrouping('time-monthly') },
            { label: 'Group by Status', action: () => this.setCurrentGrouping('status') },
            { label: 'Group by Derivations', action: () => this.setCurrentGrouping('derived') },
            { label: 'Group by Content Similarity', action: () => this.setCurrentGrouping('similarity-content') },
            { label: 'Group by Keywords', action: () => this.setCurrentGrouping('similarity-keywords') },
            { label: 'Group by Terms', action: () => this.setCurrentGrouping('similarity-terms') },
            { label: 'Group by Relationships (Basic)', action: () => this.setCurrentGrouping('relationships') },
            { label: 'Group by Task Relations', action: () => this.setCurrentGrouping('task-relationships') },
            { label: 'Group by Derivation Path', action: () => this.setCurrentGrouping('derivation-path') },
            { label: 'Group by Inference Type', action: () => this.setCurrentGrouping('inference-type') },
            { label: 'Ungroup', action: () => this._disableGrouping() },
            { label: 'Cancel', action: () => {} }
        ];

        const position = { top: 5, left: 5 };
        this.contextMenu.show(position, groupingOptions);
    }

    _disableGrouping() {
        this.enableGrouping = false;
        this._updateDisplay();
        this.emit('grouping-mode-changed', { mode: 'none', totalModes: 0 });
    }

    /**
     * Interactive grouping controls to switch between different grouping criteria
     */
    cycleGroupingCriteria() {
        const allCriteria = [
            'priority', 'time-daily', 'time-hourly', 'time-weekly', 'time-monthly',
            'status', 'derived', 'similarity-content', 'similarity-keywords', 'similarity-terms',
            'relationships', 'task-relationships', 'derivation-path', 'inference-type'
        ];

        const currentIndex = allCriteria.indexOf(this.currentGrouping);
        const nextIndex = (currentIndex + 1) % allCriteria.length;
        const nextCriteria = allCriteria[nextIndex];

        this.setCurrentGrouping(nextCriteria);

        this.emit('grouping-cycled', {
            from: this.currentGrouping,
            to: nextCriteria,
            currentIndex: nextIndex,
            totalOptions: allCriteria.length
        });

        return nextCriteria;
    }

    /**
     * Set grouping criteria with validation
     */
    setGroupingCriteria(criteria) {
        const validCriteria = [
            'priority', 'time', 'time-daily', 'time-hourly', 'time-weekly', 'time-monthly',
            'status', 'derived', 'similarity', 'similarity-content', 'similarity-keywords', 'similarity-terms',
            'relationships', 'task-relationships', 'derivation-path', 'inference-type'
        ];

        if (validCriteria.includes(criteria)) {
            this.setCurrentGrouping(criteria);
            return true;
        }
        return false;
    }

    /**
     * Get current grouping criteria name for display
     */
    getCurrentGroupingLabel() {
        const labels = {
            'priority': 'Priority-based',
            'time-daily': 'Time (Daily)',
            'time-hourly': 'Time (Hourly)',
            'time-weekly': 'Time (Weekly)',
            'time-monthly': 'Time (Monthly)',
            'status': 'Status-based',
            'derived': 'Derivation-based',
            'similarity-content': 'Similarity (Content)',
            'similarity-keywords': 'Similarity (Keywords)',
            'similarity-terms': 'Similarity (Terms)',
            'relationships': 'Relationship-based',
            'task-relationships': 'Task Relations',
            'derivation-path': 'Derivation Path',
            'inference-type': 'Inference Type'
        };

        return labels[this.currentGrouping] || this.currentGrouping;
    }

    /**
     * Get all available grouping criteria
     */
    getAvailableGroupingCriteria() {
        return [
            { id: 'priority', label: 'Priority' },
            { id: 'time-daily', label: 'Time (Daily)' },
            { id: 'time-hourly', label: 'Time (Hourly)' },
            { id: 'time-weekly', label: 'Time (Weekly)' },
            { id: 'time-monthly', label: 'Time (Monthly)' },
            { id: 'status', label: 'Status' },
            { id: 'derived', label: 'Derivations' },
            { id: 'similarity-content', label: 'Content Similarity' },
            { id: 'similarity-keywords', label: 'Keyword Similarity' },
            { id: 'similarity-terms', label: 'Term Similarity' },
            { id: 'relationships', label: 'Relationships' },
            { id: 'task-relationships', label: 'Task Relations' },
            { id: 'derivation-path', label: 'Derivation Path' },
            { id: 'inference-type', label: 'Inference Type' }
        ];
    }

    // Group expansion methods
    expandAllGroups() {
        this.allGroupsExpanded = true;
        this.expandedGroups.clear();
        this._updateDisplay();
        this.emit('groups-expanded', { count: this.tasks.length });
    }

    collapseAllGroups() {
        this.allGroupsExpanded = false;
        this.expandedGroups.clear();
        this._updateDisplay();
        this.emit('groups-collapsed', { count: this.tasks.length });
    }

    toggleGroup(groupKey) {
        if (this.expandedGroups.has(groupKey)) {
            this.expandedGroups.delete(groupKey);
        } else {
            this.expandedGroups.add(groupKey);
        }
        this._updateDisplay();
        this.emit('group-toggled', { group: groupKey, isExpanded: this.expandedGroups.has(groupKey) });
    }

    // Context menu and task operation methods
    openContextMenu(index) {
        if (index >= 0 && index < this.tasks.length) {
            const task = this.tasks[index];
            this._showOperationMenu(task, index);
        }
    }

    _showOperationMenu(task, index) {
        // Add visual feedback when opening context menu
        this.addVisualFeedback(null, {
            animate: true,
            color: 'cyan',
            flashDuration: 100,
            callback: () => {
                const menuItems = [
                    { label: '🗑️ Delete Task', action: () => this.deleteTask(index) },
                    { label: '✏️ Edit Task', action: () => this.editTask(index) },
                    {
                        label: '⚖️ Adjust Priority',
                        action: () => this._showPriorityMenu(task, index)
                    },
                    { label: '📋 Duplicate Task', action: () => this._duplicateTask(index) },
                    { label: 'Cancel', action: () => {} }
                ];

                const position = this._calculateMenuPosition(index);
                this.contextMenu.show(position, menuItems);
            }
        });
    }

    _calculateMenuPosition(index) {
        if (!this.element) return { top: 0, left: 0 };

        const itemHeight = 1;
        const topOffset = this.element.ibottom + (index * itemHeight);
        const leftOffset = this.element.ileft;

        return {
            top: Math.min(topOffset, this.parent.height - 10),
            left: Math.min(leftOffset, this.parent.width - 20)
        };
    }

    _showPriorityMenu(task, index) {
        const priorityMenuItems = [
            { label: 'Priority: Direct Only', action: () => this._adjustPriorityWithMode(task, index, 'direct') },
            { label: 'Priority: Cascade to Derived Tasks', action: () => this._adjustPriorityWithMode(task, index, 'cascade') },
            { label: 'Priority: Custom Override', action: () => this._adjustPriorityWithMode(task, index, 'custom') },
            { label: 'Cancel', action: () => {} }
        ];

        const position = this._calculateMenuPosition(index);
        this.contextMenu.show(position, priorityMenuItems);
    }

    _adjustPriorityWithMode(task, index, mode) {
        this.emit('adjust-priority', {
            task,
            index,
            mode,
            onConfirm: (newPriority) => {
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

    deleteTask(index) {
        if (index >= 0 && index < this.tasks.length) {
            const task = this.tasks[index];

            this.emit('confirm-delete', {
                task,
                index,
                onConfirm: () => {
                    // Add visual feedback for deletion
                    this.addVisualFeedback(null, {
                        animate: true,
                        color: 'red',
                        flashDuration: 150,
                        callback: () => {
                            this.removeTask(index);
                            this.emit('task-deleted', { task, index });
                            this.engine?.components?.logViewer?.addInfo(`🗑️ Task deleted: ${task.content.substring(0, 50)}${task.content.length > 50 ? '...' : ''}`);
                        }
                    });
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
                    // Add visual feedback for edit
                    this.addVisualFeedback(null, {
                        animate: true,
                        color: 'yellow',
                        flashDuration: 150,
                        callback: () => {
                            const oldTask = { ...this.tasks[index] };
                            this.tasks[index].content = newContent;
                            this._updateDisplay();

                            this.emit('task-edited', {
                                oldTask,
                                newTask: this.tasks[index],
                                index
                            });

                            this.engine?.components?.logViewer?.addInfo(`✏️ Task edited: ${oldTask.content.substring(0, 30)}... → ${newContent.substring(0, 30)}...`);
                        }
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

    // Additional operation methods
    _duplicateTask(index) {
        if (index >= 0 && index < this.tasks.length) {
            const originalTask = this.tasks[index];
            const duplicatedTask = {
                ...originalTask,
                id: Date.now().toString() + Math.random().toString(),
                timestamp: Date.now(),
                metadata: {
                    ...originalTask.metadata,
                    duplicatedFrom: originalTask.id,
                    duplicatedAt: Date.now()
                }
            };

            this.tasks.push(duplicatedTask);
            this._updateDisplay();

            this.emit('task-duplicated', {
                originalTask,
                duplicatedTask
            });

            this.engine?.components?.logViewer?.addInfo(`📋 Duplicated task: ${originalTask.content}`);
        }
    }

    _executeSelectedTask() {
        const selected = this.getSelectedTasks();
        if (selected.length > 0) {
            const task = selected[0].task;
            this.emit('execute-task', { task });
            this.engine?.components?.logViewer?.addInfo(`🏃 Executing task: ${task.content}`);
        }
    }

    _executeAllSelectedTasks() {
        const selected = this.getSelectedTasks();
        if (selected.length > 0) {
            selected.forEach((item, idx) => {
                setTimeout(() => this.emit('execute-task', { task: item.task }), idx * 100);
            });
            this.engine?.components?.logViewer?.addInfo(`🏃 Executing ${selected.length} tasks...`);
        }
    }

    _copyTaskContent(index) {
        if (index >= 0 && index < this.tasks.length) {
            const content = this.tasks[index].content;
            // In a real implementation, this would copy to clipboard
            this.engine?.components?.logViewer?.addInfo(`📋 Copied task content to buffer: ${content}`);
            this.emit('task-content-copied', { content, index });
        }
    }

    _pasteTaskContent() {
        // Placeholder for paste functionality - in a real implementation, this would get from clipboard
        this.engine?.components?.logViewer?.addInfo(`📋 Paste functionality - would paste task content here`);
        this.emit('task-content-paste-requested');
    }

    // Filtering methods
    _showFilterMenu() {
        const filterOptions = [
            { label: 'Filter by Priority', action: () => this._applyPriorityFilter() },
            { label: 'Filter by Status', action: () => this._applyStatusFilter() },
            { label: 'Filter by Time', action: () => this._applyTimeFilter() },
            { label: 'Show All', action: () => this._showAllTasks() },
            { label: 'Cancel', action: () => {} }
        ];

        const position = { top: 5, left: 5 };
        this.contextMenu.show(position, filterOptions);
    }

    _applyPriorityFilter() {
        this.emit('filter-priority-requested');
        this.engine?.components?.logViewer?.addInfo('🔍 Priority filter menu would open here');
    }

    _applyStatusFilter() {
        this.emit('filter-status-requested');
        this.engine?.components?.logViewer?.addInfo('🔍 Status filter menu would open here');
    }

    _applyTimeFilter() {
        this.emit('filter-time-requested');
        this.engine?.components?.logViewer?.addInfo('🔍 Time filter menu would open here');
    }

    _showAllTasks() {
        this.emit('show-all-tasks-requested');
        this.engine?.components?.logViewer?.addInfo('📋 Showing all tasks');
    }

    _showSearchDialog() {
        this.emit('search-requested');
        this.engine?.components?.logViewer?.addInfo('🔍 Search dialog would open here');
    }

    // Progress and tracking methods
    /**
     * Show progress for long-running task operations
     */
    showTaskOperationProgress(operation, options = {}) {
        const {
            taskCount = 1,
            totalTasks = taskCount,
            message = 'Processing tasks...',
            durationEstimate = null
        } = options;

        const progressMessage = this.createProgressBar(taskCount, totalTasks, 20, {
            prefix: `${message} `,
            suffix: ` ${taskCount}/${totalTasks}`
        });

        // Show progress in status bar or in a dedicated area
        this.addVisualFeedback(progressMessage, {
            animate: false,
            flashDuration: 500
        });

        return progressMessage;
    }

    /**
     * Initialize progress tracking for operations
     */
    initProgressTracking() {
        this.operationProgress = {
            total: 0,
            completed: 0,
            currentOperation: null
        };
    }

    /**
     * Update progress during long operations
     */
    updateProgress(operation, completed, total) {
        this.operationProgress = {
            total,
            completed,
            currentOperation: operation
        };

        if (total > 0) {
            const progressMessage = this.createProgressBar(completed, total, 15, {
                prefix: `${operation}: `,
                suffix: ` ${completed}/${total}`
            });

            // Emit progress update for other components to handle
            this.emit('operation-progress', {
                operation,
                completed,
                total,
                percentage: (completed / total) * 100,
                message: progressMessage
            });
        }
    }

    destroy() {
        if (this.contextMenu) {
            this.contextMenu.destroy();
            this.contextMenu = null;
        }

        // Clear any ongoing animations or intervals
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }

        super.destroy?.();
    }
}