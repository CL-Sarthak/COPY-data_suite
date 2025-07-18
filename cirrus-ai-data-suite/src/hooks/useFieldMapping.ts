import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useToastActions } from '@/contexts/ToastContext';
import { FieldMappingService } from '@/services/fieldMappingService';
import {
  CatalogField,
  CatalogCategory,
  FieldMapping,
  MappingSuggestion,
  TransformationResult,
  ConfirmationData,
  NewFieldFormData,
  DEFAULT_NEW_FIELD_DATA
} from '@/types/fieldMapping';

interface UseFieldMappingProps {
  sourceId: string;
  sourceFields?: string[];
  onMappingsChanged?: () => void;
}

interface UseFieldMappingResult {
  // Data
  catalogFields: CatalogField[];
  categories: CatalogCategory[];
  mappings: FieldMapping[];
  suggestions: MappingSuggestion[];
  actualSourceFields: string[];
  
  // Loading states
  loading: boolean;
  autoMapping: boolean;
  transforming: boolean;
  creatingField: boolean;
  
  // UI state
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedSourceField: string | null;
  setSelectedSourceField: (field: string | null) => void;
  showCreateFieldModal: boolean;
  setShowCreateFieldModal: (show: boolean) => void;
  showTransformModal: boolean;
  setShowTransformModal: (show: boolean) => void;
  showConfirmationModal: boolean;
  setShowConfirmationModal: (show: boolean) => void;
  
  // Form data
  newFieldData: NewFieldFormData;
  setNewFieldData: (data: NewFieldFormData) => void;
  
  // Results
  transformationResult: TransformationResult | null;
  confirmationData: ConfirmationData | null;
  error: string | null;
  
  // Actions
  loadData: () => Promise<void>;
  generateSuggestions: () => Promise<void>;
  applyAllSuggestions: () => Promise<void>;
  updateMapping: (sourceField: string, catalogFieldId: string | null) => Promise<void>;
  createField: () => Promise<void>;
  transformData: () => Promise<void>;
  exportData: (format: 'json' | 'csv') => Promise<void>;
  
  // Computed
  filteredCatalogFields: CatalogField[];
  mappedFieldsCount: number;
  unmappedFieldsCount: number;
  mappingProgress: number;
}

