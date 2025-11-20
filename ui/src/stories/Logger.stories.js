import {Logger} from '../logging/Logger.js';
import {UI_CONSTANTS} from '../utils/Constants.js';

export default {
    title: 'Components/Logger',
    tags: ['autodocs'],
    render: () => {
        const container = document.createElement('div');
        container.style.padding = '20px';
        container.style.backgroundColor = '#1e1e1e';
        container.style.color = '#fff';
        container.style.height = '400px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';

        const logsContainer = document.createElement('div');
        logsContainer.id = 'logs-container';
        logsContainer.className = 'logs-container';
        logsContainer.style.flex = '1';
        logsContainer.style.overflowY = 'auto';
        logsContainer.style.fontFamily = 'monospace';

        container.appendChild(logsContainer);

        // Mock UIElements
        const mockUIElements = {
            logsContainer: logsContainer
        };

        const logger = new Logger(mockUIElements);

        // Add example logs
        logger.log('System initialized', 'info', '🚀');
        logger.log('Connected to backend', 'success', '✅');
        logger.log('<bird --> flyer>.', 'input', '⌨️');
        logger.log('Inference: <bird --> animal>.', 'reasoning', '⚙️');
        logger.log('Error connecting to LM', 'error', '❌');
        logger.log('Warning: Memory pressure high', 'warning', '⚠️');

        return container;
    }
};

export const Default = {};
