import React, { useState, useEffect } from 'react';
import { DataSource } from '@/types/discovery';
import { 
  SparklesIcon, 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon,
  ClockIcon,
  InformationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface DataSourceSummaryProps {
  source: DataSource;
  onUpdate?: () => void;
}

interface SummaryData {
  aiSummary?: string;
  userSummary?: string;
  summaryGeneratedAt?: string;
  summaryUpdatedAt?: string;
  summaryVersion?: number;
}

export function DataSourceSummary({ source, onUpdate }: DataSourceSummaryProps) {
  const [summaryData, setSummaryData] = useState<SummaryData>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.id]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/data-sources/${source.id}/summary`);
      if (response.ok) {
        const data = await response.json();
        setSummaryData(data);
      }
    } catch (error) {
      console.error('Failed to load summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      const response = await fetch(`/api/data-sources/${source.id}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate summary');
      }

      const data = await response.json();
      setSummaryData(prev => ({
        ...prev,
        aiSummary: data.aiSummary,
        summaryGeneratedAt: data.summaryGeneratedAt,
        summaryVersion: data.summaryVersion
      }));
      
      if (onUpdate) onUpdate();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  const startEditing = () => {
    setEditing(true);
    setEditedSummary(summaryData.userSummary || summaryData.aiSummary || '');
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditedSummary('');
    setError(null);
  };

  const saveSummary = async () => {
    try {
      setError(null);
      
      const response = await fetch(`/api/data-sources/${source.id}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update',
          userSummary: editedSummary 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save summary');
      }

      const data = await response.json();
      setSummaryData(prev => ({
        ...prev,
        userSummary: data.userSummary,
        summaryUpdatedAt: data.summaryUpdatedAt,
        summaryVersion: data.summaryVersion
      }));
      
      setEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save summary');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const displaySummary = summaryData.userSummary || summaryData.aiSummary;

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <InformationCircleIcon className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">Data Summary</h3>
          {summaryData.userSummary && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              User Edited
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!editing && (
            <>
              {!summaryData.aiSummary && (
                <button
                  onClick={generateSummary}
                  disabled={generating}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <SparklesIcon className="h-4 w-4 animate-pulse" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4" />
                      Generate with AI
                    </>
                  )}
                </button>
              )}
              
              {displaySummary && (
                <>
                  {summaryData.aiSummary && (
                    <button
                      onClick={generateSummary}
                      disabled={generating}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Regenerate AI summary"
                    >
                      {generating ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <ArrowPathIcon className="h-4 w-4" />
                          Regenerate
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={startEditing}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Edit
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ) : editing ? (
        <div className="space-y-3">
          <textarea
            value={editedSummary}
            onChange={(e) => setEditedSummary(e.target.value)}
            placeholder="Enter a description of this data source..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            rows={4}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={saveSummary}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <CheckIcon className="h-4 w-4" />
              Save
            </button>
            <button
              onClick={cancelEditing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <XMarkIcon className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      ) : displaySummary ? (
        <div>
          <p className="text-gray-700 leading-relaxed">{displaySummary}</p>
          
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            {summaryData.aiSummary && (
              <div className="flex items-center gap-1">
                <SparklesIcon className="h-3 w-3" />
                <span>AI Generated: {formatDate(summaryData.summaryGeneratedAt)}</span>
              </div>
            )}
            {summaryData.userSummary && (
              <div className="flex items-center gap-1">
                <ClockIcon className="h-3 w-3" />
                <span>Last edited: {formatDate(summaryData.summaryUpdatedAt)}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <InformationCircleIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 mb-3">No summary available for this data source</p>
          <button
            onClick={generateSummary}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <SparklesIcon className="h-4 w-4 animate-pulse" />
                Generating Summary...
              </>
            ) : (
              <>
                <SparklesIcon className="h-4 w-4" />
                Generate AI Summary
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}