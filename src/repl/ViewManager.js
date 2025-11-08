import blessed from 'blessed';

/**
 * View Manager - handles different layout configurations and view switching
 */
export class ViewManager {
    constructor(config = {}) {
        this.screen = config.screen;
        this.eventEmitter = config.eventEmitter;
        this.components = config.components || {};
        this.currentView = 'vertical-split'; // Default view
        this.views = {
            'vertical-split': this._createVerticalSplitView.bind(this),
            'log-only': this._createLogOnlyView.bind(this),
            'dynamic-grouping': this._createDynamicGroupingView.bind(this)
        };
        this.viewStates = {}; // Store state for each view
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

        this.screen.render();
    }

    _createVerticalSplitView() {
        this._clearScreen();

        // Set up TaskEditorComponent
        if (this.components.taskEditor) {
            this.components.taskEditor.setPosition('0', '0', '40%', '100%-1');
            this.screen.append(this.components.taskEditor.getElement());
        }

        // Set up LogViewerComponent
        if (this.components.logViewer) {
            this.components.logViewer.setPosition('0', '40%', '60%', '100%-1');
            this.screen.append(this.components.logViewer.getElement());
        }

        // Set up StatusBarComponent
        if (this.components.statusBar) {
            this.components.statusBar.setPosition('100%-1', '0', '100%', '1');
            this.screen.append(this.components.statusBar.getElement());
        }
    }

    _createLogOnlyView() {
        this._clearScreen();

        // Set up LogViewerComponent to take full screen except status bar
        if (this.components.logViewer) {
            this.components.logViewer.setPosition('0', '0', '100%', '100%-1');
            this.screen.append(this.components.logViewer.getElement());
        }

        // Set up StatusBarComponent
        if (this.components.statusBar) {
            this.components.statusBar.setPosition('100%-1', '0', '100%', '1');
            this.screen.append(this.components.statusBar.getElement());
        }

        // Hide TaskEditor in this view
        if (this.components.taskEditor) {
            this.components.taskEditor.hide();
        }
    }

    _createDynamicGroupingView() {
        this._clearScreen();

        // For now, just show the task editor in full screen with dynamic grouping features
        if (this.components.taskEditor) {
            this.components.taskEditor.setPosition('0', '0', '100%', '100%-1');
            this.screen.append(this.components.taskEditor.getElement());
        }

        // Set up StatusBarComponent
        if (this.components.statusBar) {
            this.components.statusBar.setPosition('100%-1', '0', '100%', '1');
            this.screen.append(this.components.statusBar.getElement());
        }

        // Hide LogViewer in this view
        if (this.components.logViewer) {
            this.components.logViewer.hide();
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
        if (!component) return {};

        const element = component.getElement();
        if (!element) return {};

        const state = {};
        methods.forEach(method => {
            if (typeof element[method] === 'function') {
                state[method] = element[method]();
            } else if (method in element) {
                state[method] = element[method];
            }
        });

        return state;
    }

    _restoreViewState(viewName) {
        const state = this.viewStates[viewName];
        if (!state) return;

        this._restoreComponentState(this.components.taskEditor, state.taskEditor, ['setScroll']);
        this._restoreComponentState(this.components.logViewer, state.logViewer, ['setScroll']);
    }

    _restoreComponentState(component, state, methods) {
        if (!component || !state) return;

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

    handleResize() {
        this._restoreViewState(this.currentView);
        this.screen.render();
    }

    emit(event, data) {
        this.eventEmitter?.emit(event, data);
    }

    on(event, handler) {
        this.eventEmitter?.on(event, handler);
    }
}