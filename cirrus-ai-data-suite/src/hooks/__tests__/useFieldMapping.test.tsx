import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFieldMapping } from '../useFieldMapping';
import { FieldMappingService } from '@/services/fieldMappingService';
import { ToastProvider } from '@/contexts/ToastContext';

// Suppress React 18 act warnings for these tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock the service
jest.mock('@/services/fieldMappingService');

// Mock toast context
jest.mock('@/contexts/ToastContext', () => ({
  ...jest.requireActual('@/contexts/ToastContext'),
  useToastActions: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn()
  })
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('useFieldMapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for loadSourceFields
    (FieldMappingService.loadSourceFields as jest.Mock).mockResolvedValue([]);
  });

  const mockCatalogData = {
    fields: [
      {
        id: '1',
        name: 'email',
        displayName: 'Email',
        description: 'Email address',
        dataType: 'string',
        category: 'contact',
        tags: ['pii'],
        isRequired: true
      },
      {
        id: '2',
        name: 'phone',
        displayName: 'Phone',
        description: 'Phone number',
        dataType: 'string',
        category: 'contact',
        tags: ['pii'],
        isRequired: false
      }
    ],
    categories: [
      {
        id: '1',
        name: 'contact',
        displayName: 'Contact',
        color: '#3b82f6',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  };

  const mockMappings = [
    {
      id: '1',
      sourceId: 'source123',
      sourceFieldName: 'customer_email',
      catalogFieldId: '1',
      confidence: 0.9,
      isManual: false
    }
  ];

  it('should load initial data on mount', async () => {
    (FieldMappingService.loadCatalogData as jest.Mock).mockResolvedValue(mockCatalogData);
    (FieldMappingService.loadMappings as jest.Mock).mockResolvedValue(mockMappings);
    (FieldMappingService.loadSourceFields as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(
      () => useFieldMapping({ 
        sourceId: 'source123', 
        sourceFields: ['customer_email', 'customer_phone'] 
      }),
      { wrapper }
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.catalogFields).toEqual(mockCatalogData.fields);
    expect(result.current.categories).toEqual(mockCatalogData.categories);
    expect(result.current.mappings).toEqual(mockMappings);
    expect(result.current.actualSourceFields).toEqual(['customer_email', 'customer_phone']);
  });

  it('should filter catalog fields by category', async () => {
    (FieldMappingService.loadCatalogData as jest.Mock).mockResolvedValue(mockCatalogData);
    (FieldMappingService.loadMappings as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(
      () => useFieldMapping({ sourceId: 'source123' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Initially all fields are shown
    expect(result.current.filteredCatalogFields).toHaveLength(2);

    // Filter by category
    act(() => {
      result.current.setSelectedCategory('contact');
    });

    expect(result.current.filteredCatalogFields).toHaveLength(2);

    // Filter by non-existent category
    act(() => {
      result.current.setSelectedCategory('personal');
    });

    expect(result.current.filteredCatalogFields).toHaveLength(0);
  });

  it('should filter catalog fields by search query', async () => {
    (FieldMappingService.loadCatalogData as jest.Mock).mockResolvedValue(mockCatalogData);
    (FieldMappingService.loadMappings as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(
      () => useFieldMapping({ sourceId: 'source123' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Search for email
    act(() => {
      result.current.setSearchQuery('email');
    });

    expect(result.current.filteredCatalogFields).toHaveLength(1);
    expect(result.current.filteredCatalogFields[0].name).toBe('email');

    // Search for phone
    act(() => {
      result.current.setSearchQuery('phone');
    });

    expect(result.current.filteredCatalogFields).toHaveLength(1);
    expect(result.current.filteredCatalogFields[0].name).toBe('phone');

    // Search for non-existent field
    act(() => {
      result.current.setSearchQuery('xyz123');
    });

    expect(result.current.filteredCatalogFields).toHaveLength(0);
  });

  it('should generate suggestions', async () => {
    (FieldMappingService.loadCatalogData as jest.Mock).mockResolvedValue(mockCatalogData);
    (FieldMappingService.loadMappings as jest.Mock).mockResolvedValue([]);
    
    const mockSuggestions = [
      {
        sourceFieldName: 'customer_email',
        suggestedMappings: [
          {
            field: mockCatalogData.fields[0],
            confidence: 0.9,
            reason: 'Field name similarity'
          }
        ]
      }
    ];
    
    (FieldMappingService.generateSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);

    const { result } = renderHook(
      () => useFieldMapping({ 
        sourceId: 'source123',
        sourceFields: ['customer_email']
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.generateSuggestions();
    });

    expect(result.current.suggestions).toEqual(mockSuggestions);
    expect(FieldMappingService.generateSuggestions).toHaveBeenCalledWith('source123', ['customer_email']);
  });

  it('should update mapping', async () => {
    (FieldMappingService.loadCatalogData as jest.Mock).mockResolvedValue(mockCatalogData);
    (FieldMappingService.loadMappings as jest.Mock).mockResolvedValue([]);
    (FieldMappingService.updateMapping as jest.Mock).mockResolvedValue(undefined);

    const onMappingsChanged = jest.fn();
    const { result } = renderHook(
      () => useFieldMapping({ 
        sourceId: 'source123',
        sourceFields: ['customer_email'],
        onMappingsChanged
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateMapping('customer_email', '1');
    });

    expect(FieldMappingService.updateMapping).toHaveBeenCalledWith('source123', 'customer_email', '1');
    expect(onMappingsChanged).toHaveBeenCalled();
    expect(result.current.mappings).toHaveLength(1);
    expect(result.current.mappings[0]).toMatchObject({
      sourceFieldName: 'customer_email',
      catalogFieldId: '1',
      isManual: true,
      confidence: 1.0
    });
  });

  it('should remove mapping when catalogFieldId is null', async () => {
    (FieldMappingService.loadCatalogData as jest.Mock).mockResolvedValue(mockCatalogData);
    (FieldMappingService.loadMappings as jest.Mock).mockResolvedValue(mockMappings);
    (FieldMappingService.updateMapping as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(
      () => useFieldMapping({ sourceId: 'source123' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.mappings).toHaveLength(1);

    await act(async () => {
      await result.current.updateMapping('customer_email', null);
    });

    expect(FieldMappingService.updateMapping).toHaveBeenCalledWith('source123', 'customer_email', null);
    expect(result.current.mappings).toHaveLength(0);
  });

  it('should create new field', async () => {
    (FieldMappingService.loadCatalogData as jest.Mock).mockResolvedValue(mockCatalogData);
    (FieldMappingService.loadMappings as jest.Mock).mockResolvedValue([]);
    
    const newField = {
      id: '3',
      name: 'address',
      displayName: 'Address',
      description: 'Street address',
      dataType: 'string',
      category: 'contact',
      tags: ['pii'],
      isRequired: false
    };
    
    (FieldMappingService.createField as jest.Mock).mockResolvedValue(newField);
    (FieldMappingService.updateMapping as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(
      () => useFieldMapping({ sourceId: 'source123' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSelectedSourceField('customer_address');
      result.current.setNewFieldData({
        name: 'address',
        displayName: 'Address',
        description: 'Street address',
        dataType: 'string',
        category: 'contact',
        tags: 'pii',
        isRequired: false
      });
    });

    await act(async () => {
      await result.current.createField();
    });

    expect(FieldMappingService.createField).toHaveBeenCalled();
    expect(result.current.catalogFields).toContainEqual(newField);
    expect(FieldMappingService.updateMapping).toHaveBeenCalledWith('source123', 'customer_address', '3');
  });

  it('should transform data', async () => {
    (FieldMappingService.loadCatalogData as jest.Mock).mockResolvedValue(mockCatalogData);
    (FieldMappingService.loadMappings as jest.Mock).mockResolvedValue(mockMappings);
    
    const transformResult = {
      success: true,
      message: 'Transformation completed',
      transformedRecords: 100,
      fieldsMapped: 1,
      errors: [],
      warnings: []
    };
    
    (FieldMappingService.applyMappings as jest.Mock).mockResolvedValue(transformResult);

    const { result } = renderHook(
      () => useFieldMapping({ sourceId: 'source123' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.transformData();
    });

    expect(FieldMappingService.applyMappings).toHaveBeenCalledWith('source123');
    expect(result.current.transformationResult).toEqual(transformResult);
    expect(result.current.showTransformModal).toBe(true);
  });

  it('should export data', async () => {
    (FieldMappingService.loadCatalogData as jest.Mock).mockResolvedValue(mockCatalogData);
    (FieldMappingService.loadMappings as jest.Mock).mockResolvedValue(mockMappings);
    
    const mockBlob = new Blob(['test data'], { type: 'application/json' });
    (FieldMappingService.exportMappedData as jest.Mock).mockResolvedValue(mockBlob);

    // Mock DOM methods
    const mockClick = jest.fn();
    const mockCreateObjectURL = jest.fn(() => 'blob:url');
    const mockRevokeObjectURL = jest.fn();
    
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;

    // First render the hook
    const { result } = renderHook(
      () => useFieldMapping({ sourceId: 'source123' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Now mock createElement after React has finished rendering
    const originalCreateElement = document.createElement.bind(document);
    const mockCreateElement = jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        const anchor = originalCreateElement('a');
        anchor.click = mockClick;
        return anchor;
      }
      return originalCreateElement(tagName);
    });

    await act(async () => {
      await result.current.exportData('json');
    });

    expect(FieldMappingService.exportMappedData).toHaveBeenCalledWith('source123', 'json');
    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:url');

    // Cleanup
    mockCreateElement.mockRestore();
  });

  it('should calculate mapping progress correctly', async () => {
    (FieldMappingService.loadCatalogData as jest.Mock).mockResolvedValue(mockCatalogData);
    (FieldMappingService.loadMappings as jest.Mock).mockResolvedValue(mockMappings);

    const { result } = renderHook(
      () => useFieldMapping({ 
        sourceId: 'source123',
        sourceFields: ['customer_email', 'customer_phone', 'customer_name']
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.actualSourceFields).toHaveLength(3);
    expect(result.current.mappedFieldsCount).toBe(1);
    expect(result.current.unmappedFieldsCount).toBe(2);
    expect(result.current.mappingProgress).toBeCloseTo(33.33, 1);
  });

  it('should handle errors during data loading', async () => {
    const error = new Error('Failed to load data');
    (FieldMappingService.loadCatalogData as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(
      () => useFieldMapping({ sourceId: 'source123' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load data');
    expect(result.current.catalogFields).toEqual([]);
    expect(result.current.categories).toEqual([]);
  });
});