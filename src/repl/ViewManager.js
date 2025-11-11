/**
 * View Manager - handles different layout configurations and view switching
 */
export class ViewManager {
    constructor(config = {}) {
        this.screen = config.screen;
        this.eventEmitter = config.eventEmitter;
        this.components = config.components ?? {};
        this.currentView = 'vertical-split';
        this.views = this._initializeViews();
        this.viewStates = {};
        this.viewModes = this._initializeViewModes();
    }

    // Initialization methods
    _initializeViews() {
        return {
            'vertical-split': this._createVerticalSplitView.bind(this),
            'log-only': this._createLogOnlyView.bind(this),
            'dynamic-grouping': this._createDynamicGroupingView.bind(this),
            'agent-dashboard': this._createAgentDashboardView.bind(this)
        };
    }

    _initializeViewModes() {
        return {
            'vertical-split': {
                label: 'Split View',
                description: 'Task Editor (left) and Log Viewer (right)',
                icon: '.SplitContainer'
            },
            'log-only': {
                label: 'Log Only',
                description: 'Full-screen Log Viewer',
                icon: '📄'
            },
            'dynamic-grouping': {
                label: 'Dynamic Grouping',
                description: 'Tasks organized by relationships, time, priority',
                icon: '📊'
            },
            'agent-dashboard': {
                label: 'Agent Dashboard',
                description: 'Agent status, reasoning trace, metrics, and task management',
                icon: '🤖'
            }
        };
    }

    // View management methods
    switchView(viewName) {
        if (!this.views[viewName]) {
            throw new Error(`Unknown view: ${viewName}`);
        }

        // Store current state before switching
        this._storeCurrentViewState();

        // Apply the new view layout
        this.views[viewName]();
        this.currentView = viewName;

        // Restore state for the new view if it exists
        this._restoreViewState(viewName);

        // Emit event to notify about view change
        this.emit('view-changed', {
            from: this.currentView,
            to: viewName,
            availableViews: Object.keys(this.views)
        });

        // Update status bar to reflect current view
        this._updateStatusBar();

        this.screen.render();
    }

    _cycleViews() {
        const views = this.getAvailableViews();
        const currentIndex = views.indexOf(this.currentView);
        const nextIndex = (currentIndex + 1) % views.length;
        this.switchView(views[nextIndex]);
    }

    getCurrentView() {
        return this.currentView;
    }

    getAvailableViews() {
        return Object.keys(this.views);
    }

    // View creation methods
    _createVerticalSplitView() {
        this._clearScreen();
        this._setupComponent('taskEditor', '0', '0', '40%', '100%-1');
        this._setupComponent('logViewer', '0', '40%', '60%', '100%-1');
        this._setupTaskInput();
        this._setupStatusBar();
    }

    _createLogOnlyView() {
        this._clearScreen();
        this._setupComponent('logViewer', '0', '0', '100%', '100%-1');
        this._setupTaskInput();
        this._setupStatusBar();
        this._hideComponent('taskEditor');
    }

    _createDynamicGroupingView() {
        this._clearScreen();
        this._setupComponent('taskEditor', '0', '0', '70%', '100%-1');
        this._setupComponent('logViewer', '0', '70%', '30%', '100%-1');
        this._setupTaskInput();
        this._setupStatusBar();
        this._enableGroupingMode();
        this._showAllComponents();
    }

    _createAgentDashboardView() {
        this._clearScreen();
        
        // Agent Status Panel (left side, top) 30%
        this._setupComponent('agentStatus', '0', '0', '30%', '30%');
        
        // Task Editor (left side, middle) 40% 
        this._setupComponent('taskEditor', '30%', '0', '30%', '40%');
        
        // Metrics Dashboard (left side, bottom) 29% (leaving 1% for status bar)
        this._setupComponent('metricsDashboard', '70%', '0', '30%', '29%');
        
        // Reasoning Trace (right side, top) 50%
        this._setupComponent('reasoningTrace', '0', '30%', '70%', '50%');
        
        // Log Viewer (right side, bottom) 49%
        this._setupComponent('logViewer', '50%', '30%', '70%', '49%');
        
        this._setupTaskInput();
        this._setupStatusBar();
    }

    // Layout and component positioning methods
    _setupComponent(componentName, top, left, width, height) {
        const component = this.components[componentName];
        if (component && typeof component.setPosition === 'function') {
            component.setPosition(top, left, width, height);
            // Make sure the element is on screen if it has one
            if (component.getElement()) {
                this.screen.append(component.getElement());
            }
        } else if (component && component.getElement) {
            // If no setPosition, try to set properties directly on the blessed element
            const element = component.getElement();
            if (element) {
                if (top !== undefined) element.position.top = top;
                if (left !== undefined) element.position.left = left;
                if (width !== undefined) element.position.width = width;
                if (height !== undefined) element.position.height = height;
                this.screen.append(element);
            }
        }
    }

