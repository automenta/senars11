import React from 'react';
import { LogPanel } from '../components/LogPanel';

export default {
  title: 'UI/LogPanel',
  component: LogPanel,
};

const Template = (args) => <LogPanel {...args} />;

export const Default = Template.bind({});
Default.args = {
  entries: ['Log message 1', 'Log message 2', 'Log message 3'],
};

export const Empty = Template.bind({});
Empty.args = {
  entries: [],
};

export const ManyEntries = Template.bind({});
ManyEntries.args = {
  entries: Array.from({ length: 100 }, (_, i) => `Log message ${i + 1}`),
};
