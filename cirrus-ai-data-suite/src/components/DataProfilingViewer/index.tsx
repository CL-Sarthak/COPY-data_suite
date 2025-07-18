'use client';

import React from 'react';
import { DataProfilingViewerProps } from './types';
import { useDataProfiling } from './useDataProfiling';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { ProfileHeader } from './ProfileHeader';
import { QualitySummary } from './QualitySummary';
import { QualityIssues } from './QualityIssues';
import { FieldAnalysis } from './FieldAnalysis';
import { Recommendations } from './Recommendations';
import { FieldDetailSidebar } from './FieldDetailSidebar';

export default function DataProfilingViewer({ sourceId, onClose }: DataProfilingViewerProps) {
  const {
    state,
    loadProfile,
    regenerateProfile,
    toggleSection,
    setSelectedField,
    setSearchTerm,
    setQualityFilter
  } = useDataProfiling(sourceId);

  if (state.loading) {
    return <LoadingState />;
  }

  if (state.error) {
    return (
      <ErrorState
        error={state.error}
        onRetry={loadProfile}
        onClose={onClose}
      />
    );
  }

  if (!state.profile) {
    return null;
  }

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl border-2 border-gray-600 max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <ProfileHeader
          profile={state.profile}
          onRefresh={regenerateProfile}
          onClose={onClose}
        />

        <div className="flex-1 overflow-hidden flex">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <QualitySummary
              profile={state.profile}
              expanded={state.expandedSections.has('summary')}
              onToggle={() => toggleSection('summary')}
            />

            <QualityIssues
              profile={state.profile}
              expanded={state.expandedSections.has('quality')}
              onToggle={() => toggleSection('quality')}
            />

            <FieldAnalysis
              profile={state.profile}
              expanded={state.expandedSections.has('fields')}
              onToggle={() => toggleSection('fields')}
              selectedField={state.selectedField}
              searchTerm={state.searchTerm}
              qualityFilter={state.qualityFilter}
              onFieldSelect={setSelectedField}
              onSearchChange={setSearchTerm}
              onQualityFilterChange={setQualityFilter}
            />

            <Recommendations
              recommendations={state.profile.summary.recommendedActions}
            />
          </div>

          {/* Field Detail Sidebar */}
          {state.selectedField && (
            <FieldDetailSidebar 
              field={state.profile.fields.find(f => f.name === state.selectedField)!}
              onClose={() => setSelectedField(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export { DataProfilingViewer };