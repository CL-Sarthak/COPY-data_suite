import React from 'react';

interface MetricsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconColor?: string;
}

export function MetricsCard({ title, value, icon, iconColor = 'text-gray-500' }: MetricsCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={iconColor}>
          {icon}
        </div>
      </div>
    </div>
  );
}