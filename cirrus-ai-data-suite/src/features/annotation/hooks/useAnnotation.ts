import { useState, useEffect, useCallback } from 'react';
import { DataSource, Pattern } from '../types';
import { AnnotationData, AnnotationPattern, MLDetectionResult } from '../types';
import { dataSourceAPI } from '@/core/api/endpoints/dataSource.api';
import { patternAPI } from '@/core/api';
import { useLoading } from '@/features/shared/hooks';

export function useAnnotation() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
  const [annotationData, setAnnotationData] = useState<AnnotationData | null>(null);
  const [detectedPatterns, setDetectedPatterns] = useState<AnnotationPattern[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const { isLoading, startLoading, stopLoading } = useLoading();
  const [error, setError] = useState<string | null>(null);

  const pageSize = 100;

  const loadInitialData = useCallback(async () => {
    startLoading();
    try {
      const [dataSourcesData, patternsData] = await Promise.all([
        dataSourceAPI.getDataSources(),
        patternAPI.getPatterns()
      ]);
      setDataSources(dataSourcesData);
      setPatterns(patternsData.filter(p => p.isActive));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  // Load data sources and patterns on mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const loadDataSourceData = async (dataSource: DataSource, page: number = 1) => {
    startLoading();
    setError(null);
    try {
      const response = await fetch(
        `/api/data-sources/${dataSource.id}/transform?page=${page}&pageSize=${pageSize}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to load data');
      }

      const data = await response.json();
      
      setAnnotationData({
        dataSourceId: dataSource.id,
        dataSourceName: dataSource.name,
        fields: data.fields || Object.keys(data.records[0] || {}),
        records: data.records || [],
        page: data.page || page,
        pageSize: data.pageSize || pageSize,
        totalRecords: data.totalRecords || data.records.length
      });
      
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      stopLoading();
    }
  };

  const selectDataSource = async (dataSource: DataSource) => {
    setSelectedDataSource(dataSource);
    await loadDataSourceData(dataSource, 1);
  };

  const changePage = async (page: number) => {
    if (!selectedDataSource) return;
    await loadDataSourceData(selectedDataSource, page);
  };

  const detectPatternsWithML = async (): Promise<MLDetectionResult | null> => {
    if (!annotationData) return null;

    try {
      const response = await fetch('/api/ml/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: annotationData.records,
          fields: annotationData.fields
        })
      });

      if (!response.ok) {
        throw new Error('ML detection failed');
      }

      const result = await response.json();
      setDetectedPatterns(result.patterns || []);
      return result;
    } catch (err) {
      console.error('ML detection error:', err);
      return null;
    }
  };

  const savePatterns = async (patterns: AnnotationPattern[]) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await patternAPI.createPatternsFromAnnotation(patterns as any);
      // Reload patterns after saving
      const updatedPatterns = await patternAPI.getPatterns();
      setPatterns(updatedPatterns.filter(p => p.isActive));
    } catch (err) {
      throw err;
    }
  };

  return {
    dataSources,
    patterns,
    selectedDataSource,
    annotationData,
    detectedPatterns,
    currentPage,
    isLoading,
    error,
    selectDataSource,
    changePage,
    detectPatternsWithML,
    savePatterns,
    refresh: loadInitialData
  };
}