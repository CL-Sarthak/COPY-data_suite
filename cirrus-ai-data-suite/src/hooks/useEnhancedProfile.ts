import { useState, useEffect, useCallback } from 'react';
import { EnhancedDataProfile, EnhancedProfileRequest } from '@/types/profiling';

interface UseEnhancedProfileResult {
  profile: EnhancedDataProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEnhancedProfile(
  dataSourceId: string | null,
  options: Partial<EnhancedProfileRequest> = {}
): UseEnhancedProfileResult {
  const [profile, setProfile] = useState<EnhancedDataProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!dataSourceId) {
      setProfile(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      // Add optional parameters
      if (options.sampleSize) {
        params.append('sampleSize', options.sampleSize.toString());
      }
      if (options.includeOutliers !== undefined) {
        params.append('includeOutliers', options.includeOutliers.toString());
      }
      if (options.includeDistributions !== undefined) {
        params.append('includeDistributions', options.includeDistributions.toString());
      }
      if (options.outlierMethod) {
        params.append('outlierMethod', options.outlierMethod);
      }
      if (options.distributionBins) {
        params.append('distributionBins', options.distributionBins.toString());
      }

      const url = `/api/data-sources/${dataSourceId}/enhanced-profile?${params.toString()}`;
      console.log('Fetching enhanced profile from:', url);
      
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Enhanced profile fetch failed:', {
          status: response.status,
          error: errorData.error,
          url
        });
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Enhanced profile response:', {
        success: data.success,
        hasProfile: !!data.profile,
        error: data.error
      });
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch enhanced profile');
      }

      setProfile(data.profile);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Enhanced profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [
    dataSourceId, 
    options.sampleSize,
    options.includeOutliers,
    options.includeDistributions,
    options.outlierMethod,
    options.distributionBins
  ]);

  const refetch = useCallback(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refetch
  };
}

export default useEnhancedProfile;