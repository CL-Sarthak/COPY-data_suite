import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FieldMappingInterface } from '../fieldMapping/FieldMappingInterface';
import { ToastProvider } from '@/contexts/ToastContext';

// Mock the useFieldMapping hook
jest.mock('@/hooks/useFieldMapping', () => ({
  useFieldMapping: () => ({
    catalogFields: [],
    categories: [],
    mappings: [],
    suggestions: [],
    actualSourceFields: ['field1', 'field2'],
    loading: false,
    autoMapping: false,
    transforming: false,
    creatingField: false,
    selectedCategory: 'all',
    setSelectedCategory: jest.fn(),
    searchQuery: '',
    setSearchQuery: jest.fn(),
    selectedSourceField: null,
    setSelectedSourceField: jest.fn(),
    showCreateFieldModal: false,
    setShowCreateFieldModal: jest.fn(),
    showTransformModal: false,
    setShowTransformModal: jest.fn(),
    newFieldData: {
      name: '',
      displayName: '',
      description: '',
      dataType: 'text',
      category: 'custom',
      isRequired: false,
      tags: ''
    },
    setNewFieldData: jest.fn(),
    transformationResult: null,
    filteredSourceFields: ['field1', 'field2'],
    filteredCatalogFields: [],
    mappedFieldsCount: 0,
    unmappedFieldsCount: 2,
    mappingProgress: 0,
    updateMapping: jest.fn(),
    createField: jest.fn(),
    autoMapFields: jest.fn(),
    generateSuggestions: jest.fn(),
    transformData: jest.fn(),
    exportData: jest.fn(),
    error: null
  })
}));

describe('FieldMappingInterface', () => {
  it('renders without crashing', () => {
    render(
      <ToastProvider>
        <FieldMappingInterface
          sourceId="test-source"
          sourceFields={['field1', 'field2']}
          onMappingsChanged={jest.fn()}
        />
      </ToastProvider>
    );
    
    expect(screen.getByText('Field Mapping')).toBeInTheDocument();
  });
});