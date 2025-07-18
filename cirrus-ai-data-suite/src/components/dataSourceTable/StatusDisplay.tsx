import React from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { DataSource } from '@/types/discovery';

interface StatusDisplayProps {
  status: DataSource['connectionStatus'];
}

export function StatusDisplay({ status }: StatusDisplayProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'connecting': return <ArrowPathIcon className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <ExclamationCircleIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'error': return 'Error';
      case 'connecting': return 'Connecting';
      case 'disconnected': return 'Disconnected';
      default: return status;
    }
  };

  return (
    <div className="flex items-center">
      {getStatusIcon()}
      <span className="ml-2 text-sm text-gray-900">{getStatusLabel()}</span>
    </div>
  );
}