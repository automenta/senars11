import React from 'react';
import { ViewControls } from '../components/ViewControls';

export default {
  title: 'UI/ViewControls',
  component: ViewControls,
};

const Template = (args) => <ViewControls {...args} />;

export const Default = Template.bind({});
Default.args = {
  onUpdate: (query) => alert(`Updated with query: ${JSON.stringify(query)}`),
};
