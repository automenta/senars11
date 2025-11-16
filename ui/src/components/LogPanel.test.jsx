import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LogPanel } from '../components/LogPanel';

describe('LogPanel', () => {
  it('renders a list of log entries', () => {
    const entries = ['message 1', 'message 2'];
    render(<LogPanel entries={entries} />);
    expect(screen.getByText('message 1')).toBeInTheDocument();
    expect(screen.getByText('message 2')).toBeInTheDocument();
  });

  it('renders nothing when there are no entries', () => {
    const { container } = render(<LogPanel entries={[]} />);
    expect(container.querySelector('.log-entry')).toBeNull();
  });
});
