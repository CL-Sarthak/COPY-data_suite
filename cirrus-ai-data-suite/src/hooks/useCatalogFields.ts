import { useState, useEffect, useCallback, useRef } from 'react';
import { CatalogField, FieldFormData } from '@/types/catalog';
import { CatalogFieldService } from '@/services/catalogFieldService';
import { useToastActions } from '@/contexts/ToastContext';

interface UseCatalogFieldsResult {
  fields: CatalogField[];
  loading: boolean;
  error: string | null;
  
  // CRUD operations
  createField: (formData: FieldFormData) => Promise<void>;
  updateField: (id: string, formData: FieldFormData) => Promise<void>;
  deleteField: (field: CatalogField) => Promise<void>;
  
  // UI state
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  showEditModal: boolean;
  setShowEditModal: (show: boolean) => void;
  editingField: CatalogField | null;
  setEditingField: (field: CatalogField | null) => void;
  
  // Actions
  refreshFields: () => Promise<void>;
}

export function useCatalogFields(): UseCatalogFieldsResult {
  const toast = useToastActions();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  
  const [fields, setFields] = useState<CatalogField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<CatalogField | null>(null);

  // Fetch fields
  const fetchFields = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await CatalogFieldService.fetchFields();
      setFields(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fields');
      toastRef.current.error('Failed to load catalog fields', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create field
  const createField = useCallback(async (formData: FieldFormData) => {
    try {
      // Validate
      const errors = CatalogFieldService.validateFieldData(formData);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      const newField = await CatalogFieldService.createField(formData);
      setFields(prev => [...prev, newField]);
      setShowCreateModal(false);
      toastRef.current.success('Field created successfully');
    } catch (err) {
      toastRef.current.error('Failed to create field', err instanceof Error ? err.message : undefined);
      throw err;
    }
  }, []);

  // Update field
  const updateField = useCallback(async (id: string, formData: FieldFormData) => {
    try {
      // Validate
      const errors = CatalogFieldService.validateFieldData(formData);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      const updatedField = await CatalogFieldService.updateField(id, formData);
      setFields(prev => prev.map(f => f.id === id ? updatedField : f));
      setShowEditModal(false);
      setEditingField(null);
      toastRef.current.success('Field updated successfully');
    } catch (err) {
      toastRef.current.error('Failed to update field', err instanceof Error ? err.message : undefined);
      throw err;
    }
  }, []);

  // Delete field
  const deleteField = useCallback(async (field: CatalogField) => {
    try {
      // For now, we'll use window.confirm as we don't have a confirm dialog
      const confirmed = window.confirm(`Are you sure you want to delete the field "${field.displayName}"? This action cannot be undone.`);

      if (confirmed) {
        await CatalogFieldService.deleteField(field.id);
        setFields(prev => prev.filter(f => f.id !== field.id));
        toastRef.current.success('Field deleted successfully');
      }
    } catch (err) {
      toastRef.current.error('Failed to delete field', err instanceof Error ? err.message : undefined);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  return {
    fields,
    loading,
    error,
    
    createField,
    updateField,
    deleteField,
    
    showCreateModal,
    setShowCreateModal,
    showEditModal,
    setShowEditModal,
    editingField,
    setEditingField,
    
    refreshFields: fetchFields
  };
}