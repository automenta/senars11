/**
 * DemoControls manages the UI controls for demo playback and execution
 */
export class DemoControls {
    constructor() {
        this._initializeElements();
        this.client = null;
        this.demoId = null;
        this.isRunning = false;

        this._bindMethods();
        this._setupListeners();
    }

    /**
     * Initialize DOM elements
     */
    _initializeElements() {
        this.btnPlayPause = document.getElementById('btn-play-pause');
        this.btnStep = document.getElementById('btn-step');
        this.btnReset = document.getElementById('btn-reset');

        // Modal elements
        this.confirmationModal = document.getElementById('confirmation-modal');
        this.btnConfirmReset = document.getElementById('btn-confirm-reset');
        this.btnCancelReset = document.getElementById('btn-cancel-reset');
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
    }

    _setupListeners() {
        if (this.btnPlayPause) {
            this.btnPlayPause.addEventListener('click', this._onPlayPauseClick);
        }

        if (this.btnStep) {
            this.btnStep.addEventListener('click', this._onStepClick);
        }

        if (this.btnReset) {
            this.btnReset.addEventListener('click', this._onResetClick);
        }

        if (this.btnConfirmReset) {
            this.btnConfirmReset.addEventListener('click', this._onConfirmResetClick);
        }

        if (this.btnCancelReset) {
            this.btnCancelReset.addEventListener('click', this._onCancelResetClick);
        }

        if (this.confirmationModal) {
            this.confirmationModal.addEventListener('click', this._onModalClick);
        }
    }

    setClient(client) {
        this.client = client;
    }

    setDemoId(id) {
        this.demoId = id;
        this.updateState('stopped');
    }

    updateState(state) {
        // State: running, paused, stopped, completed
        this.isRunning = (state === 'running');

        if (this.btnPlayPause) {
            this._updatePlayPauseButton();
        }

        if (this.btnStep) {
            this._updateStepButton();
        }

        if (state === 'stopped' || state === 'completed') {
            // Maybe disable play if completed, unless reset?
            // For now assume user can restart/resume
        }
    }

    /**
     * Update play/pause button based on current state
     */
    _updatePlayPauseButton() {
        this.btnPlayPause.disabled = false;
        // SVG Icons
        this.btnPlayPause.innerHTML = this.isRunning
            ? this._createPauseIcon()
            : this._createPlayIcon();
        this.btnPlayPause.title = this.isRunning ? 'Pause' : 'Resume';
        this.btnPlayPause.setAttribute('aria-label', this.isRunning ? 'Pause' : 'Resume');
    }

    /**
     * Update step button based on current state
     */
    _updateStepButton() {
        if (!this.btnStep.innerHTML.includes('<svg')) {
            this.btnStep.innerHTML = this._createStepIcon();
        }
        this.btnStep.disabled = this.isRunning;
        this.btnStep.style.opacity = this.isRunning ? '0.5' : '1';
        this.btnStep.title = 'Step';
        this.btnStep.setAttribute('aria-label', 'Step');
    }

    /**
     * Create pause icon SVG
     */
    _createPauseIcon() {
        return '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    }

    /**
     * Create play icon SVG
     */
    _createPlayIcon() {
        return '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    }

    /**
     * Create step icon SVG
     */
    _createStepIcon() {
        return '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>';
    }

    pause() {
        if (this.client && this.demoId) {
            this.client.wsManager.sendMessage('demoControl', {command: 'pause', demoId: this.demoId});
        }
    }

    resume() {
        if (this.client && this.demoId) {
            this.client.wsManager.sendMessage('demoControl', {command: 'resume', demoId: this.demoId});
        }
    }

    step() {
        if (this.client && this.demoId) {
            this.client.wsManager.sendMessage('demoControl', {command: 'step', demoId: this.demoId});
        }
    }

    reset() {
        // Logic to reset the demo. "Reset" usually means stop and clear.
        if (this.client && this.demoId) {
            this.client.stopDemo(this.demoId);
            // Maybe start it again? Or just leave it stopped.
            // "Reset" typically means "Start Over".
            // Let's stop it. The user can click Play to start.
        }
    }

    showResetModal() {
        if (this.confirmationModal) this.confirmationModal.classList.remove('hidden');
    }

    hideResetModal() {
        if (this.confirmationModal) this.confirmationModal.classList.add('hidden');
    }

    /**
     * Event handlers
     */
    _onPlayPauseClick() {
        if (this.isRunning) {
            this.pause();
        } else {
            this.resume();
        }
    }

    _onStepClick() {
        if (!this.isRunning) this.step();
    }

    _onResetClick() {
        this.showResetModal();
    }

    _onConfirmResetClick() {
        this.reset();
        this.hideResetModal();
    }

    _onCancelResetClick() {
        this.hideResetModal();
    }

    _onModalClick(e) {
        if (e.target === this.confirmationModal) this.hideResetModal();
    }
}
