/**
 * ControlPanel handles playback controls, input mode switching, and sidebar management
 */
export class ControlPanel {
    constructor(uiElements, commandProcessor, logger) {
        this.uiElements = uiElements;
        this.commandProcessor = commandProcessor;
        this.logger = logger;
        this.inputMode = 'narsese'; // Default
        this.isRunning = false;
        this.isSidebarVisible = false;

        this._bindMethods();
        this.initialize();
    }

    /**
     * Bind method context to preserve 'this' reference
     */
    _bindMethods() {
        this._onPlayPauseClick = this._onPlayPauseClick.bind(this);
        this._onStepClick = this._onStepClick.bind(this);
        this._onResetClick = this._onResetClick.bind(this);
        this._onConfirmResetClick = this._onConfirmResetClick.bind(this);
        this._onCancelResetClick = this._onCancelResetClick.bind(this);
        this._onModalClick = this._onModalClick.bind(this);
        this._onModeChange = this._onModeChange.bind(this);
        this._onSaveClick = this._onSaveClick.bind(this);
        this._onLoadClick = this._onLoadClick.bind(this);
        this._onToggleSidebarClick = this._onToggleSidebarClick.bind(this);
        this._onCloseSidebarClick = this._onCloseSidebarClick.bind(this);
    }

    initialize() {
        this._setupToolbar();
        this._setupInputMode();
        this._setupSaveLoad();
        this._setupSidebar();
        this._setupResetModal();

        // Initialize UI state
        this._updatePlaybackControls();
    }

    _setupToolbar() {
        const {btnPlayPause, btnStep, btnReset} = this.uiElements.getAll();

        if (btnPlayPause) {
            btnPlayPause.addEventListener('click', this._onPlayPauseClick);
        }

        if (btnStep) {
            btnStep.addEventListener('click', this._onStepClick);
        }

        if (btnReset) {
            btnReset.addEventListener('click', this._onResetClick);
        }
    }

    _togglePlayback() {
        if (this.isRunning) {
            this.commandProcessor.executeControlCommand('control/stop');
            this.logger.log('System paused', 'info', '⏸️');
            this.isRunning = false;
        } else {
            this.commandProcessor.executeControlCommand('control/start');
            this.logger.log('System started', 'info', '▶️');
            this.isRunning = true;
        }
        this._updatePlaybackControls();
    }

    _updatePlaybackControls() {
        const {btnPlayPause, btnStep} = this.uiElements.getAll();

        if (btnPlayPause) {
            // Using icons instead of text/emoji for better compatibility
            btnPlayPause.innerHTML = this.isRunning
                ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>' // Pause icon
                : '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'; // Play icon
            btnPlayPause.title = this.isRunning ? 'Pause' : 'Run Continuous';
            btnPlayPause.setAttribute('aria-label', this.isRunning ? 'Pause' : 'Run Continuous');
        }

        if (btnStep) {
            // Step forward icon
            if (!btnStep.innerHTML.includes('<svg')) {
                btnStep.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>';
            }
            btnStep.disabled = this.isRunning;
            btnStep.style.opacity = this.isRunning ? '0.5' : '1';
            btnStep.title = 'Step Forward';
            btnStep.setAttribute('aria-label', 'Step Forward');
        }
    }

    _setupSidebar() {
        const {btnToggleSidebar, btnCloseSidebar, sidebarPanel} = this.uiElements.getAll();

        if (btnToggleSidebar) {
            btnToggleSidebar.addEventListener('click', this._onToggleSidebarClick);
        }

        if (btnCloseSidebar) {
            btnCloseSidebar.addEventListener('click', this._onCloseSidebarClick);
        }
    }

    toggleSidebar(show) {
        const {sidebarPanel, btnToggleSidebar} = this.uiElements.getAll();
        if (!sidebarPanel) return;

        if (show === undefined) {
            this.isSidebarVisible = !this.isSidebarVisible;
        } else {
            this.isSidebarVisible = show;
        }

        if (this.isSidebarVisible) {
            sidebarPanel.classList.remove('hidden');
            if (btnToggleSidebar) btnToggleSidebar.classList.add('active');
        } else {
            sidebarPanel.classList.add('hidden');
            if (btnToggleSidebar) btnToggleSidebar.classList.remove('active');
        }

        // Enable/Disable graph updates based on visibility
        if (this.commandProcessor.graphManager) {
            this.commandProcessor.graphManager.setUpdatesEnabled(this.isSidebarVisible);
        }
    }