    _setupStatusBar() {
        const statusBar = this.components.statusBar;
        if (statusBar) {
            statusBar.setPosition('100%-1', '0', '100%', '1');
            this.screen.append(statusBar.getElement());
        }
    }

    _setupTaskInput() {
        const taskInput = this.components.taskInput;
        if (taskInput) {
            // Position task input at the bottom, above the status bar
            taskInput.setPosition('100%-2', '0', '100%', '1');  // height '1', positioned at '100%-2'
            // Make sure it's added to the screen if not already there
            if (this.screen && taskInput.getElement() && !this.screen.children.includes(taskInput.getElement())) {
                this.screen.append(taskInput.getElement());
            }
        }
    }

    _hideComponent(componentName) {
        const component = this.components[componentName];
        component?.hide();
    }

    _showComponent(componentName) {
        const component = this.components[componentName];
        component?.show();
    }

    _showAllComponents() {
        this._showComponent('taskEditor');
        this._showComponent('logViewer');
    }

    _enableGroupingMode() {
        const taskEditor = this.components.taskEditor;
        if (taskEditor) {
            taskEditor.enableGrouping = true;
            taskEditor.currentGrouping = taskEditor.currentGrouping ?? 'priority';
        }
    }

    _clearScreen() {
        this.screen.children.forEach(child => child.destroy());
    }

    // State management methods
    _storeCurrentViewState() {
        if (!this.currentView) return;

        const state = {
            timestamp: Date.now()
        };

        const componentStates = {
            taskEditor: this._getComponentState(this.components.taskEditor, ['getScroll', 'selected']),
            logViewer: this._getComponentState(this.components.logViewer, ['getScroll'])
        };

        this.viewStates[this.currentView] = {...state, ...componentStates};
    }

    _getComponentState(component, methods) {
        if (!component?.getElement) return {};

        const element = component.getElement();
        if (!element) return {};

        return methods.reduce((state, method) => {
            if (typeof element[method] === 'function') {
                state[method] = element[method]();
            } else if (method in element) {
                state[method] = element[method];
            }
            return state;
        }, {});
    }

    _restoreViewState(viewName) {
        const state = this.viewStates[viewName];
        if (!state) return;

        this._restoreComponentState(this.components.taskEditor, state.taskEditor, ['setScroll']);
        this._restoreComponentState(this.components.logViewer, state.logViewer, ['setScroll']);
    }

    _restoreComponentState(component, state, methods) {
        if (!component || !state?.getElement) return;

        const element = component.getElement();
        if (!element) return;

        methods.forEach(method => {
            if (typeof element[method] === 'function' && state[method] !== undefined) {
                element[method](state[method]);
            }
        });
    }

    // Event and UI update methods
    handleResize() {
        // Store current component states before resize
        this._storeCurrentViewState();

        // Recreate the current view layout based on new screen dimensions
        this.views[this.currentView].call(this);

        // Restore component states after layout change
        this._restoreViewState(this.currentView);

        // Final render to ensure everything is properly positioned
        this.screen.render();

        // Emit resize event so components can adjust if needed
        this.emit('view-resized', {
            view: this.currentView,
            screen: {
                width: this.screen.width,
                height: this.screen.height
            }
        });
    }

    // Update the status bar to reflect current view
    _updateStatusBar() {
        if (this.components.statusBar && typeof this.components.statusBar.handleViewChange === 'function') {
            const viewInfo = this.getCurrentViewInfo();
            this.components.statusBar.handleViewChange(viewInfo);
        }
    }

    // Component management methods
    setComponents(components) {
        this.components = {...this.components, ...components};
    }

    addComponent(name, component) {
        this.components[name] = component;
    }

    // Keyboard shortcut methods
    addViewShortcuts(screen) {
        const shortcuts = {
            'C-l': () => this.switchView('log-only'),      // Ctrl+L: Log-only view
            'C-t': () => this.switchView('vertical-split'), // Ctrl+T: Task editor view
            'C-g': () => this.switchView('dynamic-grouping'), // Ctrl+G: Dynamic grouping view
            'tab': () => this._cycleViews()                 // Tab: Cycle through views
        };

        Object.entries(shortcuts).forEach(([key, handler]) => {
            screen.key([key], handler);
        });
    }

    // Info methods
    getCurrentViewInfo() {
        return {
            name: this.currentView,
            ...this.viewModes[this.currentView]
        };
    }

    // Add method to get view information for status bar
    getViewInfoForStatus() {
        const currentView = this.getCurrentViewInfo();
        const allViews = this.getAvailableViews();

        return {
            current: currentView.label,
            icon: currentView.icon,
            totalViews: allViews.length,
            allViewNames: allViews.map(view => this.viewModes[view].label)
        };
    }

    // Add method to update status bar with view information
    updateStatusBar() {
        if (this.components.statusBar) {
            this.components.statusBar.updateContent();
        }
    }

    // Event handling methods
    emit(event, data) {
        this.eventEmitter?.emit(event, data);
    }

    on(event, handler) {
        this.eventEmitter?.on(event, handler);
    }
}