import React from 'react';
import { ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface FieldPriorityProps {
  priority: 'high' | 'medium' | 'low';
}

export function FieldPriority({ priority }: FieldPriorityProps) {
  const config = {
    high: {
      icon: <ExclamationCircleIcon className="h-4 w-4 text-red-500" />,
      label: 'high priority',
      className: 'bg-red-100 text-red-700'
    },
    medium: {
      icon: <InformationCircleIcon className="h-4 w-4 text-yellow-500" />,
      label: 'medium priority',
      className: 'bg-yellow-100 text-yellow-700'
    },
    low: {
      icon: <InformationCircleIcon className="h-4 w-4 text-blue-500" />,
      label: 'low priority',
      className: 'bg-blue-100 text-blue-700'
    }
  };

  const { icon, label, className } = config[priority];

  return (
    <>
      {icon}
      <span className={`text-xs px-2 py-1 rounded ${className}`}>
        {label}
      </span>
    </>
  );
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'border-red-200 bg-red-50';
    case 'medium':
      return 'border-yellow-200 bg-yellow-50';
    case 'low':
      return 'border-blue-200 bg-blue-50';
    default:
      return 'border-gray-200 bg-gray-50';
  }
}