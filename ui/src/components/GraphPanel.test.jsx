import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ReactFlowProvider } from 'reactflow';
import GraphPanel from './GraphPanel';

describe('GraphPanel', () => {
  it('renders a graph with nodes and edges', () => {
    const nodes = [{ id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } }];
    const edges = [];
    render(
      <ReactFlowProvider>
        <GraphPanel nodes={nodes} edges={edges} />
      </ReactFlowProvider>
    );
    expect(screen.getByText('Node 1')).toBeInTheDocument();
  });
});
