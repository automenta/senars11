/**
 * Handles visualization and control related UI events
 */
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
            if (button) {
                const currentText = button.textContent;
                button.textContent = currentText === 'Pause Live' ? 'Resume Live' : 'Pause Live';
            }
        } catch (error) {
            this.commandProcessor.logger.log(`Error toggling live mode: ${error.message}`, 'error', '❌');
        }
    }

    handleRunDemo() {
        try {
            const demoSelect = this.uiElements.get('demoSelect');
            if (!demoSelect) return;

            const demoName = demoSelect.value;
            if (demoName) {
                this.demoManager.runDemo(demoName);
            }
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
}
