export class DemoControls {
    constructor() {
        this.btnPlay = document.getElementById('btn-play');
        this.btnPause = document.getElementById('btn-pause');
        this.btnStep = document.getElementById('btn-step');

        this.client = null;
        this.demoId = null;

        if (this.btnPlay) this.btnPlay.addEventListener('click', () => this.resume());
        if (this.btnPause) this.btnPause.addEventListener('click', () => this.pause());
        if (this.btnStep) this.btnStep.addEventListener('click', () => this.step());
    }

    setClient(client) {
        this.client = client;
    }

    setDemoId(id) {
        this.demoId = id;
        // Reset state on new demo
        this.updateState('stopped');
    }

    updateState(state) {
        // State: running, paused, stopped, completed
        if (state === 'running') {
            this.show(this.btnPause);
            this.hide(this.btnPlay);
            this.hide(this.btnStep);
        } else if (state === 'paused') {
            this.hide(this.btnPause);
            this.show(this.btnPlay);
            this.show(this.btnStep);
        } else {
            this.hide(this.btnPause);
            this.hide(this.btnPlay);
            this.hide(this.btnStep);
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

    show(el) { if (el) el.classList.remove('hidden'); }
    hide(el) { if (el) el.classList.add('hidden'); }
}
