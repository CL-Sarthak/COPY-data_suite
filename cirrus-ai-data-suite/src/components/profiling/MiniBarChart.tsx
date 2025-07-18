import React from 'react';

interface CategoryData {
  value: unknown;
  count: number;
  percentage: number;
}

interface MiniBarChartProps {
  categories: CategoryData[];
  maxCategories?: number;
  width?: number;
  height?: number;
  className?: string;
}

export const MiniBarChart: React.FC<MiniBarChartProps> = ({
  categories,
  maxCategories = 5,
  width = 120,
  height = 40,
  className = ''
}) => {
  if (!categories || categories.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <span className="text-xs text-gray-400">No data</span>
      </div>
    );
  }

  // Take top categories and optionally add "others"
  const topCategories = categories.slice(0, maxCategories);
  const hasMore = categories.length > maxCategories;
  const othersCount = hasMore 
    ? categories.slice(maxCategories).reduce((sum, cat) => sum + cat.count, 0)
    : 0;

  const displayCategories = hasMore 
    ? [...topCategories, { value: 'Others', count: othersCount, percentage: 0 }]
    : topCategories;

  const maxCount = Math.max(...displayCategories.map(cat => cat.count));
  const barHeight = height / displayCategories.length;

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <svg width={width} height={height} className="overflow-visible">
        {displayCategories.map((category, index) => {
          const barLength = maxCount > 0 ? (category.count / maxCount) * (width - 20) : 0;
          const y = index * barHeight;

          return (
            <g key={index}>
              <rect
                x={0}
                y={y + 2}
                width={barLength}
                height={Math.max(barHeight - 4, 2)}
                fill="currentColor"
                className="text-green-500 opacity-70 hover:opacity-100 transition-opacity"
              />
              <text
                x={barLength + 2}
                y={y + barHeight / 2 + 2}
                fontSize="8"
                fill="currentColor"
                className="text-gray-600 font-mono"
                dominantBaseline="middle"
              >
                {category.count}
              </text>
              <title>
                {String(category.value)}: {category.count} occurrences
                {category.percentage > 0 && ` (${category.percentage.toFixed(1)}%)`}
              </title>
            </g>
          );
        })}
      </svg>
      
      {/* Category labels below */}
      <div className="absolute -bottom-1 left-0 right-0">
        <div className="text-xs text-gray-500 truncate">
          {topCategories.map(cat => String(cat.value)).join(', ')}
          {hasMore && '...'}
        </div>
      </div>
      
      {/* Accessibility */}
      <div className="sr-only">
        Categorical data chart showing top {displayCategories.length} categories: 
        {displayCategories.map(cat => `${cat.value}: ${cat.count}`).join(', ')}
      </div>
    </div>
  );
};

export default MiniBarChart;