    _setupResetModal() {
        const {confirmationModal, btnConfirmReset, btnCancelReset} = this.uiElements.getAll();

        if (btnConfirmReset) {
            btnConfirmReset.addEventListener('click', this._onConfirmResetClick);
        }

        if (btnCancelReset) {
            btnCancelReset.addEventListener('click', this._onCancelResetClick);
        }

        // Close on click outside (optional, but good UX)
        if (confirmationModal) {
            confirmationModal.addEventListener('click', this._onModalClick);
        }
    }

    _showResetModal() {
        const {confirmationModal} = this.uiElements.getAll();
        if (confirmationModal) {
            confirmationModal.classList.remove('hidden');
        }
    }

    _hideResetModal() {
        const {confirmationModal} = this.uiElements.getAll();
        if (confirmationModal) {
            confirmationModal.classList.add('hidden');
        }
    }

    _setupInputMode() {
        const {inputModeNarsese, inputModeAgent} = this.uiElements.getAll();

        if (inputModeNarsese) inputModeNarsese.addEventListener('change', this._onModeChange);
        if (inputModeAgent) inputModeAgent.addEventListener('change', this._onModeChange);
    }

    _setupSaveLoad() {
        const {btnSave, btnLoad} = this.uiElements.getAll();

        if (btnSave) btnSave.addEventListener('click', this._onSaveClick);
        if (btnLoad) btnLoad.addEventListener('click', this._onLoadClick);
    }

    updateCycleCount(count) {
        const {cycleCount} = this.uiElements.getAll();
        if (cycleCount) {
            cycleCount.textContent = `Cycle: ${count}`;
        }
    }

    getInputMode() {
        return this.inputMode;
    }

    /**
     * Event handler for play/pause button click
     */
    _onPlayPauseClick() {
        this._togglePlayback();
    }

    /**
     * Event handler for step button click
     */
    _onStepClick() {
        if (!this.isRunning) {
            this.commandProcessor.executeControlCommand('control/step');
            this.logger.log('Stepping...', 'debug', '⏯️');
        }
    }

    /**
     * Event handler for reset button click
     */
    _onResetClick() {
        this._showResetModal();
    }

    /**
     * Event handler for confirm reset button click
     */
    _onConfirmResetClick() {
        this.commandProcessor.executeControlCommand('control/reset');
        this.logger.log('System reset', 'warning', '🔄');
        this._hideResetModal();
        // Also reset playback state if needed
        if (this.isRunning) {
            this.isRunning = false;
            this._updatePlaybackControls();
        }
        // Reset cycle count
        this.updateCycleCount(0);
    }

    /**
     * Event handler for cancel reset button click
     */
    _onCancelResetClick() {
        this._hideResetModal();
    }

    /**
     * Event handler for modal click (outside area)
     */
    _onModalClick(e) {
        if (e.target === this.uiElements.get('confirmationModal')) {
            this._hideResetModal();
        }
    }

    /**
     * Event handler for input mode change
     */
    _onModeChange(e) {
        if (e.target.checked) {
            this.inputMode = e.target.value;
            this.logger.log(`Input mode switched to: ${this.inputMode.toUpperCase()}`, 'info', '⚙️');
        }
    }

    /**
     * Event handler for save button click
     */
    _onSaveClick() {
        this.commandProcessor.processCommand('/save');
    }

    /**
     * Event handler for load button click
     */
    _onLoadClick() {
        this.commandProcessor.processCommand('/load');
    }

    /**
     * Event handler for toggle sidebar button click
     */
    _onToggleSidebarClick() {
        this.toggleSidebar();
    }

    /**
     * Event handler for close sidebar button click
     */
    _onCloseSidebarClick() {
        this.toggleSidebar(false);
    }
}
