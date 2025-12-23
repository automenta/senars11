export class CommandHandlers {
    constructor(uiElements, commandProcessor, controlPanel) {
        this.uiElements = uiElements;
        this.commandProcessor = commandProcessor;
        this.controlPanel = controlPanel;

        this.historyPosition = -1;
        this.currentInput = '';
        this.autocompleteVisible = false;
        this.autocompleteIndex = -1;
        this.filteredCommands = [];

        this._setupGlobalKeyboardShortcuts();
        this._createAutocompleteElement();
    }

    _setupGlobalKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const commandInput = this.uiElements.get('commandInput');
            if (e.key === '`' && !e.ctrlKey && !e.altKey && !e.metaKey && commandInput && document.activeElement !== commandInput) {
                e.preventDefault();
                commandInput.focus();
            }
        });
    }

    _createAutocompleteElement() {
        const commandInput = this.uiElements.get('commandInput');
        if (!commandInput) return;

        const autocomplete = document.createElement('div');
        autocomplete.id = 'command-autocomplete';
        autocomplete.className = 'command-autocomplete hidden';
        commandInput.parentElement.appendChild(autocomplete);
        this.autocompleteElement = autocomplete;

        document.addEventListener('click', (e) => {
            if (!commandInput.contains(e.target) && !autocomplete.contains(e.target)) {
                this._hideAutocomplete();
            }
        });
    }

    handleCommandSubmit() {
        const commandInput = this.uiElements.get('commandInput');
        if (!commandInput) {
            this.commandProcessor.logger.log('Command input element not found', 'error', '❌');
            return;
        }

        const command = commandInput.value?.trim();
        if (!command) return;

        try {
            const mode = this.controlPanel?.getInputMode() ?? 'narsese';
            this.commandProcessor.processCommand(command, false, mode);
            commandInput.value = '';
            this.historyPosition = -1;
            this.currentInput = '';
            this._hideAutocomplete();
        } catch (error) {
            this.commandProcessor.logger.log(`Error processing command: ${error.message}`, 'error', '❌');
        }
    }

    handleCommandKeyPress(e) {
        const commandInput = this.uiElements.get('commandInput');
        if (!commandInput) return;

        const keyHandlers = {
            Enter: () => {
                if (this.autocompleteVisible && this.autocompleteIndex >= 0) {
                    e.preventDefault();
                    commandInput.value = this.filteredCommands[this.autocompleteIndex];
                    this._hideAutocomplete();
                } else {
                    this.handleCommandSubmit();
                }
            },
            ArrowUp: () => {
                e.preventDefault();
                this.autocompleteVisible ? this._navigateAutocomplete(-1) : this._navigateHistory(1);
            },
            ArrowDown: () => {
                e.preventDefault();
                this.autocompleteVisible ? this._navigateAutocomplete(1) : this._navigateHistory(-1);
            },
            Tab: () => {
                e.preventDefault();
                const input = commandInput.value.trim();
                if (input.startsWith('/')) {
                    if (this.autocompleteVisible && this.filteredCommands.length > 0) {
                        commandInput.value = this.filteredCommands[0];
                        this._hideAutocomplete();
                    } else {
                        this._showAutocomplete(input);
                    }
                }
            },
            Escape: () => this._hideAutocomplete()
        };

        keyHandlers[e.key]?.();
    }

    handleCommandInput(e) {
        const input = e.target.value.trim();
        input.startsWith('/') && input.length > 1
            ? this._showAutocomplete(input)
            : this._hideAutocomplete();
    }

    _navigateHistory(direction) {
        const commandInput = this.uiElements.get('commandInput');
        if (!commandInput) return;

        const history = this.commandProcessor.getHistory();
        if (!history.length) return;

        this.historyPosition === -1 && direction > 0 && (this.currentInput = commandInput.value);
        this.historyPosition = Math.max(-1, Math.min(history.length - 1, this.historyPosition + direction));
        commandInput.value = this.historyPosition === -1
            ? this.currentInput
            : history[history.length - 1 - this.historyPosition].command;
    }

    _showAutocomplete(input) {
        this.filteredCommands = this.commandProcessor.getAvailableCommands()
            .filter(cmd => cmd.toLowerCase().startsWith(input.toLowerCase()));

        if (!this.filteredCommands.length) {
            this._hideAutocomplete();
            return;
        }

        this.autocompleteVisible = true;
        this.autocompleteIndex = -1;
        this._renderAutocomplete();
    }

    _hideAutocomplete() {
        this.autocompleteVisible = false;
        this.autocompleteIndex = -1;
        this.autocompleteElement?.classList.add('hidden');
    }

    _navigateAutocomplete(direction) {
        this.autocompleteIndex += direction;
        if (this.autocompleteIndex < -1) this.autocompleteIndex = this.filteredCommands.length - 1;
        if (this.autocompleteIndex >= this.filteredCommands.length) this.autocompleteIndex = -1;
        this._renderAutocomplete();
    }

    _renderAutocomplete() {
        if (!this.autocompleteElement) return;

        this.autocompleteElement.innerHTML = this.filteredCommands
            .map((cmd, i) => `<div class="autocomplete-item ${i === this.autocompleteIndex ? 'selected' : ''}" data-index="${i}">${cmd}</div>`)
            .join('');

        this.autocompleteElement.classList.remove('hidden');

        this.autocompleteElement.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                const commandInput = this.uiElements.get('commandInput');
                if (commandInput) {
                    commandInput.value = this.filteredCommands[parseInt(item.dataset.index)];
                    this._hideAutocomplete();
                    commandInput.focus();
                }
            });
        });
    }

    handleQuickCommand() {
        const quickCommandsInput = this.uiElements.get('quickCommands');
        const commandInput = this.uiElements.get('commandInput');
        if (!quickCommandsInput || !commandInput) return;

        const quickCommand = quickCommandsInput.value?.trim();
        if (!quickCommand) return;

        try {
            commandInput.value = quickCommand;
            this.commandProcessor.processCommand(quickCommand, false, 'narsese');
        } catch (error) {
            this.commandProcessor.logger.log(`Error executing quick command: ${error.message}`, 'error', '❌');
        }
    }

    showCommandHistory() {
        const history = this.commandProcessor.getHistory();
        if (!history.length) {
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

