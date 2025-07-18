import React from 'react';
import { SyntheticDataConfig } from '../../types';
import { Button } from '@/features/shared/components';
import { 
  CogIcon, 
  TrashIcon, 
  PencilIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline';

interface ConfigCardProps {
  config: SyntheticDataConfig;
  onGenerate: (configId: string) => void;
  onEdit: (config: SyntheticDataConfig) => void;
  onDelete: (configId: string) => void;
  isGenerating?: boolean;
}

export function ConfigCard({ 
  config, 
  onGenerate, 
  onEdit, 
  onDelete,
  isGenerating = false
}: ConfigCardProps) {
  const privacyLevelColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    maximum: 'bg-red-100 text-red-800'
  };

  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{config.name}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {config.sourceDataset} • {config.configuration.recordCount.toLocaleString()} records
          </p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${privacyLevelColors[config.privacyLevel]}`}>
          {config.privacyLevel} privacy
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Output: {config.outputFormat.toUpperCase()}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<PencilIcon className="h-4 w-4" />}
            onClick={() => onEdit(config)}
          >
            Edit
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            icon={<TrashIcon className="h-4 w-4" />}
            onClick={() => onDelete(config.id)}
          >
            Delete
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            icon={isGenerating ? 
              <CogIcon className="h-4 w-4 animate-spin" /> : 
              <SparklesIcon className="h-4 w-4" />
            }
            onClick={() => onGenerate(config.id)}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </div>
    </div>
  );
}