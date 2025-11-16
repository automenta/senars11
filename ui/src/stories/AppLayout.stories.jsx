import React from 'react';
import { AppLayout } from '../components/AppLayout';

export default {
  title: 'UI/AppLayout',
  component: AppLayout,
};

const Template = (args) => <AppLayout {...args} />;

export const Default = Template.bind({});
Default.args = {};
