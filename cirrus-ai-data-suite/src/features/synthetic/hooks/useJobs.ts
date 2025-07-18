import { useState, useEffect, useCallback, useRef } from 'react';
import { syntheticAPI, SyntheticJobResponse } from '@/core/api';
import { SyntheticDataJob } from '../types';
import { useToastActions } from '@/contexts/ToastContext';

export function useJobs() {
  const [jobs, setJobs] = useState<SyntheticDataJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const toast = useToastActions();

  const loadJobs = useCallback(async () => {
    console.log('Loading jobs...');
    try {
      setLoading(true);
      setError(null);
      
      const response = await syntheticAPI.getJobs();
      console.log('Jobs response:', response);
      
      // Handle the response - it should be an array
      if (Array.isArray(response)) {
        // Convert API jobs to local format
        const convertedJobs = response.map(job => 
          syntheticAPI.convertApiJobToLocal(job)
        );
        
        setJobs(convertedJobs);
        return convertedJobs;
      } else {
        console.error('Unexpected response format:', response);
        setJobs([]);
        return [];
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Failed to load jobs:', error);
      setJobs([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // SSE connection for real-time updates
  const startJobUpdates = useCallback(() => {
    console.log('Starting SSE connection for job updates...');
    
    // Clean up any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    const eventSource = new EventSource('/api/synthetic/jobs/updates');
    eventSourceRef.current = eventSource;
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received SSE data:', data);
        
        // Handle bulk job updates (from periodic updates)
        if (data.type === 'jobs_update' && Array.isArray(data.jobs)) {
          const convertedJobs = data.jobs.map((job: SyntheticJobResponse) => 
            syntheticAPI.convertApiJobToLocal(job)
          );
          setJobs(convertedJobs);
        } 
        // Handle individual job updates (if server sends them)
        else if (!data.type) {
          const localJob = syntheticAPI.convertApiJobToLocal(data);
          
          setJobs(prevJobs => {
            const existingIndex = prevJobs.findIndex(j => j.id === localJob.id);
            
            if (existingIndex >= 0) {
              // Update existing job
              const newJobs = [...prevJobs];
              newJobs[existingIndex] = localJob;
              return newJobs;
            } else {
              // Add new job
              return [localJob, ...prevJobs];
            }
          });
          
          // Show toast for job completion
          if (localJob.status === 'completed') {
            toast.success(
              'Job Completed',
              `Synthetic data generation completed with ${localJob.recordsGenerated.toLocaleString()} records`
            );
          } else if (localJob.status === 'failed') {
            toast.error(
              'Job Failed',
              localJob.errorMessage || 'Synthetic data generation failed'
            );
          }
        }
      } catch (error) {
        console.error('Failed to parse job update:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      
      // Only attempt to reconnect if we haven't exceeded max attempts
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        console.log(`Attempting to reconnect SSE (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
        
        setTimeout(() => {
          if (eventSourceRef.current === eventSource) {
            startJobUpdates();
          }
        }, 5000);
      } else {
        console.error('Max SSE reconnection attempts reached. Stopping reconnection.');
        eventSource.close();
      }
    };
    
    eventSource.onopen = () => {
      console.log('SSE connection established');
      // Reset reconnect attempts on successful connection
      reconnectAttemptsRef.current = 0;
    };
  }, [toast]);

  // Load jobs and start SSE on mount
  useEffect(() => {
    // Start SSE connection which will send initial jobs
    startJobUpdates();
    
    // Set loading to false after a short delay since SSE will provide data
    const timer = setTimeout(() => setLoading(false), 100);
    
    return () => {
      clearTimeout(timer);
      if (eventSourceRef.current) {
        console.log('Closing SSE connection');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run on mount

  const startGeneration = useCallback(async (configId: string, configName?: string) => {
    try {
      toast.info('Starting Generation', 'Initializing synthetic data generation...');
      
      const result = await syntheticAPI.generateData(configId);
      
      if (result.job) {
        const newJob = syntheticAPI.convertApiJobToLocal(result.job);
        
        // Add the new job immediately
        setJobs(prevJobs => {
          const exists = prevJobs.some(j => j.id === newJob.id);
          if (exists) return prevJobs;
          return [newJob, ...prevJobs];
        });
      }
      
      toast.success(
        'Generation Started',
        `Synthetic data generation for "${configName || 'dataset'}" has begun.`
      );
      
      return result;
    } catch (error) {
      const err = error as Error;
      toast.error('Generation Failed', err.message || 'Failed to start generation');
      throw error;
    }
  }, [toast]);

  const deleteJob = useCallback(async (jobId: string) => {
    try {
      await syntheticAPI.deleteJob(jobId);
      
      // Remove from local state
      setJobs(prev => prev.filter(job => job.id !== jobId));
      
      toast.success('Job Deleted', 'The job has been successfully removed.');
    } catch (error) {
      const err = error as Error;
      toast.error('Job Deletion Failed', err.message || 'Failed to delete job');
      throw error;
    }
  }, [toast]);

  const downloadJobOutput = useCallback(async (configId: string, filename: string) => {
    try {
      await syntheticAPI.downloadData(configId, filename);
      toast.success('Download Complete', 'File downloaded successfully.');
    } catch (error) {
      const err = error as Error;
      toast.error('Download Failed', err.message || 'Failed to download file');
      throw error;
    }
  }, [toast]);

  return {
    jobs,
    loading,
    error,
    refetch: loadJobs,
    startGeneration,
    deleteJob,
    downloadJobOutput
  };
}