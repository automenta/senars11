import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { ControlPanel } from '../../../src/components/ControlPanel.js';

describe('ControlPanel', () => {
    let container;
    let controlPanel;
    let onControlMock;

    beforeEach(() => {
        container = document.createElement('div');
        onControlMock = jest.fn();
        controlPanel = new ControlPanel(container, { onControl: onControlMock });
    });

    test('should render correctly', () => {
        controlPanel.render();
        expect(container.className).toContain('control-panel');
        expect(container.querySelectorAll('button').length).toBeGreaterThan(0);
    });

    test('should trigger play/pause callback', () => {
        controlPanel.render();
        const playBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Run'));
        playBtn.click();
        expect(onControlMock).toHaveBeenCalledWith('start');

        controlPanel.updateState(true); // isRunning = true
        playBtn.click();
        expect(onControlMock).toHaveBeenCalledWith('stop');
    });

    test('should trigger step callback with step size', () => {
        controlPanel.render();
        const stepBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Step'));
        stepBtn.click();
        expect(onControlMock).toHaveBeenCalledWith('step', { steps: 1 });

        // Change step size
        const select = container.querySelector('select');
        select.value = '10';
        select.dispatchEvent(new Event('change'));

        stepBtn.click();
        expect(onControlMock).toHaveBeenCalledWith('step', { steps: 10 });
    });

    test('should update stats', () => {
        controlPanel.render();
        controlPanel.updateStats({ cycles: 100, rate: 50 });
        expect(container.textContent).toContain('Cycles: 100');
        expect(container.textContent).toContain('Rate: 50/s');
    });
});
