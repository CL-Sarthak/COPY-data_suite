import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | null;
  onRetry?: () => void;
  fullHeight?: boolean;
}

export function ErrorState({ 
  title = 'An error occurred',
  message,
  error,
  onRetry,
  fullHeight = false
}: ErrorStateProps) {
  const errorMessage = message || error?.message || 'Something went wrong. Please try again.';

  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4 max-w-md">{errorMessage}</p>
      {onRetry && (
        <Button variant="primary" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
      {error && process.env.NODE_ENV === 'development' && (
        <details className="mt-4 text-left">
          <summary className="text-xs text-gray-500 cursor-pointer">
            Error details (development only)
          </summary>
          <pre className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded overflow-auto max-w-lg">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );

  if (fullHeight) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}