import { GraphPanel } from './GraphPanel';

export default {
    title: 'Components/GraphPanel',
    component: GraphPanel,
    tags: ['autodocs'],
    };

const nodes = [
    { id: '1', position: { x: 0, y: 0 }, data: { label: 'Hello' } },
    { id: '2', position: { x: 100, y: 100 }, data: { label: 'World' } },
];

const edges = [{ id: 'e1-2', source: '1', target: '2' }];

export const Default = {
    args: {
        nodes: nodes,
        edges: edges,
    },
};

export const Empty = {
    args: {
        nodes: [],
        edges: [],
    },
};
