import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/testUtils';
import { ErrorFallback } from '../ErrorFallback';

// Mock window.location
const mockReload = vi.fn();
const mockHref = vi.fn();

Object.defineProperty(window, 'location', {
  value: {
    reload: mockReload,
    get href() {
      return '/';
    },
    set href(value: string) {
      mockHref(value);
    },
  },
  writable: true,
});

describe('ErrorFallback', () => {
  beforeEach(() => {
    mockReload.mockClear();
    mockHref.mockClear();
  });

  it('renders default error message', () => {
    render(<ErrorFallback error={null} />);
    expect(screen.getByText(/حدث خطأ غير متوقع/i)).toBeInTheDocument();
  });

  it('renders custom title when provided', () => {
    render(<ErrorFallback error={null} title="Custom Error" />);
    expect(screen.getByText('Custom Error')).toBeInTheDocument();
  });

  it('renders custom message when provided', () => {
    render(<ErrorFallback error={null} message="Custom message" />);
    expect(screen.getByText('Custom message')).toBeInTheDocument();
  });

  it('renders try again button', () => {
    render(<ErrorFallback error={null} />);
    expect(screen.getByText(/حاول مرة أخرى/i)).toBeInTheDocument();
  });

  it('renders go home button', () => {
    render(<ErrorFallback error={null} />);
    expect(screen.getByText(/العودة للرئيسية/i)).toBeInTheDocument();
  });

  it('calls onReset when try again is clicked', () => {
    const handleReset = vi.fn();
    render(<ErrorFallback error={null} onReset={handleReset} />);

    fireEvent.click(screen.getByText(/حاول مرة أخرى/i));
    expect(handleReset).toHaveBeenCalled();
  });

  it('reloads page when try again clicked and no onReset provided', () => {
    render(<ErrorFallback error={null} />);

    fireEvent.click(screen.getByText(/حاول مرة أخرى/i));
    expect(mockReload).toHaveBeenCalled();
  });

  it('navigates home when go home is clicked', () => {
    render(<ErrorFallback error={null} />);

    fireEvent.click(screen.getByText(/العودة للرئيسية/i));
    expect(mockHref).toHaveBeenCalledWith('/');
  });

  it('does not show technical details by default', () => {
    const error = new Error('Test error');
    render(<ErrorFallback error={error} />);
    expect(screen.queryByText(/التفاصيل التقنية/i)).not.toBeInTheDocument();
  });

  it('shows technical details button when showDetails is true', () => {
    const error = new Error('Test error');
    render(<ErrorFallback error={error} showDetails={true} />);
    expect(screen.getByText(/التفاصيل التقنية/i)).toBeInTheDocument();
  });

  it('expands technical details when clicked', () => {
    const error = new Error('Test error message');
    render(<ErrorFallback error={error} showDetails={true} />);

    fireEvent.click(screen.getByText(/التفاصيل التقنية/i));
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('shows error name in technical details', () => {
    const error = new Error('Test error');
    error.name = 'CustomError';
    render(<ErrorFallback error={error} showDetails={true} />);

    fireEvent.click(screen.getByText(/التفاصيل التقنية/i));
    expect(screen.getByText('CustomError')).toBeInTheDocument();
  });

  it('shows stack trace when available', () => {
    const error = new Error('Test error');
    error.stack = 'Error: Test error\n    at test.js:1:1';
    render(<ErrorFallback error={error} showDetails={true} />);

    fireEvent.click(screen.getByText(/التفاصيل التقنية/i));
    expect(screen.getByText(/at test.js/)).toBeInTheDocument();
  });
});