export function useFieldMapping({
  sourceId,
  sourceFields = [],
  onMappingsChanged
}: UseFieldMappingProps): UseFieldMappingResult {
  const toast = useToastActions();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  
  // Memoize sourceFields to prevent unnecessary re-renders
  const memoizedSourceFields = useMemo(() => sourceFields || [], [sourceFields]);

  // Data state
  const [catalogFields, setCatalogFields] = useState<CatalogField[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [actualSourceFields, setActualSourceFields] = useState<string[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [autoMapping, setAutoMapping] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const [creatingField, setCreatingField] = useState(false);
  
  // UI state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSourceField, setSelectedSourceField] = useState<string | null>(null);
  const [showCreateFieldModal, setShowCreateFieldModal] = useState(false);
  const [showTransformModal, setShowTransformModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  
  // Form data
  const [newFieldData, setNewFieldData] = useState<NewFieldFormData>(DEFAULT_NEW_FIELD_DATA);
  
  // Results
  const [transformationResult, setTransformationResult] = useState<TransformationResult | null>(null);
  const [confirmationData] = useState<ConfirmationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load catalog data, mappings, and source fields in parallel
      const [catalogData, existingMappings, sourceFieldsFromData] = await Promise.all([
        FieldMappingService.loadCatalogData(),
        FieldMappingService.loadMappings(sourceId),
        FieldMappingService.loadSourceFields(sourceId)
      ]);

      setCatalogFields(catalogData.fields);
      setCategories(catalogData.categories);
      setMappings(existingMappings);

      // Combine all sources of field names: props, existing mappings, and actual data
      const mappedFieldNames = existingMappings.map(m => m.sourceFieldName);
      const allFieldNames = new Set<string>([
        ...memoizedSourceFields,
        ...mappedFieldNames,
        ...sourceFieldsFromData
      ]);
      
      setActualSourceFields(Array.from(allFieldNames).sort());

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
      toastRef.current.error('Failed to load mapping data', message);
    } finally {
      setLoading(false);
    }
  }, [sourceId, memoizedSourceFields]);

  // Generate AI suggestions
  const generateSuggestions = useCallback(async () => {
    try {
      setAutoMapping(true);
      const suggestions = await FieldMappingService.generateSuggestions(sourceId, actualSourceFields);
      setSuggestions(suggestions);
      toastRef.current.success('Suggestions generated successfully');
    } catch (err) {
      toastRef.current.error('Failed to generate suggestions', err instanceof Error ? err.message : undefined);
    } finally {
      setAutoMapping(false);
    }
  }, [sourceId, actualSourceFields]);

  // Apply all suggestions
  const applyAllSuggestions = useCallback(async () => {
    try {
      setAutoMapping(true);
      await FieldMappingService.applyAllSuggestions(sourceId, suggestions);
      toastRef.current.success('All suggestions applied successfully');
      
      // Reload mappings
      await loadData();
      setSuggestions([]);
      
      onMappingsChanged?.();
    } catch (err) {
      toastRef.current.error('Failed to apply suggestions', err instanceof Error ? err.message : undefined);
    } finally {
      setAutoMapping(false);
    }
  }, [sourceId, suggestions, loadData, onMappingsChanged]);

  // Update single mapping
  const updateMapping = useCallback(async (sourceField: string, catalogFieldId: string | null) => {
    try {
      await FieldMappingService.updateMapping(sourceId, sourceField, catalogFieldId);
      
      // Update local state
      setMappings(prev => {
        const existing = prev.find(m => m.sourceFieldName === sourceField);
        if (catalogFieldId === null) {
          return prev.filter(m => m.sourceFieldName !== sourceField);
        }
        
        if (existing) {
          return prev.map(m => 
            m.sourceFieldName === sourceField 
              ? { ...m, catalogFieldId, isManual: true, confidence: 1.0 }
              : m
          );
        } else {
          return [...prev, {
            id: Date.now().toString(),
            sourceId,
            sourceFieldName: sourceField,
            catalogFieldId,
            confidence: 1.0,
            isManual: true
          }];
        }
      });
      
      onMappingsChanged?.();
    } catch (err) {
      toastRef.current.error('Failed to update mapping', err instanceof Error ? err.message : undefined);
    }
  }, [sourceId, onMappingsChanged]);

  // Create new field
  const createField = useCallback(async () => {
    try {
      setCreatingField(true);
      
      // Validate field name
      const nameError = FieldMappingService.validateFieldName(newFieldData.name);
      if (nameError) {
        throw new Error(nameError);
      }

      const newField = await FieldMappingService.createField(newFieldData);
      
      // Add to local state
      setCatalogFields(prev => [...prev, newField]);
      
      // Map to selected source field if any
      if (selectedSourceField) {
        await updateMapping(selectedSourceField, newField.id);
      }
      
      // Reset form
      setNewFieldData(DEFAULT_NEW_FIELD_DATA);
      setShowCreateFieldModal(false);
      setSelectedSourceField(null);
      
      toastRef.current.success('Field created successfully');
    } catch (err) {
      toastRef.current.error('Failed to create field', err instanceof Error ? err.message : undefined);
    } finally {
      setCreatingField(false);
    }
  }, [newFieldData, selectedSourceField, updateMapping]);

  // Transform data
  const transformData = useCallback(async () => {
    try {
      setTransforming(true);
      setShowTransformModal(true);
      
      const result = await FieldMappingService.applyMappings(sourceId);
      setTransformationResult(result);
      
      if (result.success) {
        toastRef.current.success(`Successfully transformed ${result.transformedRecords} records`);
        // Call onMappingsChanged to refresh the parent component
        onMappingsChanged?.();
      } else {
        toastRef.current.error('Transformation completed with errors');
      }
    } catch (err) {
      toastRef.current.error('Failed to transform data', err instanceof Error ? err.message : undefined);
      setShowTransformModal(false);
    } finally {
      setTransforming(false);
    }
  }, [sourceId, onMappingsChanged]);

  // Export data
  const exportData = useCallback(async (format: 'json' | 'csv') => {
    try {
      const blob = await FieldMappingService.exportMappedData(sourceId, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mapped-data.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toastRef.current.success(`Data exported as ${format.toUpperCase()}`);
    } catch (err) {
      toastRef.current.error('Failed to export data', err instanceof Error ? err.message : undefined);
    }
  }, [sourceId]);

  // Filter catalog fields
  const filteredCatalogFields = catalogFields.filter(field => {
    // Category filter
    if (selectedCategory !== 'all' && field.category !== selectedCategory) {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        field.name.toLowerCase().includes(query) ||
        field.displayName.toLowerCase().includes(query) ||
        field.description.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Computed values
  const mappedFieldsCount = mappings.length;
  const unmappedFieldsCount = actualSourceFields.length - mappedFieldsCount;
  const mappingProgress = actualSourceFields.length > 0 
    ? (mappedFieldsCount / actualSourceFields.length) * 100 
    : 0;

  // Initial load - only run once when component mounts or sourceId changes
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]); // Only depend on sourceId, not loadData

  return {
    // Data
    catalogFields,
    categories,
    mappings,
    suggestions,
    actualSourceFields,
    
    // Loading states
    loading,
    autoMapping,
    transforming,
    creatingField,
    
    // UI state
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectedSourceField,
    setSelectedSourceField,
    showCreateFieldModal,
    setShowCreateFieldModal,
    showTransformModal,
    setShowTransformModal,
    showConfirmationModal,
    setShowConfirmationModal,
    
    // Form data
    newFieldData,
    setNewFieldData,
    
    // Results
    transformationResult,
    confirmationData,
    error,
    
    // Actions
    loadData,
    generateSuggestions,
    applyAllSuggestions,
    updateMapping,
    createField,
    transformData,
    exportData,
    
    // Computed
    filteredCatalogFields,
    mappedFieldsCount,
    unmappedFieldsCount,
    mappingProgress
  };
}