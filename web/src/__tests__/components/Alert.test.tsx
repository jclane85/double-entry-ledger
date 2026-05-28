import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Alert } from '../../components/Alert';

describe('Alert', () => {
  it('renders the message text', () => {
    render(<Alert message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('defaults to info styling when no type provided', () => {
    const { container } = render(<Alert message="Info message" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.background).toBe('#e6f7ff');
  });

  it('applies error styling for type="error"', () => {
    const { container } = render(<Alert message="Error!" type="error" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.background).toBe('#fff1f0');
    expect(el.style.color).toBe('#a8071a');
  });

  it('applies success styling for type="success"', () => {
    const { container } = render(<Alert message="Saved!" type="success" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.background).toBe('#f6ffed');
    expect(el.style.color).toBe('#237804');
  });

  it('applies warning styling for type="warning"', () => {
    const { container } = render(<Alert message="Check this" type="warning" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.background).toBe('#fffbe6');
    expect(el.style.color).toBe('#876800');
  });

  it('applies info styling for type="info"', () => {
    const { container } = render(<Alert message="FYI" type="info" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.background).toBe('#e6f7ff');
  });
});
