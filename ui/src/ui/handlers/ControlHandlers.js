export class ControlHandlers {
    constructor(uiElements, commandProcessor, demoManager, graphManager) {
        this.uiElements = uiElements;
        this.commandProcessor = commandProcessor;
        this.demoManager = demoManager;
        this.graphManager = graphManager;
    }

    handleToggleLive() {
        try {
            this.commandProcessor.executeToggleLive();
            const button = this.uiElements.get('toggleLive');
            button && (button.textContent = button.textContent === 'Pause Live' ? 'Resume Live' : 'Pause Live');
        } catch (error) {
            this.commandProcessor.logger.log(`Error toggling live mode: ${error.message}`, 'error', '❌');
        }
    }

    handleRunDemo() {
        const demoSelect = this.uiElements.get('demoSelect');
        const demoName = demoSelect?.value;
        if (!demoName) return;

        try {
            this.demoManager.runDemo(demoName);
        } catch (error) {
            this.commandProcessor.logger.log(`Error running demo: ${error.message}`, 'error', '❌');
        }
    }

    handleTaskVisibility(visible) {
        this.graphManager.setTaskVisibility(visible);
    }

    handleRefresh() {
        this.commandProcessor.executeRefresh();
    }

    handleClearLogs() {
        this.commandProcessor.processCommand('/clear');
    }

    handleToggleTrace() {
        const btn = this.uiElements.get('btnToggleTrace');
        const logView = this.uiElements.get('logView');
        const traceView = this.uiElements.get('traceView');
        if (!logView || !traceView) return;

        const showingLogs = logView.classList.contains('active');
        const [hideView, showView, btnText] = showingLogs
            ? [logView, traceView, 'Show Logs']
            : [traceView, logView, 'Show Trace'];

        hideView.classList.remove('active');
        hideView.classList.add('hidden');
        showView.classList.remove('hidden');
        showView.classList.add('active');
        btn && (btn.textContent = btnText);
    }

    handleToggleContrast() {
        const isHighContrast = document.body.classList.toggle('high-contrast');
        const btn = this.uiElements.get('btnToggleContrast');
        btn && (btn.textContent = isHighContrast ? 'Normal Mode' : 'High Contrast');
    }

    handleZoomIn() {
        this.graphManager?.zoomIn();
    }

    handleZoomOut() {
        this.graphManager?.zoomOut();
    }

    handleFitToScreen() {
        this.graphManager?.fitToScreen();
    }
}
