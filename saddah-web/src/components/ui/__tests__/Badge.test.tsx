import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/testUtils';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders children correctly', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies default variant by default', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge).toHaveClass('bg-gray-100');
    expect(badge).toHaveClass('text-gray-800');
  });

  it('applies primary variant correctly', () => {
    render(<Badge variant="primary">Primary</Badge>);
    const badge = screen.getByText('Primary');
    expect(badge).toHaveClass('bg-primary-100');
    expect(badge).toHaveClass('text-primary-800');
  });

  it('applies success variant correctly', () => {
    render(<Badge variant="success">Success</Badge>);
    const badge = screen.getByText('Success');
    expect(badge).toHaveClass('bg-success-100');
    expect(badge).toHaveClass('text-success-800');
  });

  it('applies warning variant correctly', () => {
    render(<Badge variant="warning">Warning</Badge>);
    const badge = screen.getByText('Warning');
    expect(badge).toHaveClass('bg-warning-100');
    expect(badge).toHaveClass('text-warning-800');
  });

  it('applies error variant correctly', () => {
    render(<Badge variant="error">Error</Badge>);
    const badge = screen.getByText('Error');
    expect(badge).toHaveClass('bg-error-100');
    expect(badge).toHaveClass('text-error-800');
  });

  it('applies info variant correctly', () => {
    render(<Badge variant="info">Info</Badge>);
    const badge = screen.getByText('Info');
    expect(badge).toHaveClass('bg-blue-100');
    expect(badge).toHaveClass('text-blue-800');
  });

  it('applies custom className', () => {
    render(<Badge className="custom-class">Custom</Badge>);
    expect(screen.getByText('Custom')).toHaveClass('custom-class');
  });

  it('renders as a span element', () => {
    render(<Badge data-testid="badge">Badge</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge.tagName.toLowerCase()).toBe('span');
  });

  it('has rounded-full class for pill shape', () => {
    render(<Badge>Pill</Badge>);
    expect(screen.getByText('Pill')).toHaveClass('rounded-full');
  });

  it('has text-xs for small text', () => {
    render(<Badge>Small Text</Badge>);
    expect(screen.getByText('Small Text')).toHaveClass('text-xs');
  });

  it('passes through HTML attributes', () => {
    render(<Badge id="custom-id" title="Badge Title">Test</Badge>);
    const badge = screen.getByText('Test');
    expect(badge).toHaveAttribute('id', 'custom-id');
    expect(badge).toHaveAttribute('title', 'Badge Title');
  });
});
