import { DataAnalysisService } from '../dataAnalysisService';
import { DataSourceService } from '../dataSourceService';
import { DataQuery } from '@/types/dataAnalysis';

// Mock dependencies
jest.mock('../dataSourceService');
jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

describe('DataAnalysisService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeQuery', () => {
    it('should calculate average from data', async () => {
      // Mock data source
      const mockDataSource = {
        id: 'ds1',
        name: 'Patient Data',
        type: 'json_transformed',
        transformedData: JSON.stringify([
          { patient_id: 1, age: 25, name: 'John' },
          { patient_id: 2, age: 30, name: 'Jane' },
          { patient_id: 3, age: 35, name: 'Bob' },
          { patient_id: 4, age: 40, name: 'Alice' }
        ])
      };

      (DataSourceService.getDataSourceById as jest.Mock).mockResolvedValue(mockDataSource);

      const query: DataQuery = {
        type: 'analysis',
        sources: ['ds1'],
        operations: [{
          type: 'aggregate',
          aggregations: [{
            field: 'age',
            operation: 'avg',
            alias: 'average_age'
          }]
        }],
        output: { format: 'summary' }
      };

      const result = await DataAnalysisService.executeQuery(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ average_age: 32.5 });
      expect(result.metadata?.recordsProcessed).toBe(4);
    });

    it('should filter data before aggregation', async () => {
      // Mock data source
      const mockDataSource = {
        id: 'ds1',
        name: 'Patient Data',
        type: 'json_transformed',
        transformedData: JSON.stringify([
          { patient_id: 1, age: 25, name: 'John' },
          { patient_id: 2, age: 30, name: 'Jane' },
          { patient_id: 3, age: 35, name: 'Bob' },
          { patient_id: 4, age: 40, name: 'Alice' }
        ])
      };

      (DataSourceService.getDataSourceById as jest.Mock).mockResolvedValue(mockDataSource);

      const query: DataQuery = {
        type: 'analysis',
        sources: ['ds1'],
        operations: [
          {
            type: 'filter',
            conditions: [{
              field: 'age',
              operator: 'gt',
              value: 30
            }]
          },
          {
            type: 'aggregate',
            aggregations: [{
              field: 'age',
              operation: 'avg',
              alias: 'average_age_over_30'
            }]
          }
        ],
        output: { format: 'summary' }
      };

      const result = await DataAnalysisService.executeQuery(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ average_age_over_30: 37.5 }); // (35 + 40) / 2
    });

    it('should handle count aggregation', async () => {
      // Mock data source
      const mockDataSource = {
        id: 'ds1',
        name: 'Patient Data',
        type: 'json_transformed',
        transformedData: JSON.stringify([
          { patient_id: 1, age: 25, name: 'John' },
          { patient_id: 2, age: 30, name: 'Jane' },
          { patient_id: 3, age: 35, name: 'Bob' },
          { patient_id: 4, age: 40, name: 'Alice' }
        ])
      };

      (DataSourceService.getDataSourceById as jest.Mock).mockResolvedValue(mockDataSource);

      const query: DataQuery = {
        type: 'analysis',
        sources: ['ds1'],
        operations: [{
          type: 'aggregate',
          aggregations: [{
            field: '*',
            operation: 'count',
            alias: 'total_patients'
          }]
        }],
        output: { format: 'summary' }
      };

      const result = await DataAnalysisService.executeQuery(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ total_patients: 4 });
    });

    it('should handle group by with aggregation', async () => {
      // Mock data source
      const mockDataSource = {
        id: 'ds1',
        name: 'Sales Data',
        type: 'json_transformed',
        transformedData: JSON.stringify([
          { category: 'Electronics', amount: 100 },
          { category: 'Electronics', amount: 200 },
          { category: 'Clothing', amount: 50 },
          { category: 'Clothing', amount: 75 },
          { category: 'Food', amount: 25 }
        ])
      };

      (DataSourceService.getDataSourceById as jest.Mock).mockResolvedValue(mockDataSource);

      const query: DataQuery = {
        type: 'analysis',
        sources: ['ds1'],
        operations: [{
          type: 'aggregate',
          aggregations: [{
            field: 'amount',
            operation: 'sum',
            alias: 'total_amount'
          }],
          groupBy: ['category']
        }],
        output: { format: 'table' }
      };

      const result = await DataAnalysisService.executeQuery(query);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data).toContainEqual({ category: 'Electronics', total_amount: 300 });
      expect(result.data).toContainEqual({ category: 'Clothing', total_amount: 125 });
      expect(result.data).toContainEqual({ category: 'Food', total_amount: 25 });
    });

    it('should handle CSV data parsing', async () => {
      // Mock data source with CSV content
      const mockDataSource = {
        id: 'ds1',
        name: 'CSV Data',
        type: 'json_transformed',
        configuration: {
          content: 'name,age,city\nJohn,25,NYC\nJane,30,LA\nBob,35,Chicago'
        }
      };

      (DataSourceService.getDataSourceById as jest.Mock).mockResolvedValue(mockDataSource);

      const query: DataQuery = {
        type: 'analysis',
        sources: ['ds1'],
        operations: [{
          type: 'aggregate',
          aggregations: [{
            field: 'age',
            operation: 'avg',
            alias: 'average_age'
          }]
        }],
        output: { format: 'summary' }
      };

      const result = await DataAnalysisService.executeQuery(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ average_age: 30 });
    });

    it('should handle invalid queries', async () => {
      const query: DataQuery = {
        type: 'analysis',
        sources: [], // Empty sources
        operations: [{
          type: 'aggregate',
          aggregations: [{
            field: 'age',
            operation: 'avg',
            alias: 'average_age'
          }]
        }],
        output: { format: 'summary' }
      };

      const result = await DataAnalysisService.executeQuery(query);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No data sources specified');
    });

    it('should handle missing data sources gracefully', async () => {
      (DataSourceService.getDataSourceById as jest.Mock).mockResolvedValue(null);

      const query: DataQuery = {
        type: 'analysis',
        sources: ['non-existent'],
        operations: [{
          type: 'aggregate',
          aggregations: [{
            field: 'age',
            operation: 'avg',
            alias: 'average_age'
          }]
        }],
        output: { format: 'summary' }
      };

      const result = await DataAnalysisService.executeQuery(query);

      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
      expect(result.metadata?.warnings).toContain('No data found in specified sources');
    });
  });
});