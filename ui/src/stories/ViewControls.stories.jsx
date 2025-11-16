import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import ViewControls from '../components/ViewControls';

export default {
  title: 'UI/ViewControls',
  component: ViewControls,
};

const Template = (args) => (
    <ReactFlowProvider>
        <ViewControls {...args} />
    </ReactFlowProvider>
);

export const Default = Template.bind({});
Default.args = {
  onUpdate: (query) => alert(`Updated with query: ${JSON.stringify(query)}`),
};
