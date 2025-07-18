import React, { useState } from 'react';
import { DataSourcesPanel } from './components/data-sources/DataSourcesPanel';
import { UnifiedDataCatalog } from '@/services/dataTransformationService';
// TODO: Create DataCatalogViewer component
// import DataCatalogViewer from '@/components/DataCatalogViewer';

export function DiscoveryFeature() {
  const [dataCatalog] = useState<UnifiedDataCatalog | null>(null);
  const [showCatalog] = useState(false);

  // TODO: Connect catalog viewer when transform completes

  return (
    <div className="space-y-6">
      <DataSourcesPanel />
      
      {/* Data Catalog Viewer - TODO: Implement DataCatalogViewer component */}
      {showCatalog && dataCatalog && (
        <div className="mt-6">
          {/* <DataCatalogViewer 
            catalog={dataCatalog}
            onClose={() => {
              setShowCatalog(false);
              setDataCatalog(null);
            }}
          /> */}
          <div className="p-4 bg-gray-100 rounded">
            <p className="text-gray-600">DataCatalogViewer component not yet implemented</p>
          </div>
        </div>
      )}
    </div>
  );
}