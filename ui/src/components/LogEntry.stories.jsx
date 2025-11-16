import { LogEntry } from './LogEntry';

export default {
  title: 'Components/LogEntry',
  component: LogEntry,
  tags: ['autodocs'],
};

export const Info = {
  args: {
    entry: {
      timestamp: '2025-11-16 10:37:00',
      type: 'info',
      message: 'This is an info message.',
    },
  },
};

export const Error = {
  args: {
    entry: {
      timestamp: '2025-11-16 10:37:00',
      type: 'error',
      message: 'This is an error message.',
    },
  },
};

export const Warn = {
    args: {
      entry: {
        timestamp: '2025-11-16 10:37:00',
        type: 'warn',
        message: 'This is a warning message.',
      },
    },
  };
