import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useEnhancedProfile } from '@/hooks/useEnhancedProfile';
import { ProfileTableConfig } from '@/types/profiling';
import EnhancedProfileTable from './EnhancedProfileTable';

// Quality metrics are now displayed only in the top card section, not duplicated here

interface ProfileTableViewProps {
  dataSourceId: string;
  dataSourceName?: string;
  className?: string;
  showSettings?: boolean;
  onSettingsChange?: (show: boolean) => void;
  config?: {
    sampleSize: number;
    outlierMethod: 'IQR' | 'Z-Score' | 'Modified-Z-Score';
    distributionBins: number;
    showSummary: boolean;
    showOutliers: boolean;
    showDistributions: boolean;
  };
}

export const ProfileTableView: React.FC<ProfileTableViewProps> = ({
  dataSourceId,
  dataSourceName,
  className = '',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showSettings: _showSettings = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSettingsChange: _onSettingsChange,
  config: externalConfig
}) => {
  // Note: _showSettings and _onSettingsChange are part of the interface but not used in this implementation
  // They may be used by parent components or future enhancements
  const [config, setConfig] = useState<ProfileTableConfig>({
    showStatistics: externalConfig?.showSummary ?? true,
    showOutliers: externalConfig?.showOutliers ?? true,
    showDistributions: externalConfig?.showDistributions ?? true,
    sampleSize: externalConfig?.sampleSize ?? 100,
    outlierMethod: externalConfig?.outlierMethod ?? 'IQR',
    distributionBins: externalConfig?.distributionBins ?? 10
  });

  // Update internal config when external config changes
  useEffect(() => {
    if (externalConfig) {
      setConfig(prev => ({
        ...prev,
        showStatistics: externalConfig.showSummary,
        showOutliers: externalConfig.showOutliers,
        showDistributions: externalConfig.showDistributions,
        sampleSize: externalConfig.sampleSize,
        outlierMethod: externalConfig.outlierMethod,
        distributionBins: externalConfig.distributionBins
      }));
    }
  }, [externalConfig]);

  const [debouncedConfig, setDebouncedConfig] = useState(config);
  const [configPending, setConfigPending] = useState(false);

  // Debounce configuration changes to prevent excessive API calls
  useEffect(() => {
    if (JSON.stringify(config) !== JSON.stringify(debouncedConfig)) {
      setConfigPending(true);
    }
    
    const timer = setTimeout(() => {
      setDebouncedConfig(config);
      setConfigPending(false);
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timer);
  }, [config, debouncedConfig]);

  const { profile, loading, error, refetch } = useEnhancedProfile(dataSourceId, {
    sampleSize: debouncedConfig.sampleSize,
    includeOutliers: debouncedConfig.showOutliers,
    includeDistributions: debouncedConfig.showDistributions,
    outlierMethod: debouncedConfig.outlierMethod,
    distributionBins: debouncedConfig.distributionBins
  });

  // Export functionality moved to parent component action buttons


  if (loading && !profile) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex items-center space-x-3 text-gray-600">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Generating enhanced profile...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center space-x-3 text-red-600 bg-red-50 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">Failed to load enhanced profile</div>
            <div className="text-sm text-red-700 mt-1">{error}</div>
            <div className="text-xs text-gray-600 mt-2">
              Data Source ID: {dataSourceId}
            </div>
            <button
              onClick={refetch}
              className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
        
        {/* Debug info */}
        <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
          <strong>Debug Info:</strong>
          <div>Endpoint: /api/data-sources/{dataSourceId}/enhanced-profile</div>
          <div>Check browser console for detailed logs</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={`p-8 text-center text-gray-500 ${className}`}>
        <p>No profile data available. Try refreshing or check the data source.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Enhanced Data Quality Profile
            {(loading || configPending) && (
              <RefreshCw className="inline w-4 h-4 ml-2 animate-spin text-blue-600" />
            )}
          </h3>
          <p className="text-sm text-gray-600">
            {dataSourceName || profile.dataSourceName} • {profile.recordCount.toLocaleString()} total records • {profile.fieldCount} fields
            {configPending && <span className="text-blue-600 ml-2">(Updating configuration...)</span>}
          </p>
        </div>

        {/* All action buttons (Configuration, Export, Refresh) moved to tab area in parent component */}
      </div>

      {/* Configuration panel moved to parent component */}

      {/* Note: Quality metrics are displayed in the top card above, no need to duplicate them here */}

      {/* Enhanced Profile Table */}
      <div className="bg-white rounded-lg border">
        <EnhancedProfileTable
          fields={profile.fields}
          sampleRecords={profile.sampleRecords}
          maxSampleRows={config.sampleSize}
          showStatistics={config.showStatistics}
          showOutliers={config.showOutliers}
          showDistributions={config.showDistributions}
        />
      </div>
    </div>
  );
};

export default ProfileTableView;