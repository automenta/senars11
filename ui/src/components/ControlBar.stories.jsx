import { ControlBar } from './ControlBar';

export default {
  title: 'Components/ControlBar',
  component: ControlBar,
  tags: ['autodocs'],
};

export const Default = {
  args: {
    onReset: () => alert('Reset'),
    onStep: () => alert('Step'),
    onRun: () => alert('Run'),
    onStop: () => alert('Stop'),
  },
};
