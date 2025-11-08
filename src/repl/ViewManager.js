import blessed from 'blessed';

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

    _initializeViews() {
        return {
            'vertical-split': this._createVerticalSplitView.bind(this),
            'log-only': this._createLogOnlyView.bind(this),
            'dynamic-grouping': this._createDynamicGroupingView.bind(this)
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
            }
        };
    }

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

    // Update the status bar to reflect current view
    _updateStatusBar() {
        if (this.components.statusBar && typeof this.components.statusBar.handleViewChange === 'function') {
            const viewInfo = this.getCurrentViewInfo();
            this.components.statusBar.handleViewChange(viewInfo);
        }
    }

    _createVerticalSplitView() {
        this._clearScreen();
        this._setupComponent('taskEditor', '0', '0', '40%', '100%-1');
        this._setupComponent('logViewer', '0', '40%', '60%', '100%-1');
        this._setupStatusBar();
    }

    _createLogOnlyView() {
        this._clearScreen();
        this._setupComponent('logViewer', '0', '0', '100%', '100%-1');
        this._setupStatusBar();
        this._hideComponent('taskEditor');
    }

    _createDynamicGroupingView() {
        this._clearScreen();
        this._setupComponent('taskEditor', '0', '0', '70%', '100%-1');
        this._setupComponent('logViewer', '0', '70%', '30%', '100%-1');
        this._setupStatusBar();
        this._enableGroupingMode();
        this._showAllComponents();
    }

    _setupComponent(componentName, top, left, width, height) {
        const component = this.components[componentName];
        if (component) {
            component.setPosition(top, left, width, height);
            this.screen.append(component.getElement());
        }
    }

    _setupStatusBar() {
        const statusBar = this.components.statusBar;
        if (statusBar) {
            statusBar.setPosition('100%-1', '0', '100%', '1');
            this.screen.append(statusBar.getElement());
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

    _storeCurrentViewState() {
        if (!this.currentView) return;

        const state = {
            timestamp: Date.now()
        };

        const componentStates = {
            taskEditor: this._getComponentState(this.components.taskEditor, ['getScroll', 'selected']),
            logViewer: this._getComponentState(this.components.logViewer, ['getScroll'])
        };

        this.viewStates[this.currentView] = { ...state, ...componentStates };
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

    getCurrentView() {
        return this.currentView;
    }

    getAvailableViews() {
        return Object.keys(this.views);
    }

    setComponents(components) {
        this.components = { ...this.components, ...components };
    }

    addComponent(name, component) {
        this.components[name] = component;
    }

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

    _cycleViews() {
        const views = this.getAvailableViews();
        const currentIndex = views.indexOf(this.currentView);
        const nextIndex = (currentIndex + 1) % views.length;
        this.switchView(views[nextIndex]);
    }

    getCurrentViewInfo() {
        return {
            name: this.currentView,
            ...this.viewModes[this.currentView]
        };
    }

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

    emit(event, data) {
        this.eventEmitter?.emit(event, data);
    }

    on(event, handler) {
        this.eventEmitter?.on(event, handler);
    }
}