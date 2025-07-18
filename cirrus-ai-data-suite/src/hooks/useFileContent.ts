import { useState, useEffect, useCallback, useRef } from 'react';
import { DataSourceTableService } from '@/services/dataSourceTableService';

interface UseFileContentResult {
  content: string | null;
  loading: boolean;
  error: string | null;
  viewMode: 'preview' | 'full';
  setViewMode: (mode: 'preview' | 'full') => void;
  reload: () => void;
}

export function useFileContent(
  sourceId: string,
  file: { content?: string; name?: string; storageKey?: string }
): UseFileContentResult {
  const [content, setContent] = useState<string | null>(file.content || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'full'>('preview');
  const loadingRef = useRef(false);

  const fetchFileContent = useCallback(async () => {
    if (loadingRef.current || !file.name) return;
    
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const fileContent = await DataSourceTableService.fetchFileContent(sourceId, file.name);
      setContent(fileContent);
    } catch (err) {
      console.error('Error loading file content:', err);
      setError(err instanceof Error ? err.message : 'Error loading file content');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [sourceId, file.name]);

  useEffect(() => {
    // If content is not available but we have a storageKey or it's stored externally, fetch it
    if (!content && (file.storageKey || !file.content) && file.name && !loadingRef.current) {
      fetchFileContent();
    }
  }, [sourceId, file.storageKey, file.name, content, file.content, fetchFileContent]);

  return {
    content,
    loading,
    error,
    viewMode,
    setViewMode,
    reload: fetchFileContent
  };
}