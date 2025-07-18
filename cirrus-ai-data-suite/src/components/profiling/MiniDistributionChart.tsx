import React from 'react';
import { DistributionData } from '@/types/profiling';

interface MiniDistributionChartProps {
  data: DistributionData;
  width?: number;
  height?: number;
  className?: string;
}

export const MiniDistributionChart: React.FC<MiniDistributionChartProps> = ({
  data,
  width = 120,
  height = 40,
  className = ''
}) => {
  if (!data.histogram || data.histogram.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <span className="text-xs text-gray-400">No data</span>
      </div>
    );
  }

  const maxValue = Math.max(...data.histogram);
  const barWidth = width / data.histogram.length;

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <svg width={width} height={height} className="overflow-visible">
        {data.histogram.map((value, index) => {
          const barHeight = maxValue > 0 ? (value / maxValue) * height : 0;
          const x = index * barWidth;
          const y = height - barHeight;

          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={Math.max(barWidth - 1, 1)}
                height={barHeight}
                fill="currentColor"
                className="text-blue-500 opacity-70 hover:opacity-100 transition-opacity"
              />
              <title>
                {data.bins[index]?.range || `Bin ${index + 1}`}: {value} values
              </title>
            </g>
          );
        })}
        
        {/* Distribution type indicator */}
        <text
          x={width - 2}
          y={12}
          fontSize="8"
          fill="currentColor"
          textAnchor="end"
          className="text-gray-600 font-mono"
        >
          {getDistributionSymbol(data.type)}
        </text>
      </svg>
      
      {/* Hover tooltip area */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="sr-only">
          Distribution chart showing {data.histogram.length} bins, 
          type: {data.type}, 
          total values: {data.histogram.reduce((sum, val) => sum + val, 0)}
        </div>
      </div>
    </div>
  );
};

function getDistributionSymbol(type: string): string {
  switch (type) {
    case 'normal': return '⟂';
    case 'skewed-left': return '⟵';
    case 'skewed-right': return '⟶';
    case 'bimodal': return '⟱';
    case 'uniform': return '▬';
    default: return '?';
  }
}

export default MiniDistributionChart;