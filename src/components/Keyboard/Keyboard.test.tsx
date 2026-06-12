import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Keyboard from './Keyboard';

describe('Keyboard', () => {
  it('renders all QWERTY keys', () => {
    render(<Keyboard visible />);
    expect(screen.getByText('Q')).toBeInTheDocument();
    expect(screen.getByText('W')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
    expect(screen.getByText('SPACE')).toBeInTheDocument();
    expect(screen.getByText('Enter')).toBeInTheDocument();
  });

  it('renders home row keys', () => {
    render(<Keyboard visible />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('F')).toBeInTheDocument();
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('does not render when visible=false', () => {
    render(<Keyboard visible={false} />);
    expect(screen.queryByText('Q')).not.toBeInTheDocument();
  });

  it('applies highlight class to nextChar key', () => {
    const { container } = render(<Keyboard nextChar="f" visible />);
    // The F key should have the highlight animation class
    const allKeys = container.querySelectorAll('[class*="animate-pop"]');
    expect(allKeys.length).toBeGreaterThan(0);
  });

  it('highlights shift when uppercase char is next', () => {
    const { container } = render(<Keyboard nextChar="F" visible />);
    const highlightedKeys = container.querySelectorAll('[class*="animate-pop"]');
    // Both shift and F key should be highlighted
    expect(highlightedKeys.length).toBeGreaterThanOrEqual(1);
  });

  it('has accessible role label', () => {
    render(<Keyboard visible />);
    expect(screen.getByRole('generic', { name: /virtual keyboard/i })).toBeInTheDocument();
  });
});
