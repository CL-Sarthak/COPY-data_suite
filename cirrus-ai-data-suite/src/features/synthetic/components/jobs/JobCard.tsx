import React from 'react';
import { JobWithConfig, SyntheticDataJob } from '../../types';
import { Button } from '@/features/shared/components';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  CogIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface JobCardProps {
  job: JobWithConfig;
  onDownload: (configId: string, filename: string) => void;
  onPreview?: (configId: string) => void;
  onDelete: (jobId: string) => void;
  onAddToDataSource?: (job: JobWithConfig) => void;
  isDownloading?: boolean;
}

export function JobCard({ 
  job, 
  onDownload,
  onPreview,
  onDelete,
  onAddToDataSource,
  isDownloading = false
}: JobCardProps) {
  const getStatusIcon = (status: 'pending' | 'running' | 'completed' | 'failed') => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'running':
        return <CogIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  const formatDuration = (start: Date, end?: Date) => {
    if (!end) return 'In progress';
    
    const duration = end.getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {getStatusIcon((job as SyntheticDataJob).status)}
          <div>
            <h4 className="font-medium text-gray-900">
              {job.configName || `Job ${(job as SyntheticDataJob).id.slice(0, 8)}`}
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              Started at {formatTime((job as SyntheticDataJob).startTime)}
              {(job as SyntheticDataJob).endTime && ` • Duration: ${formatDuration((job as SyntheticDataJob).startTime, (job as SyntheticDataJob).endTime!)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(job as SyntheticDataJob).status === 'running' && (
            <div className="text-sm text-blue-600">
              {(job as SyntheticDataJob).progress}% • {(job as SyntheticDataJob).recordsGenerated.toLocaleString()} records
            </div>
          )}
          
          {(job as SyntheticDataJob).status === 'completed' && (
            <div className="text-sm text-green-600">
              {(job as SyntheticDataJob).recordsGenerated.toLocaleString()} records
            </div>
          )}
        </div>
      </div>

      {(job as SyntheticDataJob).status === 'running' && (
        <div className="mt-3">
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(job as SyntheticDataJob).progress}%` }}
            />
          </div>
        </div>
      )}

      {(job as SyntheticDataJob).errorMessage && (
        <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
          {(job as SyntheticDataJob).errorMessage}
        </div>
      )}

      {(job as SyntheticDataJob).status === 'completed' && (
        <div className="mt-4 flex gap-2">
          {onPreview && (
            <Button
              variant="ghost"
              size="sm"
              icon={<EyeIcon className="h-4 w-4" />}
              onClick={() => onPreview((job as SyntheticDataJob).configId)}
            >
              Preview
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowDownTrayIcon className="h-4 w-4" />}
            onClick={() => onDownload((job as SyntheticDataJob).configId, (job as SyntheticDataJob).outputFile || 'synthetic-data.json')}
            loading={isDownloading}
          >
            Download
          </Button>

          {onAddToDataSource && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddToDataSource(job)}
            >
              Add to Sources
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            icon={<TrashIcon className="h-4 w-4" />}
            onClick={() => onDelete((job as SyntheticDataJob).id)}
          >
            Delete
          </Button>
        </div>
      )}

      {((job as SyntheticDataJob).status === 'failed' || (job as SyntheticDataJob).status === 'pending') && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            icon={<TrashIcon className="h-4 w-4" />}
            onClick={() => onDelete((job as SyntheticDataJob).id)}
          >
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}