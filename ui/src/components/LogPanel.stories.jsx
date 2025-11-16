import { LogPanel } from './LogPanel';

export default {
    title: 'Components/LogPanel',
    component: LogPanel,
    tags: ['autodocs'],
    };

const entries = [
    {
        timestamp: '2025-11-16 10:38:00',
        type: 'info',
        message: 'This is an info message.',
    },
    {
        timestamp: '2025-11-16 10:38:01',
        type: 'error',
        message: 'This is an error message.',
    },
    {
        timestamp: '2025-11-16 10:38:02',
        type: 'warn',
        message: 'This is a warning message.',
    },
];

export const Default = {
    args: {
        entries: entries,
    },
};

export const Empty = {
    args: {
        entries: [],
    },
};
