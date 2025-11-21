/**
 * Handles command-related UI events (submit, input, history)
 */
export class CommandHandlers {
    constructor(uiElements, commandProcessor, controlPanel) {
        this.uiElements = uiElements;
        this.commandProcessor = commandProcessor;
        this.controlPanel = controlPanel;
    }

    handleCommandSubmit() {
        try {
            const commandInput = this.uiElements.get('commandInput');
            if (!commandInput) {
                this.commandProcessor.logger.log('Command input element not found', 'error', '❌');
                return;
            }

            const command = commandInput.value?.trim();
            if (command) {
                const mode = this.controlPanel ? this.controlPanel.getInputMode() : 'narsese';
                this.commandProcessor.processCommand(command, false, mode);
                commandInput.value = '';
            }
        } catch (error) {
            this.commandProcessor.logger.log(`Error processing command: ${error.message}`, 'error', '❌');
        }
    }

    handleCommandKeyPress(e) {
        if (e.key === 'Enter') {
            this.handleCommandSubmit();
        }
    }

    handleQuickCommand() {
        try {
            const quickCommandsInput = this.uiElements.get('quickCommands');
            if (!quickCommandsInput) return;

            const commandInput = this.uiElements.get('commandInput');
            if (!commandInput) return;

            const quickCommand = quickCommandsInput.value?.trim();
            if (quickCommand) {
                commandInput.value = quickCommand;
                this.commandProcessor.processCommand(quickCommand, false, 'narsese');
            }
        } catch (error) {
            this.commandProcessor.logger.log(`Error executing quick command: ${error.message}`, 'error', '❌');
        }
    }

    showCommandHistory() {
        const history = this.commandProcessor.getHistory();
        if (history.length === 0) {
            this.commandProcessor.logger.log('No commands in history', 'info', '📋');
            return;
        }

        this.commandProcessor.logger.log(`Command History (${history.length} commands):`, 'info', '📋');
        history.forEach((entry, i) => {
            const status = entry.status === 'error' ? '❌' : '✅';
            this.commandProcessor.logger.log(`${status} [${i + 1}] ${entry.command}`, 'debug', '📜');
        });
    }
}
