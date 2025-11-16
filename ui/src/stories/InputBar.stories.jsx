import React from 'react';
import InputBar from '../components/InputBar';

export default {
  title: 'UI/InputBar',
  component: InputBar,
};

const Template = (args) => <InputBar {...args} />;

export const Default = Template.bind({});
Default.args = {
  onSend: (value) => alert(`Sent: ${value}`),
  placeholder: 'Type a message...',
};
