import React from 'react';
import ControlBar from '../components/ControlBar';

export default {
  title: 'UI/ControlBar',
  component: ControlBar,
};

const Template = (args) => <ControlBar {...args} />;

export const Default = Template.bind({});
Default.args = {
  onReset: () => alert('Reset'),
  onStep: () => alert('Step'),
  onStart: () => alert('Start'),
  onStop: () => alert('Stop'),
};

export const Minimal = Template.bind({});
Minimal.args = {
  onStart: () => alert('Start'),
  onStop: () => alert('Stop'),
};
