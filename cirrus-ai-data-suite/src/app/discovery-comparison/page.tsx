'use client';

import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export default function DiscoveryComparisonPage() {
  return (
    <AppLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Discovery Feature: Original vs Modular
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Original Version */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Original Discovery Page
            </h2>
            
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-medium text-red-900 mb-2">Issues:</h3>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  <li>Single file with 1,117 lines</li>
                  <li>Mixed concerns (UI, state, API calls)</li>
                  <li>Difficult to test and maintain</li>
                  <li>No reusable components</li>
                  <li>Complex state management</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>File:</strong> src/app/discovery/page.tsx
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Lines:</strong> 1,117
                </p>
              </div>

              <Link
                href="/discovery"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                View Original <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Modular Version */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Modular Discovery Feature
            </h2>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-900 mb-2">Improvements:</h3>
                <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                  <li>Feature-based module structure</li>
                  <li>Separation of concerns</li>
                  <li>Reusable hooks and components</li>
                  <li>Type-safe API layer</li>
                  <li>Easy to test and extend</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-2">Structure:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• DiscoveryFeature.tsx (main component)</li>
                  <li>• hooks/useDataSources.ts (business logic)</li>
                  <li>• components/DataSourcesPanel.tsx</li>
                  <li>• components/DataSourceTable.tsx</li>
                  <li>• modals/AddDataSourceModal.tsx</li>
                </ul>
              </div>

              <Link
                href="/discovery-modular"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View Modular <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-medium text-blue-900 mb-2">Key Benefits:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <h4 className="font-medium text-blue-800">Maintainability</h4>
              <p className="text-sm text-blue-700 mt-1">
                Small, focused files are easier to understand and modify
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-800">Reusability</h4>
              <p className="text-sm text-blue-700 mt-1">
                Components and hooks can be used across features
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-800">Testability</h4>
              <p className="text-sm text-blue-700 mt-1">
                Isolated units make testing straightforward
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}