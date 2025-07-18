'use client';

import AppLayout from '@/components/AppLayout';
import { SyntheticDataFeature } from '@/features/synthetic';
import { HelpButton } from '@/components/HelpSystem';
import { getHelpContent } from '@/content/helpContent';
import LLMIndicator from '@/components/LLMIndicator';

export default function SyntheticDataModularPage() {
  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Synthetic Data Generation
              <HelpButton content={getHelpContent('synthetic')} />
            </h1>
            <p className="mt-2 text-gray-600">
              Generate privacy-safe synthetic datasets that maintain statistical properties while protecting sensitive information.
            </p>
          </div>
          <LLMIndicator feature="datasetEnhancement" showModel={true} />
        </div>

        <SyntheticDataFeature />
      </div>
    </AppLayout>
  );
}