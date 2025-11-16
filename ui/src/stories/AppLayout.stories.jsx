import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import AppLayout from '../components/AppLayout';

export default {
    title: 'UI/AppLayout',
    component: AppLayout,
};

const Template = (args) => (
    <ReactFlowProvider>
        <AppLayout {...args} />
    </ReactFlowProvider>
);

export const Default = Template.bind({});
Default.args = {};
