import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { InputBar } from '../components/InputBar';

describe('InputBar', () => {
  it('calls onSend with the input value when the send button is clicked', () => {
    const onSend = vi.fn();
    render(<InputBar onSend={onSend} />);
    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.click(button);

    expect(onSend).toHaveBeenCalledWith('test message');
  });

  it('clears the input field after sending a message', () => {
    const onSend = vi.fn();
    render(<InputBar onSend={onSend} />);
    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.click(button);

    expect(input.value).toBe('');
  });

  it('does not call onSend if the input is empty', () => {
    const onSend = vi.fn();
    render(<InputBar onSend={onSend} />);
    const button = screen.getByRole('button');

    fireEvent.click(button);

    expect(onSend).not.toHaveBeenCalled();
  });
});
