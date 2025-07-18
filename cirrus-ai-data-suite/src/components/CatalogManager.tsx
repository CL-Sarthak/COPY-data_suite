'use client';

import React, { useEffect } from 'react';
import { useCatalogFields } from '@/hooks/useCatalogFields';
import { useCatalogCategories } from '@/hooks/useCatalogCategories';
import { useCatalogFilter } from '@/hooks/useCatalogFilter';
import { CatalogImportExportService } from '@/services/catalogImportExportService';
import { useToastActions } from '@/contexts/ToastContext';
import { CatalogField, Category } from '@/types/catalog';

// Import UI components
import { CatalogToolbar } from './catalog/CatalogToolbar';
import { CategoriesSidebar } from './catalog/CategoriesSidebar';
import { FieldsTable } from './catalog/FieldsTable';
import { FieldFormModal } from './catalog/FieldFormModal';
import { CategoryFormModal } from './catalog/CategoryFormModal';

export default function CatalogManager() {
  const toast = useToastActions();
  
  // Use custom hooks for state management
  const {
    fields,
    loading: fieldsLoading,
    createField,
    updateField,
    deleteField,
    showCreateModal,
    setShowCreateModal,
    showEditModal,
    setShowEditModal,
    editingField,
    setEditingField
  } = useCatalogFields();

  const {
    categories,
    loading: categoriesLoading,
    createCategory,
    updateCategory,
    initializeStandardCatalog,
    showCreateModal: showCreateCategoryModal,
    setShowCreateModal: setShowCreateCategoryModal,
    showEditModal: showEditCategoryModal,
    setShowEditModal: setShowEditCategoryModal,
    editingCategory,
    setEditingCategory,
    updateCategoryCounts
  } = useCatalogCategories();

  const {
    filteredFields,
    selectedCategory,
    setSelectedCategory,
    searchTerm,
    setSearchTerm,
    standardFieldsCount,
    customFieldsCount
  } = useCatalogFilter(fields);

  // Update category counts when fields change
  useEffect(() => {
    if (fields.length > 0) {
      updateCategoryCounts(fields);
    }
  }, [fields, updateCategoryCounts]);

  // Handle field actions
  const handleEditField = (field: CatalogField) => {
    setEditingField(field);
    setShowEditModal(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setShowEditCategoryModal(true);
  };

  // Handle import
  const handleImport = async (file: File) => {
    try {
      const data = await CatalogImportExportService.parseImportFile(file);
      const result = await CatalogImportExportService.importCatalog(data);
      
      if (result.success) {
        toast.success('Import Successful', result.message);
        // Refresh data
        window.location.reload();
      } else {
        toast.error('Import completed with errors', result.errors?.join(', '));
      }
    } catch (error) {
      toast.error('Import failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const loading = fieldsLoading || categoriesLoading;

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading catalog...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Global Data Catalog</h1>
          <p className="text-gray-600">
            Define and manage your organization&apos;s standard data fields and categories
          </p>
        </div>

        <CatalogToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onCreateField={() => setShowCreateModal(true)}
          onInitializeCatalog={initializeStandardCatalog}
          onImport={handleImport}
          fields={fields}
          categories={categories}
          hasCategories={categories.length > 0}
        />

        <div className="flex gap-6">
          <CategoriesSidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
            onCreateCategory={() => setShowCreateCategoryModal(true)}
            onEditCategory={handleEditCategory}
            standardFieldsCount={standardFieldsCount}
            customFieldsCount={customFieldsCount}
            totalFieldsCount={fields.length}
          />

          <FieldsTable
            fields={filteredFields}
            categories={categories}
            onEditField={handleEditField}
            onDeleteField={deleteField}
          />
        </div>

        {/* Modals */}
        <FieldFormModal
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setEditingField(null);
          }}
          onSubmit={editingField ? 
            (data) => updateField(editingField.id, data) : 
            createField
          }
          field={editingField}
          categories={categories}
        />

        <CategoryFormModal
          isOpen={showCreateCategoryModal || showEditCategoryModal}
          onClose={() => {
            setShowCreateCategoryModal(false);
            setShowEditCategoryModal(false);
            setEditingCategory(null);
          }}
          onSubmit={editingCategory ? 
            (data) => updateCategory(editingCategory.id, data) : 
            createCategory
          }
          category={editingCategory}
        />
      </div>
    </div>
  );
}