export interface ProcessedFile {
  name: string;
  type: string;
  size: number;
  content: string;
  contentTruncated: boolean;
  originalContentLength: number;
  storageKey?: string;
}

export interface TransformProgress {
  [key: string]: string;
}

export interface AddSourceFormData {
  name: string;
  type: 'filesystem' | 'database' | 'api';
  config: Record<string, unknown>;
  files: ProcessedFile[];
}

export * from '@/types/discovery';