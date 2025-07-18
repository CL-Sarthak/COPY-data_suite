import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SourceNodeConfig } from '../components/NodeTypeConfigurations/SourceNodeConfig';
import { NodeConfig, ConfigurationResources, ValidationState } from '../types';
import { PipelineNode } from '@/types/pipeline';

describe('SourceNodeConfig', () => {
  const mockOnConfigChange = jest.fn();
  
  const defaultConfig: NodeConfig = {
    type: 'database',
    connectionString: '',
    table: ''
  };

  const defaultNode: PipelineNode = {
    id: 'test-node',
    type: 'custom',
    position: { x: 0, y: 0 },
    data: {
      label: 'Test Source',
      nodeType: 'source',
      category: 'database',
      config: defaultConfig
    }
  };

  const defaultResources: ConfigurationResources = {
    dataSources: [],
    patterns: [],
    syntheticTemplates: {},
    isLoading: false,
    error: null
  };

  const defaultValidation: ValidationState = {
    isValid: true,
    errors: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render database configuration', () => {
    render(
      <SourceNodeConfig
        node={defaultNode}
        config={defaultConfig}
        resources={defaultResources}
        validation={defaultValidation}
        onConfigChange={mockOnConfigChange}
      />
    );

    expect(screen.getByText('Connection String')).toBeInTheDocument();
    expect(screen.getByText('Table Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('postgresql://user:password@host:port/database')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('users')).toBeInTheDocument();
  });

  it('should call onConfigChange when connection string changes', () => {
    render(
      <SourceNodeConfig
        node={defaultNode}
        config={defaultConfig}
        resources={defaultResources}
        validation={defaultValidation}
        onConfigChange={mockOnConfigChange}
      />
    );

    const input = screen.getByPlaceholderText('postgresql://user:password@host:port/database');
    fireEvent.change(input, { target: { value: 'postgresql://localhost:5432/db' } });

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      connectionString: 'postgresql://localhost:5432/db'
    });
  });

  it('should render API configuration when category is api', () => {
    const apiNode: PipelineNode = {
      ...defaultNode,
      data: {
        ...defaultNode.data,
        category: 'api'
      }
    };
    const apiConfig: NodeConfig = {
      endpoint: 'https://api.example.com/data',
      method: 'GET',
      headers: {}
    };

    render(
      <SourceNodeConfig
        node={apiNode}
        config={apiConfig}
        resources={defaultResources}
        validation={defaultValidation}
        onConfigChange={mockOnConfigChange}
      />
    );

    expect(screen.getByText('API Endpoint')).toBeInTheDocument();
    expect(screen.getByText('HTTP Method')).toBeInTheDocument();
  });

  it('should render file configuration when category is file', () => {
    const fileNode: PipelineNode = {
      ...defaultNode,
      data: {
        ...defaultNode.data,
        category: 'file'
      }
    };
    const fileConfig: NodeConfig = {
      dataSourceId: 'test-id'
    };

    render(
      <SourceNodeConfig
        node={fileNode}
        config={fileConfig}
        resources={defaultResources}
        validation={defaultValidation}
        onConfigChange={mockOnConfigChange}
      />
    );

    expect(screen.getByText('Data Source')).toBeInTheDocument();
    expect(screen.getByText('Select a data source')).toBeInTheDocument();
  });

  it('should display validation errors', () => {
    const validationWithErrors: ValidationState = {
      isValid: false,
      errors: {
        connectionString: 'Database connection string is required',
        table: 'Table name is required'
      }
    };

    render(
      <SourceNodeConfig
        node={defaultNode}
        config={defaultConfig}
        resources={defaultResources}
        validation={validationWithErrors}
        onConfigChange={mockOnConfigChange}
      />
    );

    expect(screen.getByText('Database connection string is required')).toBeInTheDocument();
    expect(screen.getByText('Table name is required')).toBeInTheDocument();
  });

  it('should update table name', () => {
    render(
      <SourceNodeConfig
        node={defaultNode}
        config={defaultConfig}
        resources={defaultResources}
        validation={defaultValidation}
        onConfigChange={mockOnConfigChange}
      />
    );

    const input = screen.getByPlaceholderText('users');
    fireEvent.change(input, { target: { value: 'users' } });

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      table: 'users'
    });
  });

  it('should render stream configuration when category is stream', () => {
    const streamNode: PipelineNode = {
      ...defaultNode,
      data: {
        ...defaultNode.data,
        category: 'stream'
      }
    };
    const streamConfig: NodeConfig = {
      topic: 'test-topic',
      brokers: 'localhost:9092'
    };

    render(
      <SourceNodeConfig
        node={streamNode}
        config={streamConfig}
        resources={defaultResources}
        validation={defaultValidation}
        onConfigChange={mockOnConfigChange}
      />
    );

    expect(screen.getByText('Stream Topic')).toBeInTheDocument();
    expect(screen.getByText('Broker URL')).toBeInTheDocument();
  });

  it('should handle missing category gracefully', () => {
    const nodeWithoutCategory: PipelineNode = {
      ...defaultNode,
      data: {
        ...defaultNode.data,
        category: undefined as any
      }
    };

    render(
      <SourceNodeConfig
        node={nodeWithoutCategory}
        config={defaultConfig}
        resources={defaultResources}
        validation={defaultValidation}
        onConfigChange={mockOnConfigChange}
      />
    );

    expect(screen.getByText(/No configuration available/)).toBeInTheDocument();
  });
});