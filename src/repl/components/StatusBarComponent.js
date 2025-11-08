import { BaseComponent } from './BaseComponent.js';
import blessed from 'blessed';

/**
 * Status Bar Component - displays status information and system metrics
 */
export class StatusBarComponent extends BaseComponent {
    constructor(config = {}) {
        super(config);
        this.elementType = 'box';
        this.engine = config.engine;
        this.animationState = { spinningIndex: 0 };
        this.spinningElements = ['🌀', '◕', '◔', '◕'];
        this.stats = {};
        this.connectionState = 'local'; // 'local' or 'remote'
        this.alerts = 0; // Number of queued alerts
        this.isPulldownMenuOpen = false;

        this.elementConfig = this.elementConfig || {
            bottom: '0',
            left: '0',
            width: '100%',
            height: '1',
            border: { type: 'line' },
            style: {
                fg: 'white',
                bg: 'blue',
                border: { fg: 'yellow' }
            },
            content: ''
        };
    }

    init() {
        this.element = blessed.box(this.elementConfig);

        if (this.parent && this.element) {
            this.parent.append(this.element);
        }

        this._setupEventHandlers();
        this._startAnimationLoop();
        this.updateContent();
        this.isInitialized = true;
        return this.element;
    }

    _setupEventHandlers() {
        if (!this.element) return;

        // Handle mouse clicks for pulldown menu
        this.element.on('click', () => this._togglePulldownMenu());

        const keyBindings = {
            'f1': () => this._togglePulldownMenu(),
            'c': () => this._toggleConnectionState(),
            'a': () => this.clearAlerts()
        };

        Object.entries(keyBindings).forEach(([key, handler]) => {
            this.element.key([key], handler);
        });
    }

    _startAnimationLoop() {
        setInterval(() => {
            if (this.element) {
                this.animationState.spinningIndex = (this.animationState.spinningIndex + 1) % 4;
                this.updateContent();
            }
        }, 500);
    }

    updateContent() {
        if (!this.element) return;

        const stats = this.engine?.getStats() || {};
        const memoryStats = stats.memoryStats || {};
        const statusContent = this._getStatusContent(stats, memoryStats);
        
        this.setContent(statusContent);
        this.render();
    }

    _getStatusContent(stats, memoryStats) {
        const spinningElement = this.spinningElements[this.animationState.spinningIndex];
        const connectionIndicator = this.connectionState === 'remote' ? '🌐' : '💻';
        const connectionText = this.connectionState === 'remote' ? 'REMOTE' : 'LOCAL';
        
        const parts = [
            `{bold}⚡ ${connectionIndicator} ${connectionText} | Concepts: ${memoryStats.conceptCount || 0} | Cycles: ${stats.cycleCount || 0} | Tasks: ${memoryStats.taskCount || 0}{/bold}`,
            `|`,
            `{bold}Alerts: ${this.alerts}{/bold}`
        ];

        if (this.alerts > 0) {
            parts.push(`|`, `{red}{bold}⚠️ ${this.alerts} ALERTS{/bold}{/red}`);
        }

        return parts.join(' ');
    }

    updateStats(newStats) {
        this.stats = { ...this.stats, ...newStats };
        this.updateContent();
    }

    setConnectionState(state) {
        this.connectionState = state.toLowerCase();
        this.updateContent();
        this.emit('connection-state-changed', { state: this.connectionState });
    }

    updateAlerts(count) {
        this.alerts = count;
        this.updateContent();
        this.emit('alerts-updated', { count: this.alerts });
    }

    addAlert() {
        this.alerts++;
        this.updateContent();
        this.emit('alert-added', { count: this.alerts });
    }

    clearAlerts() {
        this.alerts = 0;
        this.updateContent();
        this.emit('alerts-cleared');
    }

    _togglePulldownMenu() {
        this.isPulldownMenuOpen = !this.isPulldownMenuOpen;

        this.emit('pulldown-menu-toggle', {
            isOpen: this.isPulldownMenuOpen,
            options: [
                { key: 'load', label: 'Load Session', shortcut: 'Ctrl+O' },
                { key: 'save', label: 'Save Session', shortcut: 'Ctrl+S' },
                { key: 'settings', label: 'Settings', shortcut: 'Ctrl+,' },
                { key: 'help', label: 'Help', shortcut: 'F1' },
                { key: 'exit', label: 'Exit', shortcut: 'Ctrl+C' }
            ],
            onSelect: (option) => this._handleMenuSelection(option)
        });
    }

    _handleMenuSelection(option) {
        const menuActions = {
            'load': 'menu-load',
            'save': 'menu-save',
            'settings': 'menu-settings',
            'help': 'menu-help',
            'exit': 'menu-exit'
        };

        const event = menuActions[option.key];
        if (event) this.emit(event);

        // Close the menu after selection
        this.isPulldownMenuOpen = false;
    }

    _toggleConnectionState() {
        this.connectionState = this.connectionState === 'local' ? 'remote' : 'local';
        this.updateContent();
        this.emit('connection-state-toggled', { state: this.connectionState });
    }

    setMemoryStats(memoryStats) {
        this.stats.memoryStats = { ...this.stats.memoryStats, ...memoryStats };
        this.updateContent();
    }

    getConnectionState() {
        return this.connectionState;
    }

    getAlerts() {
        return this.alerts;
    }

    getStatusInfo() {
        const stats = this.engine?.getStats() || {};
        const memoryStats = stats.memoryStats || {};

        return {
            connectionState: this.connectionState,
            conceptCount: memoryStats.conceptCount || 0,
            cycleCount: stats.cycleCount || 0,
            taskCount: memoryStats.taskCount || 0,
            alerts: this.alerts,
            spinningIndex: this.animationState.spinningIndex,
            spinningElement: this.spinningElements[this.animationState.spinningIndex]
        };
    }

    updatePerformanceMetrics(metrics) {
        this.stats.performance = { ...this.stats.performance, ...metrics };
        this.updateContent();
        this.emit('performance-metrics-updated', metrics);
    }

    showStatusMessage(message, duration = 3000) {
        const originalContent = this.element.getContent();
        this.setContent(`{bold}${message}{/bold}`);
        this.render();

        setTimeout(() => {
            if (this.element) {
                this.setContent(originalContent);
                this.render();
            }
        }, duration);

        this.emit('status-message-shown', { message, duration });
    }

    setEngine(engine) {
        this.engine = engine;
    }
}