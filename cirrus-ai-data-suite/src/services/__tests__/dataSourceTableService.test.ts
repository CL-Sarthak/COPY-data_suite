import { DataSourceTableService } from '../dataSourceTableService';
import { DataSource } from '@/types/discovery';

// Mock fetch
global.fetch = jest.fn();

describe('DataSourceTableService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchTransformedPreview', () => {
    it('should fetch transformed preview successfully', async () => {
      const mockData = {
        records: [{ id: 1, name: 'Record 1' }],
        totalRecords: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await DataSourceTableService.fetchTransformedPreview('1');

      expect(global.fetch).toHaveBeenCalledWith('/api/data-sources/1/transform');
      expect(result).toEqual(mockData);
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(DataSourceTableService.fetchTransformedPreview('1')).rejects.toThrow('Failed to load preview data');
    });
  });

  describe('fetchFileContent', () => {
    it('should fetch file content successfully', async () => {
      const mockDataSource = {
        configuration: {
          files: [
            { name: 'test.txt', content: 'File content here' },
            { name: 'other.txt', content: 'Other content' },
          ],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDataSource,
      });

      const result = await DataSourceTableService.fetchFileContent('1', 'test.txt');

      expect(global.fetch).toHaveBeenCalledWith('/api/data-sources/1?includeFileContent=true');
      expect(result).toBe('File content here');
    });

    it('should throw error when file not found', async () => {
      const mockDataSource = {
        configuration: {
          files: [],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDataSource,
      });

      await expect(DataSourceTableService.fetchFileContent('1', 'missing.txt')).rejects.toThrow('File content not available');
    });
  });

  describe('sortDataSources', () => {
    const mockData: DataSource[] = [
      {
        id: '1',
        name: 'Beta Source',
        type: 'filesystem',
        connectionStatus: 'connected',
        recordCount: 200,
        lastSync: new Date('2024-01-02'),
        hasTransformedData: false,
        tags: [],
        configuration: {},
        metadata: {},
      },
      {
        id: '2',
        name: 'Alpha Source',
        type: 'database',
        connectionStatus: 'error',
        recordCount: 100,
        lastSync: new Date('2024-01-01'),
        hasTransformedData: true,
        transformedAt: new Date('2024-01-01'),
        tags: [],
        configuration: {},
        metadata: {},
      },
    ];

    it('should sort by name ascending', () => {
      const sorted = DataSourceTableService.sortDataSources(mockData, 'name', 'asc');
      expect(sorted[0].name).toBe('Alpha Source');
      expect(sorted[1].name).toBe('Beta Source');
    });

    it('should sort by name descending', () => {
      const sorted = DataSourceTableService.sortDataSources(mockData, 'name', 'desc');
      expect(sorted[0].name).toBe('Beta Source');
      expect(sorted[1].name).toBe('Alpha Source');
    });

    it('should sort by recordCount', () => {
      const sorted = DataSourceTableService.sortDataSources(mockData, 'recordCount', 'asc');
      expect(sorted[0].recordCount).toBe(100);
      expect(sorted[1].recordCount).toBe(200);
    });

    it('should sort by type', () => {
      const sorted = DataSourceTableService.sortDataSources(mockData, 'type', 'asc');
      expect(sorted[0].type).toBe('database');
      expect(sorted[1].type).toBe('filesystem');
    });

    it('should sort by lastSync', () => {
      const sorted = DataSourceTableService.sortDataSources(mockData, 'lastSync', 'asc');
      expect(sorted[0].id).toBe('2'); // Has earlier date
      expect(sorted[1].id).toBe('1');
    });

    it('should handle null values in sorting', () => {
      const dataWithNull = [
        { ...mockData[0], lastSync: null },
        mockData[1],
      ];
      
      const sorted = DataSourceTableService.sortDataSources(dataWithNull as DataSource[], 'lastSync', 'asc');
      expect(sorted[0].lastSync).toBeNull();
      expect(sorted[1].lastSync).not.toBeNull();
    });
  });

  describe('Utility Functions', () => {
    describe('getSourceIconName', () => {
      it('should return correct icons for source types', () => {
        expect(DataSourceTableService.getSourceIconName('database')).toBe('CircleStackIcon');
        expect(DataSourceTableService.getSourceIconName('s3')).toBe('CloudIcon');
        expect(DataSourceTableService.getSourceIconName('api')).toBe('GlobeAltIcon');
        expect(DataSourceTableService.getSourceIconName('filesystem')).toBe('FolderIcon');
      });
    });

    describe('getSourceTypeLabel', () => {
      it('should return correct labels for source types', () => {
        expect(DataSourceTableService.getSourceTypeLabel('database')).toBe('Database');
        expect(DataSourceTableService.getSourceTypeLabel('s3')).toBe('Amazon S3');
        expect(DataSourceTableService.getSourceTypeLabel('api')).toBe('API');
        expect(DataSourceTableService.getSourceTypeLabel('filesystem')).toBe('Filesystem');
      });
    });

    describe('formatRelativeTime', () => {
      it('should format recent times correctly', () => {
        const now = new Date();
        const minutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const hoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        const daysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

        expect(DataSourceTableService.formatRelativeTime(minutesAgo)).toMatch(/\d+m ago/);
        expect(DataSourceTableService.formatRelativeTime(hoursAgo)).toMatch(/\d+h ago/);
        expect(DataSourceTableService.formatRelativeTime(daysAgo)).toMatch(/\d+d ago/);
      });

      it('should handle invalid dates', () => {
        expect(DataSourceTableService.formatRelativeTime(undefined)).toBe('-');
        expect(DataSourceTableService.formatRelativeTime('invalid')).toBe('Invalid date');
      });
    });

    describe('filterByTags', () => {
      it('should filter data sources by tags', () => {
        const data = [
          { id: '1', tags: ['tag1', 'tag2'] },
          { id: '2', tags: ['tag2', 'tag3'] },
          { id: '3', tags: ['tag3'] },
        ] as DataSource[];

        const filtered = DataSourceTableService.filterByTags(data, ['tag1']);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe('1');

        const filtered2 = DataSourceTableService.filterByTags(data, ['tag2']);
        expect(filtered2).toHaveLength(2);
      });

      it('should return all data when no tags selected', () => {
        const data = [
          { id: '1', tags: ['tag1'] },
          { id: '2', tags: ['tag2'] },
        ] as DataSource[];

        const filtered = DataSourceTableService.filterByTags(data, []);
        expect(filtered).toHaveLength(2);
      });
    });

    describe('extractAllTags', () => {
      it('should extract unique tags from data sources', () => {
        const data = [
          { id: '1', tags: ['tag1', 'tag2'] },
          { id: '2', tags: ['tag2', 'tag3'] },
          { id: '3', tags: ['tag1'] },
        ] as DataSource[];

        const tags = DataSourceTableService.extractAllTags(data);
        expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
      });

      it('should handle sources without tags', () => {
        const data = [
          { id: '1', tags: ['tag1'] },
          { id: '2' },
          { id: '3', tags: [] },
        ] as DataSource[];

        const tags = DataSourceTableService.extractAllTags(data);
        expect(tags).toEqual(['tag1']);
      });
    });

    describe('isTextDocument', () => {
      it('should identify text documents correctly', () => {
        expect(DataSourceTableService.isTextDocument({ type: 'text/plain', name: 'test.txt', size: 100 })).toBe(true);
        expect(DataSourceTableService.isTextDocument({ type: 'text/csv', name: 'test.csv', size: 100 })).toBe(true);
        expect(DataSourceTableService.isTextDocument({ type: 'application/json', name: 'test.json', size: 100 })).toBe(true);
        expect(DataSourceTableService.isTextDocument({ type: 'application/pdf', name: 'test.pdf', size: 100 })).toBe(true);
        expect(DataSourceTableService.isTextDocument({ type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'test.docx', size: 100 })).toBe(true);
        expect(DataSourceTableService.isTextDocument({ type: 'image/png', name: 'test.png', size: 100 })).toBe(false);
        expect(DataSourceTableService.isTextDocument({ type: 'image/jpeg', name: 'test.jpg', size: 100 })).toBe(false);
      });
    });

    describe('formatJsonContent', () => {
      it('should format valid JSON', () => {
        const json = '{"name":"test","value":123}';
        const formatted = DataSourceTableService.formatJsonContent(json);
        expect(formatted).toContain('\n');
        expect(formatted).toContain('  ');
      });

      it('should return original content for invalid JSON', () => {
        const invalid = 'not json';
        expect(DataSourceTableService.formatJsonContent(invalid)).toBe(invalid);
      });
    });
  });
});