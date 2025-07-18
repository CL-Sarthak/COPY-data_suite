import React from 'react';
import { Modal, Button } from '@/features/shared/components';
import { DataSource } from '@/types/discovery';
import DataProfilingViewer from '@/components/DataProfilingViewer';

interface DataProfilingModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSource: DataSource;
}

export function DataProfilingModal({ isOpen, onClose, dataSource }: DataProfilingModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Data Profiling - ${dataSource.name}`}
      size="xl"
      className="sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl"
    >
      <div className="min-h-[400px]">
        <DataProfilingViewer sourceId={dataSource.id} onClose={onClose} />
      </div>
      
      <div className="flex justify-end gap-3 pt-4 border-t mt-6">
        <Button
          variant="secondary"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </Modal>
  );
}