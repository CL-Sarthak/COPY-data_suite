import React from 'react';
import { InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface InfoBoxProps {
  type?: 'info' | 'warning';
  message: string;
  className?: string;
}

export function InfoBox({ type = 'info', message, className = '' }: InfoBoxProps) {
  const isWarning = type === 'warning';
  
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg ${
      isWarning ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'
    } ${className}`}>
      {isWarning ? (
        <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      ) : (
        <InformationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      )}
      <p className="text-sm">{message}</p>
    </div>
  );
}