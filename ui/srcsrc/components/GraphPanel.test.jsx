import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GraphPanel } from '../components/GraphPanel';

describe('GraphPanel', () => {
  it('renders a graph with nodes and edges', () => {
    const nodes = [
      { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
      { id: '2', position: { x: 100, y: 100 }, data: { label: 'Node 2' } },
    ];
    const edges = [{ id: 'e1-2', source: '1', target: '2' }];

    render(<GraphPanel nodes={nodes} edges={edges} />);
    expect(screen.getByText('Node 1')).toBeInTheDocument();
    expect(screen.getByText('Node 2')).toBeInTheDocument();
  });
});
