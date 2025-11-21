import {Config} from '../config/Config.js';

export class ControlPanel {
    constructor(uiElements, commandProcessor, logger) {
        this.uiElements = uiElements;
        this.commandProcessor = commandProcessor;
        this.logger = logger;
        this.inputMode = 'narsese'; // Default

        this.initialize();
    }

    initialize() {
        this._setupToolbar();
        this._setupInputMode();
        this._setupSaveLoad();
    }

    _setupToolbar() {
        const {btnStart, btnStop, btnStep, btnReset} = this.uiElements.getAll();

        if (btnStart) {
            btnStart.addEventListener('click', () => {
                this.commandProcessor.executeControlCommand('control/start');
                this.logger.log('System started', 'info', '▶️');
            });
        }

        if (btnStop) {
            btnStop.addEventListener('click', () => {
                this.commandProcessor.executeControlCommand('control/stop');
                this.logger.log('System stopped', 'info', '⏹️');
            });
        }

        if (btnStep) {
            btnStep.addEventListener('click', () => {
                this.commandProcessor.executeControlCommand('control/step');
            });
        }

        if (btnReset) {
            btnReset.addEventListener('click', () => {
                this.commandProcessor.executeControlCommand('control/reset');
                this.logger.log('System reset', 'warning', '🔄');
            });
        }
    }

    _setupInputMode() {
        const {inputModeNarsese, inputModeAgent} = this.uiElements.getAll();

        const handleModeChange = (e) => {
            if (e.target.checked) {
                this.inputMode = e.target.value;
                this.logger.log(`Input mode switched to: ${this.inputMode.toUpperCase()}`, 'info', '⚙️');
            }
        };

        if (inputModeNarsese) inputModeNarsese.addEventListener('change', handleModeChange);
        if (inputModeAgent) inputModeAgent.addEventListener('change', handleModeChange);
    }

    _setupSaveLoad() {
        const {btnSave, btnLoad} = this.uiElements.getAll();

        if (btnSave) btnSave.addEventListener('click', () => this.commandProcessor.processCommand('/save'));
        if (btnLoad) btnLoad.addEventListener('click', () => this.commandProcessor.processCommand('/load'));
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
}
