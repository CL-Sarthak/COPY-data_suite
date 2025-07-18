import { useState, useEffect, useCallback, useRef } from 'react';
import { Category, CategoryFormData, CatalogField } from '@/types/catalog';
import { CatalogCategoryService } from '@/services/catalogCategoryService';
import { useToastActions } from '@/contexts/ToastContext';

interface UseCatalogCategoriesResult {
  categories: Category[];
  loading: boolean;
  error: string | null;
  
  // CRUD operations
  createCategory: (formData: CategoryFormData) => Promise<void>;
  updateCategory: (id: string, formData: CategoryFormData) => Promise<void>;
  deleteCategory: (category: Category) => Promise<void>;
  initializeStandardCatalog: () => Promise<void>;
  
  // UI state
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  showEditModal: boolean;
  setShowEditModal: (show: boolean) => void;
  editingCategory: Category | null;
  setEditingCategory: (category: Category | null) => void;
  
  // Utils
  updateCategoryCounts: (fields: CatalogField[]) => void;
  refreshCategories: () => Promise<void>;
}

export function useCatalogCategories(): UseCatalogCategoriesResult {
  const toast = useToastActions();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await CatalogCategoryService.fetchCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      toastRef.current.error('Failed to load categories', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize standard catalog
  const initializeStandardCatalog = useCallback(async () => {
    try {
      await CatalogCategoryService.initializeStandardCatalog();
      await fetchCategories();
      toastRef.current.success('Standard catalog initialized successfully');
    } catch (err) {
      toastRef.current.error('Failed to initialize catalog', err instanceof Error ? err.message : undefined);
    }
  }, [fetchCategories]);

  // Create category
  const createCategory = useCallback(async (formData: CategoryFormData) => {
    try {
      // Validate
      const errors = CatalogCategoryService.validateCategoryData(formData);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      const newCategory = await CatalogCategoryService.createCategory(formData);
      setCategories(prev => [...prev, newCategory]);
      setShowCreateModal(false);
      toastRef.current.success('Category created successfully');
    } catch (err) {
      toastRef.current.error('Failed to create category', err instanceof Error ? err.message : undefined);
      throw err;
    }
  }, []);

  // Update category
  const updateCategory = useCallback(async (id: string, formData: CategoryFormData) => {
    try {
      // Validate
      const errors = CatalogCategoryService.validateCategoryData(formData);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      const updatedCategory = await CatalogCategoryService.updateCategory(id, formData);
      setCategories(prev => prev.map(c => c.id === id ? updatedCategory : c));
      setShowEditModal(false);
      setEditingCategory(null);
      toastRef.current.success('Category updated successfully');
    } catch (err) {
      toastRef.current.error('Failed to update category', err instanceof Error ? err.message : undefined);
      throw err;
    }
  }, []);

  // Delete category
  const deleteCategory = useCallback(async (category: Category) => {
    try {
      // For now, we'll use window.confirm as we don't have a confirm dialog
      const confirmed = window.confirm(`Are you sure you want to delete the category "${category.displayName}"? Fields in this category will be moved to "uncategorized".`);

      if (confirmed) {
        await CatalogCategoryService.deleteCategory(category.id);
        setCategories(prev => prev.filter(c => c.id !== category.id));
        toastRef.current.success('Category deleted successfully');
      }
    } catch (err) {
      toastRef.current.error('Failed to delete category', err instanceof Error ? err.message : undefined);
    }
  }, []);

  // Update category counts
  const updateCategoryCounts = useCallback((fields: CatalogField[]) => {
    setCategories(prev => CatalogCategoryService.updateCategoryCounts(prev, fields));
  }, []);

  // Initial load
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    
    createCategory,
    updateCategory,
    deleteCategory,
    initializeStandardCatalog,
    
    showCreateModal,
    setShowCreateModal,
    showEditModal,
    setShowEditModal,
    editingCategory,
    setEditingCategory,
    
    updateCategoryCounts,
    refreshCategories: fetchCategories
  };
}