import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'success';
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function ActionButton({
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  children,
  icon,
  className = ''
}: ActionButtonProps) {
  const baseClasses = 'flex items-center gap-2 px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'text-gray-600 hover:text-gray-800',
    success: 'bg-green-600 text-white hover:bg-green-700'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {loading ? (
        <ArrowPathIcon className="h-5 w-5 animate-spin" />
      ) : icon}
      {children}
    </button>
  );
}