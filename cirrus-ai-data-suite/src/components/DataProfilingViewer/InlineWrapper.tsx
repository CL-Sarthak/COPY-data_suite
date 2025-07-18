'use client';

import React from 'react';
import { useDataProfiling } from './useDataProfiling';
import { QualitySummary } from './QualitySummary';
import { QualityIssues } from './QualityIssues';
import { FieldAnalysis } from './FieldAnalysis';
import { Recommendations } from './Recommendations';
import { FieldDetailSidebar } from './FieldDetailSidebar';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface DataProfilingViewerInlineProps {
  sourceId: string;
}

export function DataProfilingViewerInline({ sourceId }: DataProfilingViewerInlineProps) {
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
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 text-gray-400 animate-spin mb-4" />
            <div className="text-gray-600">Loading profile data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-3 text-red-600 bg-red-50 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">Failed to load profile</div>
            <div className="text-sm text-red-700 mt-1">{state.error}</div>
          </div>
          <button
            onClick={loadProfile}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!state.profile) {
    return null;
  }

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Inline Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Data Quality Profile
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Generated on {new Date(state.profile.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={regenerateProfile}
            className="flex items-center px-3 py-1.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>

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
  );
}

export default DataProfilingViewerInline;