import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import { QualitySummary } from '../QualitySummary';
import { DataProfile } from '@/services/dataProfilingService';

describe('QualitySummary', () => {
  const mockOnToggle = jest.fn();
  
  const mockProfile: DataProfile = {
    id: 'profile-1',
    sourceId: 'source-1',
    sourceName: 'Test Source',
    recordCount: 1000,
    fieldCount: 10,
    qualityMetrics: {
      overallScore: 0.85,
      completeness: 0.9,
      consistency: 0.8,
      validity: 0.85,
      uniqueness: 0.9,
      totalIssues: 5,
      criticalIssues: 1,
      issues: []
    },
    fields: [],
    crossFieldRelationships: [],
    summary: {
      highlightedIssues: [],
      recommendedActions: []
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render collapsed state', () => {
    render(
      <QualitySummary
        profile={mockProfile}
        expanded={false}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('Overall Quality Summary')).toBeInTheDocument();
    expect(screen.getByText('85% • Good')).toBeInTheDocument();
    
    // Metrics should not be visible when collapsed
    expect(screen.queryByText('Completeness')).not.toBeInTheDocument();
  });

  it('should render expanded state with all metrics', () => {
    render(
      <QualitySummary
        profile={mockProfile}
        expanded={true}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('Overall Quality Summary')).toBeInTheDocument();
    expect(screen.getByText('85% • Good')).toBeInTheDocument();
    
    // All metrics should be visible
    expect(screen.getByText('Completeness')).toBeInTheDocument();
    expect(screen.getAllByText('90%')).toHaveLength(2); // Completeness and Uniqueness
    
    expect(screen.getByText('Consistency')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    
    expect(screen.getByText('Validity')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    
    expect(screen.getByText('Uniqueness')).toBeInTheDocument();
  });

  it('should call onToggle when clicked', () => {
    render(
      <QualitySummary
        profile={mockProfile}
        expanded={false}
        onToggle={mockOnToggle}
      />
    );

    const toggleArea = screen.getByText('Overall Quality Summary').parentElement;
    fireEvent.click(toggleArea!);

    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it('should show correct quality label and color for excellent score', () => {
    const excellentProfile = {
      ...mockProfile,
      qualityMetrics: {
        ...mockProfile.qualityMetrics,
        overallScore: 0.95
      }
    };

    render(
      <QualitySummary
        profile={excellentProfile}
        expanded={false}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('95% • Excellent')).toBeInTheDocument();
    const badge = screen.getByText('95% • Excellent');
    expect(badge).toHaveClass('text-green-600', 'bg-green-100');
  });

  it('should show correct quality label and color for poor score', () => {
    const poorProfile = {
      ...mockProfile,
      qualityMetrics: {
        ...mockProfile.qualityMetrics,
        overallScore: 0.4
      }
    };

    render(
      <QualitySummary
        profile={poorProfile}
        expanded={false}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('40% • Poor')).toBeInTheDocument();
    const badge = screen.getByText('40% • Poor');
    expect(badge).toHaveClass('text-red-600', 'bg-red-100');
  });

  it('should show chevron icon based on expanded state', () => {
    const { rerender, container } = render(
      <QualitySummary
        profile={mockProfile}
        expanded={false}
        onToggle={mockOnToggle}
      />
    );

    // Check for right chevron when collapsed
    let icon = container.querySelector('svg');
    expect(icon).toHaveClass('h-5', 'w-5');

    // Rerender with expanded state
    rerender(
      <QualitySummary
        profile={mockProfile}
        expanded={true}
        onToggle={mockOnToggle}
      />
    );

    // Check for down chevron when expanded
    icon = container.querySelector('svg');
    expect(icon).toHaveClass('h-5', 'w-5');
  });
});