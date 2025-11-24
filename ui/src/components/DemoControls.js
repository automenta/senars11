export class DemoControls {
    constructor() {
        this.btnPlayPause = document.getElementById('btn-play-pause');
        this.btnStep = document.getElementById('btn-step');
        this.btnReset = document.getElementById('btn-reset');

        // Modal
        this.confirmationModal = document.getElementById('confirmation-modal');
        this.btnConfirmReset = document.getElementById('btn-confirm-reset');
        this.btnCancelReset = document.getElementById('btn-cancel-reset');

        this.client = null;
        this.demoId = null;
        this.isRunning = false;

        this._setupListeners();
    }

    _setupListeners() {
        if (this.btnPlayPause) {
            this.btnPlayPause.addEventListener('click', () => {
                if (this.isRunning) {
                    this.pause();
                } else {
                    this.resume();
                }
            });
        }

        if (this.btnStep) {
            this.btnStep.addEventListener('click', () => {
                if (!this.isRunning) this.step();
            });
        }

        if (this.btnReset) {
            this.btnReset.addEventListener('click', () => this.showResetModal());
        }

        if (this.btnConfirmReset) {
            this.btnConfirmReset.addEventListener('click', () => {
                this.reset();
                this.hideResetModal();
            });
        }

        if (this.btnCancelReset) {
            this.btnCancelReset.addEventListener('click', () => this.hideResetModal());
        }

        if (this.confirmationModal) {
            this.confirmationModal.addEventListener('click', (e) => {
                if (e.target === this.confirmationModal) this.hideResetModal();
            });
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
            this.btnPlayPause.disabled = false;
            // SVG Icons
            this.btnPlayPause.innerHTML = this.isRunning
                ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
                : '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
            this.btnPlayPause.title = this.isRunning ? 'Pause' : 'Resume';
            this.btnPlayPause.setAttribute('aria-label', this.isRunning ? 'Pause' : 'Resume');
        }

        if (this.btnStep) {
            // SVG Icon for Step
            if (!this.btnStep.innerHTML.includes('<svg')) {
                 this.btnStep.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>';
            }
            this.btnStep.disabled = this.isRunning;
            this.btnStep.style.opacity = this.isRunning ? '0.5' : '1';
            this.btnStep.title = 'Step';
            this.btnStep.setAttribute('aria-label', 'Step');
        }

        if (state === 'stopped' || state === 'completed') {
             // Maybe disable play if completed, unless reset?
             // For now assume user can restart/resume
        }
    }

    pause() {
        if (this.client && this.demoId) {
            this.client.wsManager.sendMessage('demoControl', { command: 'pause', demoId: this.demoId });
        }
    }

    resume() {
         if (this.client && this.demoId) {
             this.client.wsManager.sendMessage('demoControl', { command: 'resume', demoId: this.demoId });
         }
    }

    step() {
         if (this.client && this.demoId) {
             this.client.wsManager.sendMessage('demoControl', { command: 'step', demoId: this.demoId });
         }
    }

    reset() {
         // Logic to reset the demo. "Reset" usually means stop and clear.
         // We'll send a stop command and maybe clear the console.
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
}
