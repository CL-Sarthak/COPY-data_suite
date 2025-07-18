import React, { useMemo, useState } from 'react';
import { EnhancedFieldProfile } from '@/types/profiling';
import MiniDistributionChart from './MiniDistributionChart';
import MiniBarChart from './MiniBarChart';
import OutlierIndicator from './OutlierIndicator';

interface EnhancedProfileTableProps {
  fields: EnhancedFieldProfile[];
  sampleRecords: Record<string, unknown>[];
  className?: string;
  maxSampleRows?: number;
  showStatistics?: boolean;
  showOutliers?: boolean;
  showDistributions?: boolean;
}

export const EnhancedProfileTable: React.FC<EnhancedProfileTableProps> = ({
  fields,
  sampleRecords,
  className = '',
  maxSampleRows = 100,
  showStatistics = false,
  showOutliers = true,
  showDistributions = true
}) => {
  const [expandedField] = useState<string | null>(null);

  const displaySampleRecords = useMemo(() => {
    // Show all sample records up to maxSampleRows, user can scroll through all of them
    return sampleRecords.slice(0, maxSampleRows);
  }, [sampleRecords, maxSampleRows]);

  if (fields.length === 0) {
    return (
      <div className={`p-8 text-center text-gray-500 ${className}`}>
        <p>No field data available for enhanced profiling view.</p>
      </div>
    );
  }

  const formatStatValue = (value: unknown, decimals: number = 2): string => {
    if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return 'N/A';
      return Number.isInteger(value) ? value.toString() : value.toFixed(decimals);
    }
    return String(value);
  };

  const getTypeIcon = (dataType: string): string => {
    switch (dataType) {
      case 'numeric': return '🔢';
      case 'string': return '📝';
      case 'boolean': return '✓';
      case 'date': return '📅';
      case 'mixed': return '🔀';
      default: return '❓';
    }
  };

  const getClassificationIcon = (classification: string): string => {
    switch (classification) {
      case 'numerical': return '📊';
      case 'categorical': return '🏷️';
      case 'ordinal': return '📈';
      default: return '❓';
    }
  };

  const getClassificationColor = (classification: string): string => {
    switch (classification) {
      case 'numerical': return 'text-blue-600';
      case 'categorical': return 'text-green-600';
      case 'ordinal': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getMissingValuesSeverity = (nullCount: number, totalCount: number): { color: string; severity: string } => {
    const missingPercentage = (nullCount / totalCount) * 100;
    if (missingPercentage === 0) return { color: 'text-green-600 bg-green-50', severity: 'None' };
    if (missingPercentage < 5) return { color: 'text-yellow-600 bg-yellow-50', severity: 'Low' };
    if (missingPercentage < 20) return { color: 'text-orange-600 bg-orange-50', severity: 'Medium' };
    return { color: 'text-red-600 bg-red-50', severity: 'High' };
  };

  return (
    <div className={`border rounded-lg ${className}`}>
      {/* Header and Statistics Section - Always Visible */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {/* Header Row - Column Names with Types */}
          <thead className="bg-gray-50">
            <tr>
              {fields.map((field) => (
                <th
                  key={field.fieldName}
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b border-r border-gray-200 min-w-32"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{getTypeIcon(field.dataType)}</span>
                    <div>
                      <div className="font-semibold">{field.fieldName}</div>
                      <div className="text-xs text-gray-500 font-normal">
                        ({field.dataType})
                      </div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

        {/* Statistics Section */}
        <tbody className="bg-white">
          {/* Data Classification Row */}
          <tr className="bg-indigo-50 border-b">
            {fields.map((field) => (
              <td
                key={`classification-${field.fieldName}`}
                className="px-4 py-2 text-xs border-r border-gray-200 align-middle"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-base">{getClassificationIcon(field.dataClassification)}</span>
                  <span className={`font-semibold ${getClassificationColor(field.dataClassification)}`}>
                    {field.dataClassification.charAt(0).toUpperCase() + field.dataClassification.slice(1)}
                  </span>
                </div>
              </td>
            ))}
          </tr>

          {/* Missing Values Row */}
          <tr className="bg-gray-50 border-b">
            {fields.map((field) => {
              const { color, severity } = getMissingValuesSeverity(field.nullCount, field.totalCount);
              const missingPercentage = ((field.nullCount / field.totalCount) * 100).toFixed(1);
              return (
                <td
                  key={`missing-${field.fieldName}`}
                  className="px-4 py-2 text-xs border-r border-gray-200 align-middle"
                >
                  <div className="text-center">
                    <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${color}`}>
                      {field.nullCount} missing ({missingPercentage}%)
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {severity} severity
                    </div>
                  </div>
                </td>
              );
            })}
          </tr>

          {/* Statistics Row - Only show if enabled in config */}
          {showStatistics && (
            <tr className="bg-blue-50 border-b">
              {fields.map((field) => (
                <td
                  key={`stats-${field.fieldName}`}
                  className="px-4 py-3 text-xs border-r border-gray-200 align-top"
                >
                  <div className="space-y-1">
                    {field.dataType === 'numeric' ? (
                      <>
                        <div><strong>Mean:</strong> {formatStatValue(field.statistics?.mean)}</div>
                        <div><strong>Median:</strong> {formatStatValue(field.statistics?.median)}</div>
                        <div><strong>Mode:</strong> {formatStatValue(field.statistics?.mode)}</div>
                      </>
                    ) : (
                      <>
                        <div><strong>Mode:</strong> {formatStatValue(field.statistics?.mode, 0)}</div>
                        <div><strong>Unique:</strong> {field.uniqueCount || 0}</div>
                        <div><strong>Complete:</strong> {(field.completeness || 0).toFixed(1)}%</div>
                      </>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          )}

          {/* Outliers Row - Only show if enabled in config */}
          {showOutliers && (
            <tr className="bg-yellow-50 border-b">
              {fields.map((field) => (
                <td
                  key={`outliers-${field.fieldName}`}
                  className="px-4 py-3 border-r border-gray-200 align-middle"
                >
                  {field.dataType === 'numeric' && field.outliers ? (
                    <OutlierIndicator outliers={field.outliers} />
                  ) : (
                    <div className="text-xs text-gray-500">
                      {field.dataType === 'numeric' ? 'No outlier data' : `N/A for ${field.dataType}`}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          )}

          {/* Distribution Row - Only show if enabled in config */}
          {showDistributions && (
            <tr className="bg-green-50 border-b-2 border-gray-300">
              {fields.map((field) => (
                <td
                  key={`distribution-${field.fieldName}`}
                  className="px-4 py-3 border-r border-gray-200 align-middle"
                >
                  {field.dataType === 'numeric' && field.distribution ? (
                    <MiniDistributionChart 
                      data={field.distribution}
                      width={120}
                      height={40}
                    />
                  ) : field.categoricalAnalysis?.topCategories ? (
                    <MiniBarChart
                      categories={field.categoricalAnalysis.topCategories}
                      width={120}
                      height={40}
                    />
                  ) : (
                    <div className="text-xs text-gray-500 text-center py-3">
                      {field.dataType === 'numeric' ? 'No distribution data' : 'No visualization'}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          )}
        </tbody>
        </table>
      </div>

      {/* Sample Data Section - Scrollable */}
      <div className="border-t">
        {/* Sample Data Header - Fixed */}
        <div className="bg-gray-100 px-4 py-2 border-b">
          <div className="text-sm font-semibold text-gray-700">
            Sample Data (showing {displaySampleRecords.length} of {displaySampleRecords.length} sample records - scroll to view all)
          </div>
        </div>

        {/* Scrollable Data Rows */}
        <div className="overflow-auto max-h-96">
          <table className="w-full border-collapse">
            <tbody>
              {displaySampleRecords.map((record, rowIndex) => (
                <tr 
                  key={rowIndex}
                  className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                >
                  {fields.map((field) => (
                    <td
                      key={`${rowIndex}-${field.fieldName}`}
                      className="px-4 py-2 text-sm text-gray-900 border-r border-gray-200 max-w-xs min-w-32"
                    >
                      <div className="truncate" title={String(record[field.fieldName] || '')}>
                        {record[field.fieldName] !== null && record[field.fieldName] !== undefined 
                          ? String(record[field.fieldName])
                          : <span className="text-gray-400 italic">null</span>
                        }
                      </div>
                    </td>
                  ))}
                </tr>
              ))}

              {/* Show indicator if there are more records than the sample size */}
              {sampleRecords.length > maxSampleRows && (
                <tr className="bg-gray-50">
                  <td
                    colSpan={fields.length}
                    className="px-4 py-3 text-center text-sm text-gray-600 border-t"
                  >
                    Showing first {maxSampleRows} of {sampleRecords.length} total sample records
                    <div className="text-xs text-gray-500 mt-1">
                      Increase sample size in configuration to see more records
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Field Details Expansion (for future) */}
      {expandedField && (
        <div className="mt-4 p-4 bg-gray-50 border-t">
          <h4 className="text-sm font-semibold mb-2">
            Detailed Statistics for {expandedField}
          </h4>
          {/* TODO: Add expanded field details */}
        </div>
      )}
    </div>
  );
};

export default EnhancedProfileTable;