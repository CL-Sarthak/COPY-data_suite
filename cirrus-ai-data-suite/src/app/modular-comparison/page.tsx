'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Panel, Button } from '@/features/shared/components';
import { ChartBarIcon, CodeBracketIcon } from '@heroicons/react/24/outline';

export default function ModularComparisonPage() {
  const [showCode, setShowCode] = useState(false);

  const stats = {
    original: {
      linesOfCode: 1926,
      stateVariables: 73,
      functions: 42,
      directApiCalls: 18,
      files: 1
    },
    modular: {
      linesOfCode: 450, // Approx total across all files
      stateVariables: 12, // Distributed across hooks
      functions: 8, // Per component average
      directApiCalls: 0, // All through API service
      files: 18
    }
  };

  const improvements = [
    {
      metric: 'Code Organization',
      before: 'Single 1926-line file mixing all concerns',
      after: '18 focused files with clear responsibilities'
    },
    {
      metric: 'State Management',
      before: '73 useState calls in one component',
      after: '3-4 state variables per hook, cleanly separated'
    },
    {
      metric: 'API Integration',
      before: 'Direct fetch() calls scattered throughout',
      after: 'Centralized API service with TypeScript support'
    },
    {
      metric: 'Reusability',
      before: 'No reusable components',
      after: 'Shared components used across features'
    },
    {
      metric: 'Testing',
      before: 'Difficult to test monolithic component',
      after: 'Each piece testable in isolation'
    },
    {
      metric: 'Performance',
      before: 'Entire page re-renders on any change',
      after: 'Granular updates with optimized rendering'
    }
  ];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Modularization Comparison
          </h1>
          <p className="text-gray-600">
            See the improvements from modularizing the Synthetic Data feature
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          <Button
            variant={!showCode ? 'primary' : 'secondary'}
            icon={<ChartBarIcon className="h-4 w-4" />}
            onClick={() => setShowCode(false)}
          >
            Statistics
          </Button>
          <Button
            variant={showCode ? 'primary' : 'secondary'}
            icon={<CodeBracketIcon className="h-4 w-4" />}
            onClick={() => setShowCode(true)}
          >
            Code Structure
          </Button>
        </div>

        {!showCode ? (
          <>
            {/* Statistics View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Panel title="Original Implementation" className="border-red-200">
                <div className="space-y-4">
                  {Object.entries(stats.original).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="font-semibold text-red-600">{value}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Modular Implementation" className="border-green-200">
                <div className="space-y-4">
                  {Object.entries(stats.modular).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="font-semibold text-green-600">{value}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <Panel title="Key Improvements">
              <div className="space-y-4">
                {improvements.map((improvement, index) => (
                  <div key={index} className="border-b pb-4 last:border-0">
                    <h3 className="font-medium text-gray-900 mb-2">{improvement.metric}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="bg-red-50 p-3 rounded">
                        <span className="font-medium text-red-700">Before:</span>
                        <p className="text-red-600 mt-1">{improvement.before}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded">
                        <span className="font-medium text-green-700">After:</span>
                        <p className="text-green-600 mt-1">{improvement.after}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        ) : (
          <>
            {/* Code Structure View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Panel title="Original Structure" className="border-red-200">
                <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96">
{`src/app/synthetic/page.tsx (1926 lines)
├── 73 state variables
├── 42 inline functions
├── Multiple modals inline
├── Direct API calls
├── Complex JSX with nested conditions
└── No separation of concerns`}
                </pre>
              </Panel>

              <Panel title="Modular Structure" className="border-green-200">
                <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96">
{`src/features/synthetic/
├── index.ts
├── SyntheticDataFeature.tsx (60 lines)
├── types/
│   └── index.ts
├── hooks/
│   ├── useConfigurations.ts
│   ├── useJobs.ts
│   └── useTemplates.ts
├── components/
│   ├── configurations/
│   │   ├── ConfigCard.tsx
│   │   ├── ConfigList.tsx
│   │   └── ConfigurationPanel.tsx
│   ├── jobs/
│   │   ├── JobCard.tsx
│   │   └── JobsPanel.tsx
│   └── modals/
│       ├── CreateConfigModal.tsx
│       ├── EditConfigModal.tsx
│       ├── PreviewDataModal.tsx
│       └── AddToDataSourceModal.tsx

src/core/api/
├── client.ts
├── endpoints/
│   └── synthetic.api.ts

src/app/synthetic-modular/page.tsx (30 lines)`}
                </pre>
              </Panel>
            </div>

            <Panel title="Example: Configuration Management">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-red-700 mb-2">Before (Inline in page.tsx)</h4>
                  <pre className="text-xs bg-red-50 p-3 rounded overflow-auto">
{`const [configs, setConfigs] = useState([]);
const [showNewConfig, setShowNewConfig] = useState(false);
const [newConfigName, setNewConfigName] = useState('');
// ... 10+ more state variables

const fetchExistingDatasets = async () => {
  try {
    const response = await fetch('/api/synthetic');
    if (response.ok) {
      const datasets = await response.json();
      // Complex transformation logic...
      setConfigs(convertedConfigs);
    }
  } catch (error) {
    console.error('Failed to fetch:', error);
  }
};`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium text-green-700 mb-2">After (Modular)</h4>
                  <pre className="text-xs bg-green-50 p-3 rounded overflow-auto">
{`// useConfigurations.ts
export function useConfigurations() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const loadConfigs = useCallback(async () => {
    try {
      const datasets = await syntheticAPI.getDatasets();
      setConfigs(datasets);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { configs, loading, error, refetch };
}

// ConfigurationPanel.tsx
const { configs, loading, error } = useConfigurations();`}
                  </pre>
                </div>
              </div>
            </Panel>
          </>
        )}

        <Panel title="Links to Implementations">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/synthetic"
              className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900">Original Page</h3>
              <p className="text-sm text-gray-600 mt-1">
                The monolithic 1926-line implementation
              </p>
            </a>
            
            <a
              href="/synthetic-modular"
              className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900">Modular Page</h3>
              <p className="text-sm text-gray-600 mt-1">
                The new modular implementation
              </p>
            </a>
            
            <a
              href="/demo-modular"
              className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900">Component Demo</h3>
              <p className="text-sm text-gray-600 mt-1">
                Shared components demonstration
              </p>
            </a>
          </div>
        </Panel>
      </div>
    </AppLayout>
  );
}