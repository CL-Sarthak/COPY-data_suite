import { DataSource } from '@/types/discovery';
import { SortField, SortDirection, TransformedData } from '@/types/dataSourceTable';

export class DataSourceTableService {
  /**
   * Get icon component name for data source type
   */
  static getSourceIconName(type: DataSource['type']): string {
    switch (type) {
      case 'database': return 'CircleStackIcon';
      case 's3':
      case 'azure':
      case 'gcp': return 'CloudIcon';
      case 'api': return 'GlobeAltIcon';
      case 'filesystem': return 'FolderIcon';
      case 'json_transformed': return 'ArrowsRightLeftIcon';
      default: return 'ServerIcon';
    }
  }

  /**
   * Get human-readable label for data source type
   */
  static getSourceTypeLabel(type: DataSource['type']): string {
    switch (type) {
      case 'database': return 'Database';
      case 's3': return 'Amazon S3';
      case 'azure': return 'Azure Blob';
      case 'gcp': return 'Google Cloud';
      case 'api': return 'API';
      case 'filesystem': return 'Filesystem';
      case 'json_transformed': return 'Transformed JSON';
      default: return type;
    }
  }

  /**
   * Format relative time
   */
  static formatRelativeTime(date?: Date | string): string {
    if (!date) return '-';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid date';
    const minutes = Math.floor((Date.now() - dateObj.getTime()) / 1000 / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  /**
   * Sort data sources by field and direction
   */
  static sortDataSources(
    dataSources: DataSource[],
    sortField: SortField,
    sortDirection: SortDirection
  ): DataSource[] {
    return [...dataSources].sort((a, b) => {
      let aValue: string | number | Date | undefined;
      let bValue: string | number | Date | undefined;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'status':
          aValue = a.connectionStatus;
          bValue = b.connectionStatus;
          break;
        case 'recordCount':
          aValue = a.recordCount || 0;
          bValue = b.recordCount || 0;
          break;
        case 'lastSync':
          aValue = a.lastSync ? new Date(a.lastSync).getTime() : 0;
          bValue = b.lastSync ? new Date(b.lastSync).getTime() : 0;
          break;
        case 'transformedAt':
          aValue = a.transformedAt ? new Date(a.transformedAt).getTime() : 0;
          bValue = b.transformedAt ? new Date(b.transformedAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Filter data sources by tags
   */
  static filterByTags(dataSources: DataSource[], selectedTags: string[]): DataSource[] {
    if (selectedTags.length === 0) return dataSources;
    
    return dataSources.filter(source => 
      selectedTags.some(filterTag => source.tags?.includes(filterTag))
    );
  }

  /**
   * Extract all unique tags from data sources
   */
  static extractAllTags(dataSources: DataSource[]): string[] {
    const tagSet = new Set<string>();
    dataSources.forEach(source => {
      source.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }

  /**
   * Fetch transformed data preview
   */
  static async fetchTransformedPreview(sourceId: string): Promise<TransformedData> {
    const response = await fetch(`/api/data-sources/${sourceId}/transform`);
    if (!response.ok) {
      throw new Error('Failed to load preview data');
    }
    return response.json();
  }

  /**
   * Fetch file content for a data source
   */
  static async fetchFileContent(sourceId: string, fileName: string): Promise<string | null> {
    const response = await fetch(`/api/data-sources/${sourceId}?includeFileContent=true`);
    if (!response.ok) {
      throw new Error('Failed to load file content');
    }
    
    const dataSource = await response.json();
    const fileData = dataSource.configuration?.files?.find((f: { name: string }) => f.name === fileName);
    
    if (!fileData?.content) {
      throw new Error('File content not available');
    }
    
    return fileData.content;
  }

  /**
   * Check if file is a text document
   */
  static isTextDocument(file: { type?: string; name?: string }): boolean {
    return file.type === 'application/pdf' || 
           file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
           file.type === 'text/plain' ||
           file.type === 'text/csv' ||
           file.type === 'application/json' ||
           file.name?.toLowerCase().endsWith('.pdf') === true ||
           file.name?.toLowerCase().endsWith('.docx') === true ||
           file.name?.toLowerCase().endsWith('.txt') === true ||
           file.name?.toLowerCase().endsWith('.csv') === true ||
           file.name?.toLowerCase().endsWith('.json') === true;
  }

  /**
   * Format JSON content
   */
  static formatJsonContent(content: string): string {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  }
}