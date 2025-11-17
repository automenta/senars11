import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ControlBar from './ControlBar';

describe('ControlBar', () => {
  it('calls the correct functions when buttons are clicked', () => {
    const onReset = vi.fn();
    const onStep = vi.fn();
    const onStart = vi.fn();
    const onStop = vi.fn();

    render(
      <ControlBar
        onReset={onReset}
        onStep={onStep}
        onStart={onStart}
        onStop={onStop}
      />
    );

    fireEvent.click(screen.getByText('Reset'));
    expect(onReset).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Step'));
    expect(onStep).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Start'));
    expect(onStart).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Stop'));
    expect(onStop).toHaveBeenCalled();
  });

  it('only renders the buttons for the provided functions', () => {
    const { container } = render(<ControlBar onStart={() => {}} onStop={() => {}} />);
    expect(screen.queryByText('Reset')).toBeNull();
    expect(screen.queryByText('Step')).toBeNull();
    expect(container.querySelectorAll('button').length).toBe(2);
  });
});
