import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { LoadingState } from '../LoadingState';

describe('LoadingState', () => {
  it('should render default loading message', () => {
    render(<LoadingState />);

    expect(screen.getByText('Analyzing Data Quality')).toBeInTheDocument();
    expect(screen.getByText(/Generating comprehensive data profile/)).toBeInTheDocument();
  });

  it('should render custom loading message', () => {
    const customMessage = 'Processing data, please wait...';
    render(<LoadingState message={customMessage} />);

    expect(screen.getByText('Analyzing Data Quality')).toBeInTheDocument();
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('should show spinning icon', () => {
    const { container } = render(<LoadingState />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('animate-spin');
  });

  it('should have proper styling', () => {
    const { container } = render(<LoadingState />);

    const backdrop = container.firstChild;
    expect(backdrop).toHaveClass('fixed', 'inset-0', 'backdrop-blur-sm', 'z-50');

    // Find the inner modal div that has the white background
    const modal = screen.getByText('Analyzing Data Quality').closest('div')?.parentElement;
    expect(modal).toHaveClass('bg-white', 'rounded-lg', 'border', 'border-gray-300', 'p-8', 'max-w-md', 'w-full', 'mx-4');
  });
});