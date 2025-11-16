import { ViewControls } from './ViewControls';

export default {
  title: 'Components/ViewControls',
  component: ViewControls,
  tags: ['autodocs'],
};

export const Default = {
  args: {
    onRefresh: () => alert('Refresh'),
    onToggleLive: (checked) => alert(`Live update: ${checked}`),
  },
};
