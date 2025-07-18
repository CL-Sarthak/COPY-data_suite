'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import CatalogManager from '@/components/CatalogManager';
import { HelpButton } from '@/components/HelpSystem';
import { getHelpContent } from '@/content/helpContent';
import { 
  BookOpenIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface CatalogField {
  id: string;
  name: string;
  displayName: string;
  description: string;
  dataType: string;
  category: string;
  isRequired: boolean;
  isStandard: boolean;
  tags: string[];
}

export default function CatalogPage() {
  const { } = useAuth();
  const [isInitializing, setIsInitializing] = useState(false);
  const [catalogStats, setCatalogStats] = useState<{
    totalFields: number;
    standardFields: number;
    customFields: number;
    categories: number;
  } | null>(null);

  useEffect(() => {
    fetchCatalogStats();
  }, []);

  const fetchCatalogStats = async () => {
    try {
      const response = await fetch('/api/catalog/fields');
      if (response.ok) {
        const data = await response.json();
        const fields = data.fields || data; // Handle both response formats
        const standardCount = fields.filter((f: CatalogField) => f.isStandard).length;
        const categories = new Set(fields.map((f: CatalogField) => f.category)).size;
        
        setCatalogStats({
          totalFields: fields.length,
          standardFields: standardCount,
          customFields: fields.length - standardCount,
          categories: categories
        });
      }
    } catch (error) {
      console.error('Failed to fetch catalog stats:', error);
    }
  };

  const handleInitializeCatalog = async () => {
    setIsInitializing(true);
    try {
      const response = await fetch('/api/catalog/initialize', { method: 'POST' });
      if (response.ok) {
        await fetchCatalogStats();
        // Reload the page to refresh the catalog
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to initialize catalog:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="p-8">
          <div className="max-w-screen-2xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <BookOpenIcon className="h-8 w-8 text-blue-600" />
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900">Global Data Catalog</h1>
                        <p className="text-gray-600 mt-1">Manage standardized field definitions for data transformation</p>
                      </div>
                      <HelpButton 
                        content={getHelpContent('catalog')} 
                        className="ml-2"
                      />
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                      {catalogStats && catalogStats.totalFields === 0 && (
                        <button
                          onClick={handleInitializeCatalog}
                          disabled={isInitializing}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                        >
                          <SparklesIcon className="h-5 w-5" />
                          <span>{isInitializing ? 'Initializing...' : 'Initialize Standard Catalog'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                {catalogStats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-2xl font-bold text-gray-900">{catalogStats.totalFields}</div>
                      <div className="text-sm text-gray-600">Total Fields</div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-2xl font-bold text-blue-600">{catalogStats.standardFields}</div>
                      <div className="text-sm text-gray-600">Standard Fields</div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-2xl font-bold text-green-600">{catalogStats.customFields}</div>
                      <div className="text-sm text-gray-600">Custom Fields</div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-2xl font-bold text-purple-600">{catalogStats.categories}</div>
                      <div className="text-sm text-gray-600">Categories</div>
                    </div>
                  </div>
                )}

                {/* Catalog Manager Component */}
                {catalogStats && catalogStats.totalFields === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                    <BookOpenIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Catalog Fields Found</h3>
                    <p className="text-gray-600 mb-4">
                      Initialize the catalog with standard fields to get started with data transformation.
                    </p>
                    <button
                      onClick={handleInitializeCatalog}
                      disabled={isInitializing}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center space-x-2"
                    >
                      <SparklesIcon className="h-5 w-5" />
                      <span>{isInitializing ? 'Initializing...' : 'Initialize Standard Catalog'}</span>
                    </button>
                  </div>
                ) : (
                  <CatalogManager />
                )}
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}