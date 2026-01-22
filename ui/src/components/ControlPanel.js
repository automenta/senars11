import { Component } from './Component.js';
import { Toolbar } from './ui/Toolbar.js';
import { Modal } from './ui/Modal.js';

export class ControlPanel extends Component {
    constructor(container, options = {}) {
        super(container);
        this.onControl = options.onControl ?? (() => {});
        this.isRunning = false;
        this.controls = {};
        this.stepSize = 1;
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = '';
        this.container.className = 'control-panel';

        // Toolbar Wrapper
        const toolbarWrapper = document.createElement('div');
        toolbarWrapper.className = 'control-panel-toolbar';

        const tb = new Toolbar(toolbarWrapper, { style: 'background: transparent; padding: 0;' });

        // Run/Pause
        this.controls.playPause = tb.addButton({
            label: '▶️ Run',
            onClick: () => this.onControl(this.isRunning ? 'stop' : 'start')
        });

        // Step Group
        const stepGroup = document.createElement('div');
        stepGroup.className = 'control-step-group';
        stepGroup.style.display = 'flex';
        stepGroup.style.alignItems = 'center';
        stepGroup.style.gap = '2px';

        const stepBtn = document.createElement('button');
        stepBtn.innerHTML = '⏭️ Step';
        stepBtn.onclick = () => this.onControl('step', { steps: this.stepSize });
        stepGroup.appendChild(stepBtn);
        this.controls.step = stepBtn;

        const stepInput = document.createElement('select');
        stepInput.className = 'control-step-input';
        [1, 10, 50, 100, 500].forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.text = val;
            stepInput.appendChild(opt);
        });
        stepInput.onchange = (e) => this.stepSize = parseInt(e.target.value, 10);
        stepGroup.appendChild(stepInput);

        tb.addCustom(stepGroup);

        // Reset
        this.controls.reset = tb.addButton({
            label: '🔄 Reset',
            onClick: () => Modal.confirm('Reset Memory?').then(yes => yes && this.onControl('reset'))
        });

        // Stats Display
        const statsGroup = document.createElement('div');
        statsGroup.className = 'control-stats-group';

        this.controls.cycles = document.createElement('span');
        this.controls.cycles.className = 'control-stat';
        this.controls.cycles.textContent = 'Cycles: 0';

        this.controls.rate = document.createElement('span');
        this.controls.rate.className = 'control-stat';
        this.controls.rate.textContent = 'Rate: 0/s';

        statsGroup.append(this.controls.cycles, this.controls.rate);

        // Add all to container
        this.container.appendChild(toolbarWrapper);
        this.container.appendChild(statsGroup);
    }

    updateState(isRunning) {
        this.isRunning = isRunning;
        if (this.controls.playPause) {
            this.controls.playPause.innerHTML = isRunning ? '⏸️ Pause' : '▶️ Run';
            this.controls.playPause.classList.toggle('active', isRunning);
        }
        if (this.controls.step) {
            this.controls.step.disabled = isRunning;
            this.controls.step.style.opacity = isRunning ? 0.5 : 1;
        }
    }

    updateStats(stats) {
        if (stats.cycles !== undefined) {
            this.controls.cycles.textContent = `Cycles: ${stats.cycles}`;
        }
        if (stats.rate !== undefined) {
             this.controls.rate.textContent = `Rate: ${stats.rate}/s`;
        }
    }
}
