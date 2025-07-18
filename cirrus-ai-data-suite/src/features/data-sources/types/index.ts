// Import DataSource type from global types
import type { DataSource } from '@/types';

export interface DataSourceFormData {
  name: string;
  type: 'file' | 'database' | 'api' | 'cloud_storage' | 's3' | 'azure_blob' | 'gcs';
  configuration: Record<string, unknown>;
}

export interface DataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSource?: DataSource | null;
  onSuccess?: () => void;
}

export interface DataSourceTableProps {
  dataSources: DataSource[];
  onEdit: (dataSource: DataSource) => void;
  onDelete: (dataSource: DataSource) => void;
  onTest: (dataSource: DataSource) => void;
}

export type DataSourceType = 'file' | 'database' | 'api' | 'cloud_storage' | 's3' | 'azure_blob' | 'gcs';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// Re-export DataSource type for convenience
export type { DataSource };