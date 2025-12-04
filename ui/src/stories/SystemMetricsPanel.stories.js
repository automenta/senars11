import {SystemMetricsPanel} from '../components/SystemMetricsPanel.js';

export default {
    title: 'Components/SystemMetricsPanel',
    tags: ['autodocs'],
    render: (args) => {
        const container = document.createElement('div');
        container.style.width = '300px';
        container.style.backgroundColor = '#252526';
        container.style.padding = '10px';

        const panel = new SystemMetricsPanel(container);
        panel.update(args.metrics);

        return container;
    },
    argTypes: {
        metrics: { control: 'object' }
    }
};

export const Default = {
    args: {
        metrics: {
            performance: { throughput: 120.5, avgLatency: 8.2 },
            resourceUsage: { heapUsed: 50 * 1024 * 1024, heapTotal: 100 * 1024 * 1024 },
            taskProcessing: { totalProcessed: 1000, successful: 950 },
            reasoningSteps: 5000,
            uptime: 3600000
        }
    }
};

export const HighLoad = {
    args: {
        metrics: {
            performance: { throughput: 5.5, avgLatency: 500.2 },
            resourceUsage: { heapUsed: 190 * 1024 * 1024, heapTotal: 200 * 1024 * 1024 }, // 95%
            taskProcessing: { totalProcessed: 1000, successful: 800 },
            reasoningSteps: 5000,
            uptime: 3600000
        }
    }
};
