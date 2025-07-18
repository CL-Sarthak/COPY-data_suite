import React, { ReactNode } from 'react';

interface PanelProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Panel({
  title,
  description,
  action,
  children,
  className = '',
  noPadding = false
}: PanelProps) {
  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      {(title || action) && (
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  {title}
                </h3>
              )}
              {description && (
                <p className="mt-1 text-sm text-gray-500">
                  {description}
                </p>
              )}
            </div>
            {action && (
              <div className="ml-4 flex-shrink-0">
                {action}
              </div>
            )}
          </div>
        </div>
      )}
      <div className={noPadding ? '' : 'px-6 py-4'}>
        {children}
      </div>
    </div>
  );
}