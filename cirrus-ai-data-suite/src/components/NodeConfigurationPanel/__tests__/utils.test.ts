import { describe, it, expect } from '@jest/globals';
import {
  validateNodeConfig,
  getDefaultNodeConfig,
  isConfigValid
} from '../utils';
import { NodeConfig } from '../types';

describe('NodeConfigurationPanel utils', () => {
  describe('validateNodeConfig', () => {
    it('should return no errors for valid data source config', () => {
      const config: NodeConfig = {
        type: 'database',
        connectionString: 'postgresql://localhost:5432/db',
        query: 'SELECT * FROM users'
      };
      
      const errors = validateNodeConfig('data', config);
      expect(errors).toEqual({});
    });

    it('should return errors for missing required fields', () => {
      const config: NodeConfig = {
        type: 'database'
      };
      
      const errors = validateNodeConfig('data', config);
      expect(errors.connectionString).toBe('Connection string is required');
    });

    it('should validate API endpoint URL', () => {
      const config: NodeConfig = {
        endpoint: 'not-a-url',
        method: 'GET'
      };
      
      const errors = validateNodeConfig('data', config);
      expect(errors.endpoint).toBe('Please enter a valid URL');
    });

    it('should validate transform script', () => {
      const config: NodeConfig = {
        transformType: 'custom',
        script: ''
      };
      
      const errors = validateNodeConfig('transform', config);
      expect(errors.script).toBe('Transform script is required');
    });

    it('should validate privacy patterns', () => {
      const config: NodeConfig = {
        patterns: []
      };
      
      const errors = validateNodeConfig('privacy', config);
      expect(errors.patterns).toBe('At least one privacy pattern is required');
    });

    it('should validate output format', () => {
      const config: NodeConfig = {
        format: undefined,
        destination: 'output.json'
      };
      
      const errors = validateNodeConfig('output', config);
      expect(errors.format).toBe('Output format is required');
    });
  });

  describe('getDefaultNodeConfig', () => {
    it('should return database config defaults for data source node', () => {
      const config = getDefaultNodeConfig('data');
      expect(config).toEqual({
        type: 'database',
        connectionString: '',
        query: ''
      });
    });

    it('should return transform config defaults', () => {
      const config = getDefaultNodeConfig('transform');
      expect(config).toEqual({
        script: '',
        inputFields: [],
        outputFields: []
      });
    });

    it('should return privacy config defaults', () => {
      const config = getDefaultNodeConfig('privacy');
      expect(config).toEqual({
        patterns: [],
        action: 'redact'
      });
    });

    it('should return output config defaults', () => {
      const config = getDefaultNodeConfig('output');
      expect(config).toEqual({
        format: 'json',
        destination: '',
        options: {}
      });
    });

    it('should return empty config for unknown node type', () => {
      const config = getDefaultNodeConfig('unknown');
      expect(config).toEqual({});
    });
  });

  describe('isConfigValid', () => {
    it('should return true for valid database config', () => {
      const config: NodeConfig = {
        type: 'database',
        connectionString: 'postgresql://localhost:5432/db',
        query: 'SELECT * FROM users'
      };
      
      expect(isConfigValid('data', config)).toBe(true);
    });

    it('should return false for invalid config', () => {
      const config: NodeConfig = {
        type: 'database'
      };
      
      expect(isConfigValid('data', config)).toBe(false);
    });

    it('should return true for valid API config', () => {
      const config: NodeConfig = {
        endpoint: 'https://api.example.com/data',
        method: 'GET',
        headers: {}
      };
      
      expect(isConfigValid('data', config)).toBe(true);
    });

    it('should return false for invalid transform config', () => {
      const config: NodeConfig = {
        transformType: 'custom',
        script: '',
        inputFields: [],
        outputFields: []
      };
      
      expect(isConfigValid('transform', config)).toBe(false);
    });
  });
});