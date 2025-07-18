import React, { useState } from 'react';
import { Panel } from '@/features/shared/components';
import { JobCard } from './JobCard';
import { LoadingState, ErrorState, EmptyState } from '@/features/shared/components';
import { PreviewDataModal } from '../modals/PreviewDataModal';
import { AddToDataSourceModal } from '../modals/AddToDataSourceModal';
import { useJobs, useConfigurations } from '../../hooks';
import { useModal } from '@/features/shared/hooks';
import { useDialog } from '@/contexts/DialogContext';
import { JobWithConfig } from '../../types';
import { SyntheticDataJob } from '@/types/synthetic';
import { BriefcaseIcon } from '@heroicons/react/24/outline';

export function JobsPanel() {
  const { jobs, loading, error, deleteJob, downloadJobOutput } = useJobs();
  const { configs } = useConfigurations();
  const dialog = useDialog();
  
  const previewModal = useModal();
  const addToSourceModal = useModal();
  
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);
  const [previewConfigId, setPreviewConfigId] = useState<string | null>(null);
  const [selectedJobForDataSource, setSelectedJobForDataSource] = useState<JobWithConfig | null>(null);

  // Enhance jobs with config names
  const jobsWithConfigs: JobWithConfig[] = jobs.map(job => {
    const config = configs.find(c => c.id === job.configId);
    return {
      ...job,
      configName: config?.name,
      configPrivacyLevel: config?.privacyLevel
    };
  });

  const handleDownload = async (configId: string, filename: string) => {
    const job = jobs.find(j => j.configId === configId);
    if (!job) return;
    
    try {
      setDownloadingJobId(job.id);
      await downloadJobOutput(configId, filename);
    } finally {
      setDownloadingJobId(null);
    }
  };

  const handlePreview = (configId: string) => {
    setPreviewConfigId(configId);
    previewModal.open();
  };

  const handleDelete = async (jobId: string) => {
    const confirmed = await dialog.showConfirm({
      title: 'Delete Job',
      message: 'Are you sure you want to delete this job? This will remove the job record but not the associated dataset configuration.',
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      await deleteJob(jobId);
    }
  };

  const handleAddToDataSource = (job: JobWithConfig) => {
    setSelectedJobForDataSource(job);
    addToSourceModal.open();
  };

  if (loading) {
    return (
      <Panel title="Jobs">
        <LoadingState message="Loading jobs..." />
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel title="Jobs">
        <ErrorState 
          error={error}
          title="Failed to load jobs"
        />
      </Panel>
    );
  }

  return (
    <>
      <Panel
        title="Jobs"
        description="Monitor and manage synthetic data generation jobs"
      >
        {jobsWithConfigs.length === 0 ? (
          <EmptyState
            icon={<BriefcaseIcon />}
            title="No jobs yet"
            description="Jobs will appear here when you generate synthetic data"
          />
        ) : (
          <div className="space-y-4">
            {jobsWithConfigs.map((job) => (
              <JobCard
                key={(job as SyntheticDataJob).id}
                job={job}
                onDownload={handleDownload}
                onPreview={handlePreview}
                onDelete={handleDelete}
                onAddToDataSource={handleAddToDataSource}
                isDownloading={downloadingJobId === (job as SyntheticDataJob).id}
              />
            ))}
          </div>
        )}
      </Panel>

      {previewConfigId && (
        <PreviewDataModal
          isOpen={previewModal.isOpen}
          onClose={() => {
            previewModal.close();
            setPreviewConfigId(null);
          }}
          configId={previewConfigId}
        />
      )}

      {selectedJobForDataSource && (
        <AddToDataSourceModal
          isOpen={addToSourceModal.isOpen}
          onClose={() => {
            addToSourceModal.close();
            setSelectedJobForDataSource(null);
          }}
          job={selectedJobForDataSource}
        />
      )}
    </>
  );
}