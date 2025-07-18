import React from 'react';
import { DataSource } from '@/types/discovery';
import SchemaAnalyzer from '@/components/SchemaAnalyzer';

interface SchemaAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSource: DataSource;
}

export function SchemaAnalyzerModal({ isOpen, onClose, dataSource }: SchemaAnalyzerModalProps) {
  if (!isOpen) return null;
  
  return (
    <SchemaAnalyzer 
      dataSourceId={dataSource.id}
      dataSourceName={dataSource.name}
      onClose={onClose}
    />
  );
}