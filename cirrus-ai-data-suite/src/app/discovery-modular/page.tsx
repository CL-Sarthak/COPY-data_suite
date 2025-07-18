'use client';

import AppLayout from '@/components/AppLayout';
import { DiscoveryFeature } from '@/features/discovery';
import { HelpButton } from '@/components/HelpSystem';
import { getHelpContent } from '@/content/helpContent';
import { DialogProvider } from '@/contexts/DialogContext';

export default function DiscoveryModularPage() {
  return (
    <DialogProvider>
      <AppLayout>
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Data Discovery
              <HelpButton content={getHelpContent('discovery')} />
            </h1>
            <p className="mt-2 text-gray-600">
              Upload, transform, and analyze your data sources. Map fields to a unified catalog and profile your data quality.
            </p>
          </div>

          <DiscoveryFeature />
        </div>
      </AppLayout>
    </DialogProvider>
  );
}