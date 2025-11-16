import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ViewControls } from '../components/ViewControls';

describe('ViewControls', () => {
  it('calls onUpdate with the current values when the update button is clicked', () => {
    const onUpdate = vi.fn();
    render(<ViewControls onUpdate={onUpdate} />);

    const conceptInput = screen.getByPlaceholderText('Concept');
    const limitInput = screen.getByPlaceholderText('Limit');
    const button = screen.getByRole('button');

    fireEvent.change(conceptInput, { target: { value: 'test' } });
    fireEvent.change(limitInput, { target: { value: '50' } });
    fireEvent.click(button);

    expect(onUpdate).toHaveBeenCalledWith({ concept: 'test', limit: 50 });
  });
});
