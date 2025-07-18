import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AnalyzeStep } from '../components/steps/AnalyzeStep';

describe('AnalyzeStep', () => {
  const mockOnAnalyze = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render initial state', () => {
    render(
      <AnalyzeStep
        analyzing={false}
        onAnalyze={mockOnAnalyze}
      />
    );

    expect(screen.getByRole('heading', { name: 'Analyze Dataset' })).toBeInTheDocument();
    expect(screen.getByText(/analyze your dataset to identify missing fields/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyze Dataset' })).toBeInTheDocument();
  });

  it('should show analyzing state', () => {
    render(
      <AnalyzeStep
        analyzing={true}
        onAnalyze={mockOnAnalyze}
      />
    );

    expect(screen.getByText('Analyzing Dataset...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyzing Dataset...' })).toBeDisabled();
  });

  it('should call onAnalyze when button is clicked', () => {
    render(
      <AnalyzeStep
        analyzing={false}
        onAnalyze={mockOnAnalyze}
      />
    );

    const button = screen.getByRole('button', { name: 'Analyze Dataset' });
    fireEvent.click(button);

    expect(mockOnAnalyze).toHaveBeenCalledTimes(1);
  });

  it('should disable button when analyzing', () => {
    render(
      <AnalyzeStep
        analyzing={true}
        onAnalyze={mockOnAnalyze}
      />
    );

    const button = screen.getByRole('button', { name: 'Analyzing Dataset...' });
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(mockOnAnalyze).not.toHaveBeenCalled();
  });

  it('should render sparkles icon', () => {
    render(
      <AnalyzeStep
        analyzing={false}
        onAnalyze={mockOnAnalyze}
      />
    );

    // The component uses SparklesIcon from heroicons
    const svgIcon = document.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
  });

  it('should show analysis description', () => {
    render(
      <AnalyzeStep
        analyzing={false}
        onAnalyze={mockOnAnalyze}
      />
    );

    const description = screen.getByText(/analyze your dataset to identify missing fields/);
    expect(description).toBeInTheDocument();
    expect(description).toHaveTextContent('expected in similar datasets');
  });
});