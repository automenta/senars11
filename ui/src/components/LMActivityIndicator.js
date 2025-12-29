export class LMActivityIndicator {
    constructor(containerElement) {
        this.container = containerElement;
        this.overlay = null;
        this.isActive = false;
        this._createOverlay();
    }

    get active() {
        return this.isActive;
    }

    _createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'lm-activity-overlay hidden';
        this.overlay.innerHTML = `
            <div class="lm-spinner-container">
                <div class="lm-spinner"></div>
                <div class="lm-status-text">LM Processing...</div>
            </div>
            <div class="lm-error-container hidden">
                <div class="lm-error-icon">⚠️</div>
                <div class="lm-error-text">LM Error</div>
            </div>
        `;
        this.container?.appendChild(this.overlay);
    }

    show() {
        if (!this.overlay) return;
        this.isActive = true;
        this._toggleView('lm-spinner-container', true);
    }

    hide() {
        if (!this.overlay) return;
        this.isActive = false;
        this.overlay.classList.add('hidden');
    }

    showError(errorMessage = 'LM Error') {
        if (!this.overlay) return;
        this.isActive = true;
        this._toggleView('lm-error-container', false);
        this.overlay.querySelector('.lm-error-text').textContent = errorMessage;

        setTimeout(() => this.hide(), 3000);
    }

    _toggleView(containerClass, isSpinner) {
        this.overlay.classList.remove('hidden');
        const spinnerContainer = this.overlay.querySelector('.lm-spinner-container');
        const errorContainer = this.overlay.querySelector('.lm-error-container');

        if (isSpinner) {
            spinnerContainer.classList.remove('hidden');
            errorContainer.classList.add('hidden');
        } else {
            spinnerContainer.classList.add('hidden');
            errorContainer.classList.remove('hidden');
        }
    }

    destroy() {
        this.overlay?.parentNode?.removeChild(this.overlay);
        this.overlay = null;
    }
}
