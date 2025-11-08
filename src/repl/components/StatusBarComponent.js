import { BaseComponent } from './BaseComponent.js';
import blessed from 'blessed';
import { ContextMenu } from './ContextMenu.js';

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
        this.connectionState = 'local';
        this.alerts = 0;
        this.isPulldownMenuOpen = false;
        this.contextMenu = null;

        this.elementConfig = this.elementConfig ?? this._getDefaultElementConfig();
    }

    _getDefaultElementConfig() {
        return {
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
            content: 'Press [SPACE] or click for menu | Use Ctrl+H for help | Ctrl+L/T/G to switch views',
            interactive: true,
            keys: true,
            vi: true,
            mouse: true,
            clickable: true
        };
    }

    init() {
        this.element = blessed.box(this.elementConfig);

        if (this.parent && this.element) {
            this.parent.append(this.element);
        }

        // Initialize context menu for pulldown menu
        this.contextMenu = new ContextMenu({
            parent: this.parent,
            eventEmitter: this.eventEmitter
        });
        this.contextMenu.init();

        this._setupEventHandlers();
        this._startAnimationLoop();
        this.updateContent();
        this.isInitialized = true;
        return this.element;
    }

    // Event handling methods
    _setupEventHandlers() {
        if (!this.element) return;

        // Handle mouse clicks for pulldown menu
        this.element.on('click', () => this._togglePulldownMenu());

        // Define key handlers with shared functions where possible
        const handlers = {
            'C-h': () => this._togglePulldownMenu(),        // Ctrl+H: Toggle pulldown menu
            'space': () => this._togglePulldownMenu(),      // Space: Toggle pulldown menu
            'C-f': () => this._showHelpMenu(),              // Ctrl+F: Help menu (Find/Help)
            'C-,': () => this._showSettingsMenu(),          // Ctrl+,: Settings menu
            'C-p': () => this._showPerformanceMenu(),       // Ctrl+P: Performance menu
            'C-i': () => this._showSystemInfo(),            // Ctrl+I: System info
            'C-m': () => this._showMainMenu(),              // Ctrl+M: Main menu
            'C-d': () => this._showMemoryStats(),           // Ctrl+D: Memory stats (D for Data/Memory)
            'c': () => this._toggleConnectionState(),       // C: Toggle connection state
            'C': () => this._toggleConnectionState(),
            'a': () => this.clearAlerts(),                  // A: Clear alerts
            'A': () => this.clearAlerts(),
            'h': () => this._showHelp(),                    // H: Help
            'H': () => this._showHelp(),
            's': () => this._showStatus(),                  // S: Status
            'S': () => this._showStatus(),
            'v': () => this._cycleView(),                   // V: Cycle view
            'V': () => this._cycleView(),
            'q': () => this._requestExit(),                 // Q: Request exit
            'Q': () => this._requestExit(),
            'x': () => this._requestExit(),                 // X: Request exit
            'X': () => this._requestExit()
        };

        Object.entries(handlers).forEach(([key, handler]) => {
            this.element.key([key], handler);
        });
    }

    _startAnimationLoop() {
        setInterval(() => {
            if (this.element) {
                this.animationState.spinningIndex = (this.animationState.spinningIndex + 1) % 4;
                this.updateContent();
            }
        }, 250); // Updated to 250ms for faster animation
    }

    // Menu and help methods
    _showHelpMenu() {
        this._showStatusMessage('ℹ️  Press SPACE or click status bar for menu, Ctrl+H for help, Ctrl+L/T/G to switch views, Ctrl+C to exit');
    }

    _showSettingsMenu() {
        this._showStatusMessage('⚙️  Settings menu would open here');
        this.emit('settings-menu-requested');
    }

    _showPerformanceMenu() {
        const metrics = this._getPerformanceMetrics();
        this._showStatusMessage(`📈 Performance: ${metrics.cps} CPS, Memory: ${metrics.memoryUsageMB}MB`);
        this.emit('performance-menu-requested', metrics);
    }

    _showSystemInfo() {
        const info = this.getStatusInfo();
        this._showStatusMessage(`💻 System: Concepts: ${info.conceptCount}, Cycles: ${info.cycleCount}, Alerts: ${info.alerts}`);
        this.emit('system-info-requested', info);
    }

    _showMainMenu() {
        this._togglePulldownMenu();
    }

    _showHelp() {
        this._showStatusMessage('ℹ️  Help system - SPACE/click status bar=Menu, Ctrl+H=Help, Ctrl+L/T/G=Views, Arrows=Navigate');
    }

    _showStatus() {
        const info = this.getStatusInfo();
        this._showStatusMessage(`📊 Status: ${info.connectionState.toUpperCase()} | Concepts: ${info.conceptCount} | Cycle: ${info.cycleCount} | Alerts: ${info.alerts}`);
    }

    _showMemoryStats() {
        const metrics = this._getPerformanceMetrics();
        this._showStatusMessage(`🧠 Memory: ${metrics.memoryUsageMB}MB | Performance: ${metrics.cps} CPS`);
    }

    _togglePulldownMenu() {
        this.isPulldownMenuOpen = !this.isPulldownMenuOpen;

        // Get current performance metrics for display
        const performanceMetrics = this._getPerformanceMetrics();

        this.emit('pulldown-menu-toggle', {
            isOpen: this.isPulldownMenuOpen,
            options: [
                { key: 'load', label: '📁 Load Session', shortcut: 'Ctrl+O' },
                { key: 'save', label: '💾 Save Session', shortcut: 'Ctrl+S' },
                { key: 'settings', label: '⚙️ Settings', shortcut: 'Ctrl+,' },
                { key: 'performance', label: `📈 Performance: ${performanceMetrics.cps} CPS`, shortcut: '' },
                { key: 'help', label: '❓ Help', shortcut: 'F1' },
                { key: 'exit', label: '🚪 Exit', shortcut: 'Ctrl+C' }
            ],
            onSelect: (option) => this._handleMenuSelection(option)
        });
    }

    _handleMenuSelection(option) {
        const menuActions = this._getMenuActions();
        const event = menuActions[option.key];
        event && this.emit(event);

        // Close the menu after selection
        this.isPulldownMenuOpen = false;
    }

    _getMenuActions() {
        return {
            'load': 'menu-load',
            'save': 'menu-save',
            'settings': 'menu-settings',
            'help': 'menu-help',
            'exit': 'menu-exit'
        };
    }

    // Connection and state methods
    setConnectionState(state) {
        this.connectionState = state.toLowerCase();
        this.updateContent();
        this.emit('connection-state-changed', { state: this.connectionState });
    }

    _toggleConnectionState() {
        this.connectionState = this.connectionState === 'local' ? 'remote' : 'local';
        this.updateContent();
        this.emit('connection-state-toggled', { state: this.connectionState });
    }

    getConnectionState() {
        return this.connectionState;
    }

    // Alert methods
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

    getAlerts() {
        return this.alerts;
    }

    // View and navigation methods
    _cycleView() {
        if (this.engine?.viewManager) {
            this.engine.viewManager._cycleViews();
        }
    }

    _requestExit() {
        this._showStatusMessage('🚪 Press Ctrl+C to exit the application');
        this.emit('exit-requested');
    }

    // Method to handle view changes and update status bar
    handleViewChange(viewInfo) {
        this.updateContent();
        this.emit('view-changed-status', viewInfo);
    }

    // Content update and formatting methods
    updateContent() {
        if (!this.element) return;

        const stats = this.engine?.getStats() || {};
        const memoryStats = stats.memoryStats || {};
        const statusContent = this._getStatusContent(stats, memoryStats);

        this.setContent(statusContent);
        this.render();
    }

    _getStatusContent(stats, memoryStats) {
        const statusParts = [
            this._getConnectionStatus(),
            this._getViewStatus(),
            this._getSystemStats(memoryStats, stats),
            this._getPerformanceMetricsStatus(),
            this._getAlertsStatus(),
            this._getConnectionQualityStatus()
        ];

        if (this.alerts > 0) {
            statusParts.push(this._getAlertsWarning());
        }

        // Add a separator and session information
        statusParts.push(this._getSessionInfo());

        return statusParts.filter(part => part && part.trim() !== '').join(' │ ');
    }

    // Status display methods
    _getConnectionStatus() {
        const connectionIndicator = this.connectionState === 'remote' ? '🌐' : '💻';
        const connectionText = this.connectionState === 'remote' ? 'REMOTE' : 'LOCAL';
        return `{bold}⚡ ${connectionIndicator} ${connectionText}{/bold}`;
    }

    _getViewStatus() {
        const viewInfo = this.engine?.viewManager?.getViewInfoForStatus?.() ?? {};
        const viewIcon = viewInfo.icon ?? '🔄';
        const viewLabel = viewInfo.current ?? 'Unknown';
        return `{bold}${viewIcon} ${viewLabel}{/bold}`;
    }

    _getSystemStats(memoryStats, stats) {
        const conceptCount = memoryStats.conceptCount ?? 0;
        const cycleCount = stats.cycleCount ?? 0;
        const focusSetSize = memoryStats.focusSetSize ?? 0;
        const inputCount = this.engine?.inputManager?.size?.() ?? 0;
        const queuedInputCount = this._getQueuedInputCount();
        const metrics = this._getPerformanceMetrics();

        return `{bold}C: ${metrics.concepts} | F: ${metrics.focusSetSize} | I: ${inputCount} | Q: ${queuedInputCount} | Cy: ${cycleCount} | M: ${metrics.memoryUsageMB}MB{/bold}`;
    }

    _getPerformanceMetricsStatus() {
        const performanceMetrics = this._getPerformanceMetrics();
        const cps = performanceMetrics.cps;
        const memoryUsage = performanceMetrics.memoryUsageMB;

        // Color code based on performance metrics
        const cpsColor = this._getColorByValue(cps, { high: 50, medium: 10, highColor: 'green', mediumColor: 'yellow', lowColor: 'red' });
        const memoryColor = this._getColorByValue(memoryUsage, { high: 500, medium: 200, highColor: 'red', mediumColor: 'yellow', lowColor: 'green' });

        return `{bold}${this._getAnimatedPerformanceIndicator()} │ CPS: {${cpsColor}}${cps}{/} │ Mem: {${memoryColor}}${memoryUsage}MB{/}{/bold}`;
    }

    _getAlertsStatus() {
        return `{bold}Alerts: ${this.alerts}{/bold}`;
    }

    _getAlertsWarning() {
        return `{red}{bold}⚠️ ${this.alerts} ALERTS{/bold}{/red}`;
    }

    _getSessionInfo() {
        const startTime = this.engine?.sessionState?.startTime || Date.now();
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const hours = Math.floor(elapsedSeconds / 3600);
        const minutes = Math.floor((elapsedSeconds % 3600) / 60);
        const seconds = elapsedSeconds % 60;

        const timeString = hours > 0
            ? `${hours}h ${minutes}m ${seconds}s`
            : minutes > 0
                ? `${minutes}m ${seconds}s`
                : `${seconds}s`;

        return `{bold}⏱️  Session: ${timeString}{/bold}`;
    }

    // Performance and metrics methods
    _getPerformanceMetrics() {
        const stats = this.engine?.getStats() ?? {};
        const cycleCount = stats.cycleCount ?? 0;
        const startTime = this.engine?.sessionState?.startTime ?? Date.now();
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const cps = elapsedSeconds > 0 ? (cycleCount / elapsedSeconds).toFixed(2) : '0.00';
        const memoryUsage = process.memoryUsage?.() ?? {};
        const rssInMB = memoryUsage.rss ? (memoryUsage.rss / 1024 / 1024).toFixed(2) : 'N/A';
        const heapUsedMB = memoryUsage.heapUsed ? (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) : 'N/A';
        const heapTotalMB = memoryUsage.heapTotal ? (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) : 'N/A';

        // Calculate additional metrics
        const concepts = stats.memoryStats?.conceptCount ?? 0;
        const focusSetSize = stats.memoryStats?.focusSetSize ?? 0;
        const tasksInMemory = stats.memoryStats?.taskCount ?? 0;

        return { 
            cps, 
            cycleCount, 
            startTime, 
            memoryUsageMB: parseFloat(rssInMB),
            heapUsedMB: parseFloat(heapUsedMB),
            heapTotalMB: parseFloat(heapTotalMB),
            concepts,
            focusSetSize,
            tasksInMemory,
            cpuUsage: 'N/A' 
        };
    }

    _getAnimatedPerformanceIndicator() {
        const spinningElement = this.spinningElements[this.animationState.spinningIndex];
        const { cps } = this._getPerformanceMetrics();

        return `{bold}${spinningElement} ${cps} CPS{/bold}`;
    }

    // Connection quality methods
    /**
     * Update and display connection quality metrics
     */
    updateConnectionQuality(qualityMetrics) {
        this.connectionQuality = { ...this.connectionQuality, ...qualityMetrics };
        this.updateContent();
    }

    /**
     * Get connection quality status for display
     */
    _getConnectionQualityStatus() {
        if (!this.connectionQuality) {
            return '';
        }

        const { state, isHealthy, pingLatency } = this.connectionQuality;
        const stateText = state === 1 ? 'OPEN' : state === 2 ? 'CLOSING' : state === 3 ? 'CLOSED' : 'CONNECTING';
        const stateColor = isHealthy ? 'green' : 'red';
        const latency = pingLatency ? `${pingLatency}ms` : 'N/A';

        return `{bold}🔗 Quality: {${stateColor}}${stateText}{/} │ Latency: ${latency}{/bold}`;
    }

    // Utility methods
    _getQueuedInputCount() {
        return this.engine?.inputManager?.getAllTasks?.()?.length ?? 0;
    }

    /**
     * Get color based on value thresholds
     */
    _getColorByValue(value, thresholds) {
        const { high, medium, highColor, mediumColor, lowColor } = thresholds;
        return value > high ? highColor : value > medium ? mediumColor : lowColor;
    }

    updateStats(newStats) {
        this.stats = { ...this.stats, ...newStats };
        this.updateContent();
    }

    setMemoryStats(memoryStats) {
        this.stats.memoryStats = { ...this.stats.memoryStats, ...memoryStats };
        this.updateContent();
    }

    getStatusInfo() {
        const stats = this.engine?.getStats() || {};
        const memoryStats = stats.memoryStats || {};

        return {
            connectionState: this.connectionState,
            conceptCount: memoryStats.conceptCount || 0,
            cycleCount: stats.cycleCount || 0,
            taskCount: memoryStats.taskCount || 0,
            queuedInputCount: this._getQueuedInputCount(),
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