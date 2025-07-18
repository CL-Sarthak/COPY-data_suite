import React, { useState } from 'react';
import { OutlierAnalysis } from '@/types/profiling';
import { AlertTriangle, Info } from 'lucide-react';

interface OutlierIndicatorProps {
  outliers: OutlierAnalysis;
  className?: string;
}

export const OutlierIndicator: React.FC<OutlierIndicatorProps> = ({
  outliers,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (outliers.count === 0) {
    return (
      <div className={`flex items-center text-green-600 ${className}`}>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-xs font-medium">No outliers</span>
        </div>
      </div>
    );
  }

  const getSeverityColor = (percentage: number) => {
    if (percentage > 10) return 'text-red-600';
    if (percentage > 5) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const getSeverityBg = (percentage: number) => {
    if (percentage > 10) return 'bg-red-500';
    if (percentage > 5) return 'bg-orange-500';
    return 'bg-yellow-500';
  };

  const colorClass = getSeverityColor(outliers.percentage);
  const bgClass = getSeverityBg(outliers.percentage);

  return (
    <div className={`relative ${className}`}>
      <div 
        className={`flex items-center cursor-pointer ${colorClass} hover:opacity-80 transition-opacity`}
        onClick={() => setShowDetails(!showDetails)}
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
      >
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 ${bgClass} rounded-full`}></div>
          <AlertTriangle className="w-3 h-3" />
          <span className="text-xs font-medium">
            {outliers.count} ({outliers.percentage.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Tooltip/Details */}
      {showDetails && (
        <div className="absolute z-50 top-full left-0 mt-1 p-3 bg-white border border-gray-200 rounded-lg shadow-lg min-w-64 max-w-80">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-900">
              <Info className="w-4 h-4" />
              <span>Outlier Analysis</span>
            </div>
            
            <div className="text-xs text-gray-600 space-y-1">
              <div><strong>Method:</strong> {outliers.method}</div>
              <div><strong>Count:</strong> {outliers.count} outliers</div>
              <div><strong>Percentage:</strong> {outliers.percentage.toFixed(1)}%</div>
              
              {outliers.bounds && (
                <div>
                  <strong>Bounds:</strong> 
                  {outliers.bounds.lower !== undefined && ` Lower: ${outliers.bounds.lower.toFixed(2)}`}
                  {outliers.bounds.upper !== undefined && ` Upper: ${outliers.bounds.upper.toFixed(2)}`}
                </div>
              )}
              
              {outliers.threshold && (
                <div><strong>Threshold:</strong> {outliers.threshold}</div>
              )}
            </div>

            {/* Sample outlier values */}
            {outliers.values.length > 0 && (
              <div className="border-t pt-2">
                <div className="text-xs font-medium text-gray-700 mb-1">
                  Sample Values ({Math.min(5, outliers.values.length)} of {outliers.values.length}):
                </div>
                <div className="text-xs text-gray-600 space-y-0.5">
                  {outliers.values.slice(0, 5).map((value, index) => (
                    <div key={index} className="font-mono">
                      {typeof value === 'number' ? value.toFixed(2) : String(value)}
                    </div>
                  ))}
                  {outliers.values.length > 5 && (
                    <div className="text-gray-500 italic">
                      ... and {outliers.values.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OutlierIndicator;