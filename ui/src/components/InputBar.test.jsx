import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InputBar from './InputBar';
import { narService } from '../services/nar-service';

vi.mock('../services/nar-service');

describe('InputBar', () => {
  it('renders the input bar', () => {
    render(<InputBar />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls narService.sendNarseseInput with the input value when the send button is clicked', () => {
    render(<InputBar />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test input' } });
    fireEvent.click(screen.getByRole('button'));
    expect(narService.sendNarseseInput).toHaveBeenCalledWith('test input');
  });
});
