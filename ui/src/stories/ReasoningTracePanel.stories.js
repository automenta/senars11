import {ReasoningTracePanel} from '../components/ReasoningTracePanel.js';

export default {
    title: 'Components/ReasoningTracePanel',
    tags: ['autodocs'],
    render: (args) => {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '400px';
        container.style.backgroundColor = '#1e1e1e';
        container.className = 'trace-container';

        const panel = new ReasoningTracePanel(container);
        args.traces.forEach(t => panel.addTrace(t));

        return container;
    }
};

const mockTask = (term, freq, conf) => ({
    term: term,
    truth: {frequency: freq, confidence: conf}
});

export const Default = {
    args: {
        traces: [
            {derivedTask: mockTask('<a --> b>.', 1.0, 0.9), source: 'Input', timestamp: Date.now() - 1000},
            {derivedTask: mockTask('<b --> c>.', 1.0, 0.9), source: 'Input', timestamp: Date.now() - 800},
            {derivedTask: mockTask('<a --> c>.', 1.0, 0.81), source: 'Deduction', timestamp: Date.now() - 500},
            {
                derivedTask: {term: '<complex_term>', truth: {frequency: 0.5, confidence: 0.5}},
                source: 'Abduction',
                timestamp: Date.now()
            }
        ]
    }
};
