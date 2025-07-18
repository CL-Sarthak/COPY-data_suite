import { useState, useCallback, useEffect } from 'react';
import { ProfileViewerState } from './types';

export function useDataProfiling(sourceId: string) {
  const [state, setState] = useState<ProfileViewerState>({
    profile: null,
    loading: true,
    error: null,
    selectedField: null,
    searchTerm: '',
    qualityFilter: 'all',
    expandedSections: new Set(['summary', 'quality', 'fields'])
  });

  const loadProfile = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch(`/api/data-sources/${sourceId}/profile`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load data profile');
      }
      
      const profile = await response.json();
      setState(prev => ({ 
        ...prev, 
        profile, 
        loading: false,
        selectedField: profile.fields?.[0]?.name || null
      }));
    } catch (error) {
      console.error('Error loading profile:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load profile'
      }));
    }
  }, [sourceId]);

  const regenerateProfile = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch(`/api/data-sources/${sourceId}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forceRegenerate: true }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate profile');
      }
      
      const result = await response.json();
      setState(prev => ({ 
        ...prev, 
        profile: result.profile, 
        loading: false 
      }));
    } catch (error) {
      console.error('Error regenerating profile:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to regenerate profile'
      }));
    }
  }, [sourceId]);

  const toggleSection = useCallback((section: string) => {
    setState(prev => {
      const expanded = new Set(prev.expandedSections);
      if (expanded.has(section)) {
        expanded.delete(section);
      } else {
        expanded.add(section);
      }
      return { ...prev, expandedSections: expanded };
    });
  }, []);

  const setSelectedField = useCallback((fieldName: string | null) => {
    setState(prev => ({ ...prev, selectedField: fieldName }));
  }, []);

  const setSearchTerm = useCallback((searchTerm: string) => {
    setState(prev => ({ ...prev, searchTerm }));
  }, []);

  const setQualityFilter = useCallback((qualityFilter: ProfileViewerState['qualityFilter']) => {
    setState(prev => ({ ...prev, qualityFilter }));
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const filteredFields = state.profile?.fields.filter(field => {
    const matchesSearch = field.name.toLowerCase().includes(state.searchTerm.toLowerCase());
    const matchesQuality = 
      state.qualityFilter === 'all' ||
      (state.qualityFilter === 'excellent' && field.qualityScore > 0.9) ||
      (state.qualityFilter === 'good' && field.qualityScore > 0.7 && field.qualityScore <= 0.9) ||
      (state.qualityFilter === 'fair' && field.qualityScore > 0.5 && field.qualityScore <= 0.7) ||
      (state.qualityFilter === 'poor' && field.qualityScore <= 0.5);
    
    return matchesSearch && matchesQuality;
  }) || [];

  return {
    state,
    loadProfile,
    regenerateProfile,
    toggleSection,
    setSelectedField,
    setSearchTerm,
    setQualityFilter,
    filteredFields
  };
}