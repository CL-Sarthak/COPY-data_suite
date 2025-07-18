import { DataQuery, QueryResult, QueryMetadata } from '@/types/dataAnalysis';
import { DataSourceService } from './dataSourceService';
import { logger } from '@/utils/logger';

// Dynamic import for Node.js modules to prevent client-side bundling
const getVM = async () => {
  if (typeof window !== 'undefined') {
    throw new Error('CodeExecutionService cannot be used in the browser');
  }
  const vm = await import('vm');
  return vm.default || vm;
};

/**
 * Service for executing LLM-generated JavaScript code safely
 * This service can only run on the server side due to vm module usage
 */
export class CodeExecutionService {
  static {
    // Ensure this service is only used on the server
    if (typeof window !== 'undefined') {
      throw new Error('CodeExecutionService cannot be imported in browser code');
    }
  }
  /**
   * Execute JavaScript code query
   */
  static async executeCodeQuery(query: DataQuery): Promise<QueryResult> {
    const startTime = Date.now();
    const metadata: QueryMetadata = {
      recordsProcessed: 0,
      executionTime: 0,
      dataSources: []
    };

    try {
      if (!query.code) {
        return {
          success: false,
          error: 'No code provided for execution',
          query
        };
      }

      // Load data from sources
      const dataSets = await this.loadDataSets(query.sources, metadata);
      
      logger.info('Loaded data sets for code execution:', {
        dataSetNames: Object.keys(dataSets),
        recordCounts: Object.entries(dataSets).map(([name, records]) => ({
          name,
          count: records.length
        }))
      });
      
      // If no records loaded, return informative error
      const totalRecords = Object.values(dataSets).reduce((sum, records) => sum + records.length, 0);
      if (totalRecords === 0) {
        return {
          success: false,
          error: 'No data records available. The data source may be empty or truncated.',
          metadata,
          query
        };
      }
      
      // Create a safe execution context
      const sandbox = {
        // Data access
        data: dataSets,
        
        // Safe utilities
        console: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          log: (...args: any[]) => logger.info('Code execution log:', ...args)
        },
        
        // Math and Date utilities
        Math,
        Date,
        
        // Array methods
        Array,
        
        // JSON utilities
        JSON,
        
        // Helper functions for common operations
        utils: {
          // Calculate age from date
          calculateAge: (dateOfBirth: string | Date) => {
            const dob = new Date(dateOfBirth);
            const today = new Date();
            let age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
              age--;
            }
            return age;
          },
          
          // Group by key
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          groupBy: (array: any[], key: string) => {
            return array.reduce((result, item) => {
              const group = item[key];
              if (!result[group]) result[group] = [];
              result[group].push(item);
              return result;
            }, {});
          },
          
          // Calculate average
          average: (numbers: number[]) => {
            if (numbers.length === 0) return null;
            return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
          }
        },
        
        // Result variable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result: null as any
      };

      // Get VM module dynamically
      const vm = await getVM();
      
      // Create VM context
      const context = vm.createContext(sandbox);
      
      // Wrap code to capture result
      const wrappedCode = `
        try {
          ${query.code}
        } catch (error) {
          result = { error: error.message };
        }
      `;
      
      // Execute with timeout
      const script = new vm.Script(wrappedCode);
      script.runInContext(context, {
        timeout: 30000, // 30 second timeout
        displayErrors: true
      });
      
      metadata.executionTime = Date.now() - startTime;
      
      // Check if code set a result
      if (sandbox.result === null) {
        return {
          success: false,
          error: 'Code did not return a result. Please set the "result" variable.',
          metadata,
          query
        };
      }
      
      // Check for errors
      if (sandbox.result && typeof sandbox.result === 'object' && 'error' in sandbox.result) {
        return {
          success: false,
          error: (sandbox.result as { error: string }).error,
          metadata,
          query
        };
      }
      
