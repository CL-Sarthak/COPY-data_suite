import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import { ErrorState } from '../ErrorState';

describe('ErrorState', () => {
  const mockOnRetry = jest.fn();
  const mockOnClose = jest.fn();
  const errorMessage = 'Failed to load profile data';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render error message', () => {
    render(
      <ErrorState
        error={errorMessage}
        onRetry={mockOnRetry}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Error Loading Profile')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should call onRetry when Retry button is clicked', () => {
    render(
      <ErrorState
        error={errorMessage}
        onRetry={mockOnRetry}
        onClose={mockOnClose}
      />
    );

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should call onClose when Close button is clicked', () => {
    render(
      <ErrorState
        error={errorMessage}
        onRetry={mockOnRetry}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnRetry).not.toHaveBeenCalled();
  });

  it('should show error icon', () => {
    const { container } = render(
      <ErrorState
        error={errorMessage}
        onRetry={mockOnRetry}
        onClose={mockOnClose}
      />
    );

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-red-500');
  });

  it('should have proper button styling', () => {
    render(
      <ErrorState
        error={errorMessage}
        onRetry={mockOnRetry}
        onClose={mockOnClose}
      />
    );

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    expect(retryButton).toHaveClass('bg-blue-600', 'text-white');

    const closeButton = screen.getByRole('button', { name: 'Close' });
    expect(closeButton).toHaveClass('bg-gray-300', 'text-gray-700');
  });
});