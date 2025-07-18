// Test type definitions and validation
describe('Type Validation', () => {
  describe('Pattern types', () => {
    const validPatternTypes = ['PII', 'FINANCIAL', 'MEDICAL', 'CLASSIFICATION', 'CUSTOM'];
    
    it('should validate pattern types', () => {
      const isValidPatternType = (type: string): boolean => {
        return validPatternTypes.includes(type);
      };
      
      validPatternTypes.forEach(type => {
        expect(isValidPatternType(type)).toBe(true);
      });
      
      expect(isValidPatternType('INVALID')).toBe(false);
      expect(isValidPatternType('')).toBe(false);
      expect(isValidPatternType('pii')).toBe(false); // case sensitive
    });
  });

  describe('Data source types', () => {
    const validDataSourceTypes = ['database', 'filesystem', 's3', 'azure', 'gcp', 'api', 'json_transformed'];
    
    it('should validate data source types', () => {
      const isValidDataSourceType = (type: string): boolean => {
        return validDataSourceTypes.includes(type);
      };
      
      validDataSourceTypes.forEach(type => {
        expect(isValidDataSourceType(type)).toBe(true);
      });
      
      expect(isValidDataSourceType('invalid')).toBe(false);
      expect(isValidDataSourceType('DATABASE')).toBe(false); // case sensitive
    });
  });

  describe('Connection status types', () => {
    const validConnectionStatuses = ['connected', 'connecting', 'error', 'disconnected'];
    
    it('should validate connection statuses', () => {
      const isValidConnectionStatus = (status: string): boolean => {
        return validConnectionStatuses.includes(status);
      };
      
      validConnectionStatuses.forEach(status => {
        expect(isValidConnectionStatus(status)).toBe(true);
      });
      
      expect(isValidConnectionStatus('invalid')).toBe(false);
      expect(isValidConnectionStatus('CONNECTED')).toBe(false);
    });
  });

  describe('File type validation', () => {
    const supportedFileTypes = [
      'text/plain',
      'text/csv', 
      'application/json',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    it('should validate supported file types', () => {
      const isSupportedFileType = (type: string): boolean => {
        return supportedFileTypes.includes(type);
      };
      
      supportedFileTypes.forEach(type => {
        expect(isSupportedFileType(type)).toBe(true);
      });
      
      expect(isSupportedFileType('image/png')).toBe(false);
      expect(isSupportedFileType('video/mp4')).toBe(false);
      expect(isSupportedFileType('')).toBe(false);
    });
  });

  describe('Configuration validation', () => {
    it('should validate database configuration', () => {
      const validateDatabaseConfig = (config: { host?: string; database?: string; port?: number }): boolean => {
        return !!(config.host && config.database);
      };
      
      expect(validateDatabaseConfig({
        host: 'localhost',
        database: 'test'
      })).toBe(true);
      
      expect(validateDatabaseConfig({
        host: 'localhost',
        database: 'test',
        port: 5432
      })).toBe(true);
      
      expect(validateDatabaseConfig({
        host: 'localhost'
      })).toBe(false);
      
      expect(validateDatabaseConfig({})).toBe(false);
    });

    it('should validate filesystem configuration', () => {
      const validateFilesystemConfig = (config: { files?: Array<{ name: string; content: string }> }): boolean => {
        return !!(config.files && config.files.length > 0 && config.files.every(f => f.name && f.content));
      };
      
      expect(validateFilesystemConfig({
        files: [
          { name: 'test.txt', content: 'test content' }
        ]
      })).toBe(true);
      
      expect(validateFilesystemConfig({
        files: []
      })).toBe(false);
      
      expect(validateFilesystemConfig({})).toBe(false);
      
      expect(validateFilesystemConfig({
        files: [
          { name: '', content: 'test' }
        ]
      })).toBe(false);
    });
  });

  describe('Environment validation', () => {
    it('should validate environment variables', () => {
      const validateEnvironment = (env: { NODE_ENV?: string; DATABASE_URL?: string }): { isValid: boolean; issues: string[] } => {
        const issues: string[] = [];
        
        if (!env.NODE_ENV) {
          issues.push('NODE_ENV is required');
        } else if (!['development', 'production', 'test'].includes(env.NODE_ENV)) {
          issues.push('NODE_ENV must be development, production, or test');
        }
        
        if (env.NODE_ENV === 'production' && !env.DATABASE_URL) {
          issues.push('DATABASE_URL is recommended for production');
        }
        
        return {
          isValid: issues.length === 0,
          issues
        };
      };
      
      expect(validateEnvironment({
        NODE_ENV: 'development'
      })).toEqual({
        isValid: true,
        issues: []
      });
      
      expect(validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://...'
      })).toEqual({
        isValid: true,
        issues: []
      });
      
      expect(validateEnvironment({})).toEqual({
        isValid: false,
        issues: ['NODE_ENV is required']
      });
      
      expect(validateEnvironment({
        NODE_ENV: 'invalid'
      })).toEqual({
        isValid: false,
        issues: ['NODE_ENV must be development, production, or test']
      });
    });
  });
});