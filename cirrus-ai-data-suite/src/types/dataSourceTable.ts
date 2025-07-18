import { DataSource } from '@/types/discovery';

export type SortField = 'name' | 'type' | 'status' | 'recordCount' | 'lastSync' | 'transformedAt';
export type SortDirection = 'asc' | 'desc';

export interface DataSourceTableProps {
  dataSources: DataSource[];
  loading: boolean;
  transformingSource: string | null;
  transformProgress: { [key: string]: string };
  onSourceSelect: (source: DataSource) => void;
  onTransform: (sourceId: string) => void;
  onEdit: (source: DataSource) => void;
  onDelete: (sourceId: string) => void;
  onAnalyze: (source: DataSource) => void;
  onMap: (source: DataSource) => void;
  onAddFiles: (source: DataSource) => void;
  onTagsUpdate: (sourceId: string, tags: string[]) => void;
  onProfile: (source: DataSource) => void;
  onRefresh?: (source: DataSource) => void;
  onAskAI?: (source: DataSource) => void;
  refreshingSource?: string | null;
  initialExpandedRow?: string | null;
}

export interface TransformedDataPreviewProps {
  sourceId: string;
}

export interface FileContentViewerProps {
  file: {
    content?: string;
    type?: string;
    name?: string;
    storageKey?: string;
    size?: number;
  };
  sourceId: string;
}

export interface DataSourceDetailsProps {
  source: DataSource;
  onAskAI?: (source: DataSource) => void;
}

export interface SortHeaderProps {
  field: SortField;
  children: React.ReactNode;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

export interface TransformedData {
  records: Array<{ data: Record<string, unknown> }>;
  totalRecords: number;
  schema: { fields: Array<unknown> };
}

export interface FilePreviewState {
  content: string | null;
  loading: boolean;
  error: string | null;
  viewMode: 'preview' | 'full';
}