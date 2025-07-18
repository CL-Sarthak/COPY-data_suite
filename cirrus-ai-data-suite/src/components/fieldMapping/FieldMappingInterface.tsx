import React from 'react';
import { useFieldMapping } from '@/hooks/useFieldMapping';
import { FieldMappingHeader } from './FieldMappingHeader';
import { SourceFieldsList } from './SourceFieldsList';
import { CatalogFieldSelector } from './CatalogFieldSelector';
import { MappingSuggestions } from './MappingSuggestions';
import { CreateFieldModal } from './CreateFieldModal';
import { TransformationModal } from './TransformationModal';
import { CatalogField } from '@/types/fieldMapping';

interface FieldMappingInterfaceProps {
  sourceId: string;
  sourceFields?: string[];
  onMappingsChanged?: () => void;
  onTransformSuccess?: () => void;
}

export function FieldMappingInterface({
  sourceId,
  sourceFields = [],
  onMappingsChanged,
  onTransformSuccess
}: FieldMappingInterfaceProps) {
  const {
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
    
    // Form data
    newFieldData,
    setNewFieldData,
    
    // Results
    transformationResult,
    error,
    
    // Actions
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
  } = useFieldMapping({ sourceId, sourceFields, onMappingsChanged });

  // Handle field selection from catalog
  const handleFieldSelect = async (field: CatalogField) => {
    if (selectedSourceField) {
      await updateMapping(selectedSourceField, field.id);
      setSelectedSourceField(null);
    }
  };

  // Handle remove mapping
  const handleRemoveMapping = async (sourceField?: string) => {
    const fieldToRemove = sourceField || selectedSourceField;
    if (fieldToRemove) {
      await updateMapping(fieldToRemove, null);
      setSelectedSourceField(null);
    }
  };

  // Handle create field for source
  const handleCreateFieldForSource = (sourceField: string) => {
    setSelectedSourceField(sourceField);
    setNewFieldData({
      name: sourceField.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      displayName: sourceField.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: '',
      dataType: 'text',
      category: 'custom',
      isRequired: false,
      tags: ''
    });
    setShowCreateFieldModal(true);
  };

  // Handle apply suggestion
  const handleApplySuggestion = async (sourceField: string, catalogFieldId: string) => {
    await updateMapping(sourceField, catalogFieldId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-red-900">Error Loading Field Mapping</h3>
        <p className="text-sm text-red-700 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with progress and actions */}
      <FieldMappingHeader
        mappedCount={mappedFieldsCount}
        unmappedCount={unmappedFieldsCount}
        totalFields={actualSourceFields.length}
        progress={mappingProgress}
        autoMapping={autoMapping}
        onGenerateSuggestions={generateSuggestions}
        onTransform={transformData}
        canTransform={mappedFieldsCount > 0}
      />

      {/* AI Suggestions */}
      {(suggestions.length > 0 || autoMapping) && (
        <div className="mb-6">
          <MappingSuggestions
            suggestions={suggestions}
            loading={autoMapping}
            onApplySuggestion={handleApplySuggestion}
            onApplyAll={applyAllSuggestions}
          />
        </div>
      )}

      {/* Main mapping interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Fields */}
        <SourceFieldsList
          sourceFields={actualSourceFields}
          mappings={mappings}
          catalogFields={catalogFields}
          onSelectField={setSelectedSourceField}
          onCreateFieldForSource={handleCreateFieldForSource}
          onRemoveMapping={handleRemoveMapping}
        />

        {/* Catalog Fields */}
        <CatalogFieldSelector
          catalogFields={filteredCatalogFields}
          categories={categories}
          mappings={mappings}
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          selectedSourceField={selectedSourceField}
          onCategoryChange={setSelectedCategory}
          onSearchChange={setSearchQuery}
          onFieldSelect={handleFieldSelect}
          onRemoveMapping={() => handleRemoveMapping()}
        />
      </div>

      {/* Create Field Modal */}
      <CreateFieldModal
        isOpen={showCreateFieldModal}
        onClose={() => {
          setShowCreateFieldModal(false);
          setSelectedSourceField(null);
        }}
        onCreate={createField}
        formData={newFieldData}
        onFormChange={setNewFieldData}
        categories={categories}
        creating={creatingField}
        sourceFieldName={selectedSourceField || undefined}
      />

      {/* Transformation Modal */}
      <TransformationModal
        isOpen={showTransformModal}
        onClose={() => setShowTransformModal(false)}
        result={transformationResult}
        transforming={transforming}
        onExport={exportData}
        onSuccessClose={() => {
          setShowTransformModal(false);
          onTransformSuccess?.();
        }}
      />
    </div>
  );
}