      logger.info('Code execution result:', {
        resultType: typeof sandbox.result,
        resultKeys: sandbox.result && typeof sandbox.result === 'object' ? Object.keys(sandbox.result) : null,
        resultPreview: JSON.stringify(sandbox.result).substring(0, 200)
      });
      
      return {
        success: true,
        data: sandbox.result,
        metadata,
        query
      };
      
    } catch (error) {
      logger.error('Code execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Code execution failed',
        metadata: {
          ...metadata,
          executionTime: Date.now() - startTime
        },
        query
      };
    }
  }
  
  /**
   * Load data from sources into a format suitable for code execution
   */
  private static async loadDataSets(
    sourceIds: string[], 
    metadata: QueryMetadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<Record<string, any[]>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataSets: Record<string, any[]> = {};
    
    for (const sourceId of sourceIds) {
      try {
        const dataSource = await DataSourceService.getDataSourceById(sourceId, true);
        if (!dataSource) {
          logger.warn(`Data source not found: ${sourceId}`);
          continue;
        }
        
        // Get transformed data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let records: any[] = [];
        if (dataSource.transformedData) {
          const transformed = JSON.parse(dataSource.transformedData);
          
          logger.info(`Loading data for source ${dataSource.name}:`, {
            hasTransformedData: true,
            isArray: Array.isArray(transformed),
            hasRecords: !!transformed.records,
            recordsLength: transformed.records ? transformed.records.length : 0,
            hasData: !!transformed.data,
            dataLength: transformed.data ? transformed.data.length : 0,
            transformedKeys: Object.keys(transformed).slice(0, 10),
            savedRecordCount: transformed.savedRecordCount
          });
          
          // Extract records
          if (Array.isArray(transformed)) {
            records = transformed;
          } else if (transformed.records && Array.isArray(transformed.records)) {
            // Handle UnifiedDataCatalog structure
            logger.info(`Found ${transformed.records.length} records in UnifiedDataCatalog structure`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            records = transformed.records.map((r: any) => {
              // Log the first record structure to debug
              if (transformed.records.indexOf(r) === 0) {
                logger.info('First record structure:', {
                  hasData: !!r.data,
                  recordKeys: Object.keys(r).slice(0, 10),
                  dataKeys: r.data ? Object.keys(r.data).slice(0, 10) : []
                });
              }
              return r.data || r;
            });
            
            // Check if savedRecordCount indicates data was truncated
            if (transformed.savedRecordCount && records.length === 0 && transformed.totalRecords > 0) {
              logger.warn(`Data appears to be truncated. savedRecordCount: ${transformed.savedRecordCount}, totalRecords: ${transformed.totalRecords}`);
              // For now, we can't re-transform here, but we should handle this case
              // TODO: Implement re-transformation for truncated data
            }
          } else if (transformed.data && Array.isArray(transformed.data)) {
            records = transformed.data;
          } else if (typeof transformed === 'object') {
            // Check if the transformed data has any array properties that might be the records
            const possibleRecordKeys = Object.keys(transformed).filter(key => 
              Array.isArray(transformed[key]) && transformed[key].length > 0
            );
            if (possibleRecordKeys.length > 0) {
              // Use the first array property as records
              records = transformed[possibleRecordKeys[0]];
              logger.info(`Found records in property: ${possibleRecordKeys[0]}`);
            }
          }
        } else {
          logger.warn(`No transformed data for source ${dataSource.name}`);
        }
        
        // Use data source name as key
        const key = dataSource.name.replace(/[^a-zA-Z0-9]/g, '_');
        dataSets[key] = records;
        
        metadata.dataSources.push({
          id: dataSource.id,
          name: dataSource.name,
          recordCount: records.length
        });
        
        metadata.recordsProcessed += records.length;
        
      } catch (error) {
        logger.error(`Error loading data source ${sourceId}:`, error);
      }
    }
    
    return dataSets;
  }
}