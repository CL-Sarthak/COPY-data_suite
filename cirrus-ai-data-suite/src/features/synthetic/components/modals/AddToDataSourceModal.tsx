import React, { useState } from 'react';
import { Modal, Button } from '@/features/shared/components';
import { syntheticAPI } from '@/core/api';
import { JobWithConfig } from '../../types';
import { SyntheticDataJob } from '@/types/synthetic';
import { useToastActions } from '@/contexts/ToastContext';

interface AddToDataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobWithConfig;
}

export function AddToDataSourceModal({ isOpen, onClose, job }: AddToDataSourceModalProps) {
  const [dataSourceName, setDataSourceName] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToastActions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dataSourceName.trim()) {
      return;
    }

    setLoading(true);
    
    try {
      await syntheticAPI.addToDataSource((job as SyntheticDataJob).configId, dataSourceName);
      
      toast.success(
        'Data Source Created',
        `Successfully created data source "${dataSourceName}" with ${(job as SyntheticDataJob).recordsGenerated.toLocaleString()} synthetic records.`
      );
      
      setDataSourceName('');
      onClose();
    } catch (error) {
      const err = error as Error;
      toast.error('Failed to Create Data Source', err.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add to Data Sources"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Source Name
          </label>
          <input
            type="text"
            value={dataSourceName}
            onChange={(e) => setDataSourceName(e.target.value)}
            placeholder="Enter name for the new data source"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600">
            This will create a new data source containing {(job as SyntheticDataJob).recordsGenerated.toLocaleString()} synthetic records 
            from &quot;{job.configName || `Job ${(job as SyntheticDataJob).id.slice(0, 8)}`}&quot;. 
            The data source will be available for use in pattern detection, redaction, and other workflows.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            Create Data Source
          </Button>
        </div>
      </form>
    </Modal>
  );
}