import React from 'react';
import {
  PlusIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { CatalogImportExportService } from '@/services/catalogImportExportService';
import { CatalogField, Category } from '@/types/catalog';

interface CatalogToolbarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onCreateField: () => void;
  onInitializeCatalog: () => void;
  onImport: (file: File) => void;
  fields: CatalogField[];
  categories: Category[];
  hasCategories: boolean;
}

export function CatalogToolbar({
  searchTerm,
  onSearchChange,
  onCreateField,
  onInitializeCatalog,
  onImport,
  fields,
  categories,
  hasCategories
}: CatalogToolbarProps) {
  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onImport(file);
      }
    };
    input.click();
  };

  const handleExport = () => {
    CatalogImportExportService.exportCatalog(fields, categories);
  };

  const handleDownloadTemplate = () => {
    CatalogImportExportService.generateImportTemplate();
  };

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search fields by name, description, or tags..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {!hasCategories && (
          <button
            onClick={onInitializeCatalog}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <DocumentTextIcon className="h-5 w-5" />
            Initialize Standard Catalog
          </button>
        )}
        
        <button
          onClick={handleDownloadTemplate}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Download Import Template"
        >
          <DocumentTextIcon className="h-5 w-5" />
        </button>
        
        <button
          onClick={handleImportClick}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Import Catalog"
        >
          <ArrowUpTrayIcon className="h-5 w-5" />
        </button>
        
        <button
          onClick={handleExport}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Export Catalog"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
        </button>
        
        <button
          onClick={onCreateField}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add Field
        </button>
      </div>
    </div>
  );
}