import React from 'react';
import { useRouter } from 'next/navigation';
import { Tooltip } from '@/components/HelpSystem';

interface WelcomeMessageProps {
  showWelcome: boolean;
}

export function WelcomeMessage({ showWelcome }: WelcomeMessageProps) {
  const router = useRouter();

  if (!showWelcome) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
      <h2 className="text-lg font-semibold text-blue-900 mb-2">Welcome to Cirrus Data Preparedness Studio</h2>
      <p className="text-blue-800 mb-4">
        Get started by following the data pipeline to prepare your datasets for AI applications:
      </p>
      <ol className="list-decimal list-inside space-y-2 text-blue-700">
        <li><strong>Connect Data Sources</strong> - Link databases, APIs, and cloud storage</li>
        <li><strong>Define Patterns</strong> - Identify sensitive data that needs protection</li>
        <li><strong>Generate Synthetic Data</strong> - Create privacy-preserving alternatives</li>
        <li><strong>Assemble Datasets</strong> - Combine and transform data for use</li>
        <li><strong>Deploy to Environments</strong> - Push datasets to secure environments</li>
      </ol>
      <Tooltip text="Begin your data preparation journey by connecting your first data source">
        <button
          onClick={() => router.push('/discovery')}
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Start with Data Discovery →
        </button>
      </Tooltip>
    </div>
  );
}