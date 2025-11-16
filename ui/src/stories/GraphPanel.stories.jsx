import React from 'react';
import GraphPanel from '../components/GraphPanel';

export default {
  title: 'UI/GraphPanel',
  component: GraphPanel,
};

const Template = (args) => <GraphPanel {...args} />;

export const Empty = Template.bind({});
Empty.args = {
  nodes: [],
  edges: [],
};

export const Simple = Template.bind({});
Simple.args = {
  nodes: [
    { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
    { id: '2', position: { x: 100, y: 100 }, data: { label: 'Node 2' } },
  ],
  edges: [{ id: 'e1-2', source: '1', target: '2' }],
};
