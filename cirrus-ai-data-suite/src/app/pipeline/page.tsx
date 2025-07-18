'use client';

import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  DocumentIcon, 
  PlayIcon,
  PencilIcon,
  TrashIcon,
  FolderIcon
} from '@heroicons/react/24/outline';

import AppLayout from '@/components/AppLayout';
import PipelineBuilder from '@/components/PipelineBuilder';
import PipelineNameEditor from '@/components/PipelineNameEditor';
import CreatePipelineModal from '@/components/CreatePipelineModal';
import { Pipeline, PipelineStatus } from '@/types/pipeline';
import { PipelineService } from '@/services/pipelineService';
import { HelpButton } from '@/components/HelpSystem';
import { getHelpContent } from '@/content/helpContent';
import { useDialog } from '@/contexts/DialogContext';

// Remove mock data - now using persistence service

export default function PipelinePage() {
  const dialog = useDialog();
  const [view, setView] = useState<'list' | 'builder'>('list');
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load pipelines on component mount
  useEffect(() => {
    loadPipelines();
  }, []);

  const loadPipelines = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Try API first, fallback to local storage
      const loadedPipelines = await PipelineService.getAllPipelinesFromAPI();
      setPipelines(loadedPipelines);
    } catch (error) {
      console.error('Failed to load pipelines:', error);
      setError('Failed to load pipelines from server');
      // Fallback to local storage
      const localPipelines = PipelineService.getAllPipelinesFromLocal();
      setPipelines(localPipelines);
    } finally {
      setIsLoading(false);
    }
  };

  // Show create pipeline modal
  const handleCreateNew = () => {
    setShowCreateModal(true);
  };

  // Create new pipeline from modal
  const handleCreatePipeline = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    setIsCreatingNew(true);
    setView('builder');
  };

  // Update pipeline name and description
  const handlePipelineNameUpdate = async (name: string, description?: string) => {
    if (!selectedPipeline) return;

    const updatedPipeline = {
      ...selectedPipeline,
      name,
      description: description || selectedPipeline.description,
      updatedAt: new Date()
    };

    try {
      await handleSave(updatedPipeline);
      setSelectedPipeline(updatedPipeline);
    } catch (error) {
      console.error('Failed to update pipeline name:', error);
    }
  };

  // Edit existing pipeline
  const handleEdit = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    setIsCreatingNew(false);
    setView('builder');
  };

  // Save pipeline
  const handleSave = async (pipeline: Pipeline) => {
    try {
      const savedPipeline = await PipelineService.savePipelineToAPI(pipeline);
      
      if (isCreatingNew) {
        setPipelines([...pipelines, savedPipeline]);
        setIsCreatingNew(false);
      } else {
        setPipelines(pipelines.map(p => p.id === pipeline.id ? savedPipeline : p));
      }
      setSelectedPipeline(savedPipeline);
    } catch (error) {
      console.error('Failed to save pipeline:', error);
      // Still update local state even if API fails
      if (isCreatingNew) {
        setPipelines([...pipelines, pipeline]);
        setIsCreatingNew(false);
      } else {
        setPipelines(pipelines.map(p => p.id === pipeline.id ? pipeline : p));
      }
      setSelectedPipeline(pipeline);
    }
  };

  // Delete pipeline
  const handleDelete = async (pipelineId: string) => {
    const confirmed = await dialog.showConfirm({
      title: 'Delete Pipeline',
      message: 'Are you sure you want to delete this pipeline?',
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      try {
        await PipelineService.deletePipelineFromAPI(pipelineId);
        setPipelines(pipelines.filter(p => p.id !== pipelineId));
      } catch (error) {
        console.error('Failed to delete pipeline:', error);
        // Still remove from local state
        setPipelines(pipelines.filter(p => p.id !== pipelineId));
      }
    }
  };

  // Run pipeline
  const handleRun = async (pipeline: Pipeline) => {
    try {
      // Update pipeline status to running
      const updatedPipelines = pipelines.map(p => 
        p.id === pipeline.id ? { ...p, status: 'active' as PipelineStatus } : p
      );
      setPipelines(updatedPipelines);

      const execution = await PipelineService.executePipeline(pipeline);
      console.log('Pipeline execution started:', execution);
      
      // Show success message
      await dialog.showAlert({
        title: 'Pipeline Execution Started',
        message: `Pipeline: ${pipeline.name}\n\nExecution ID: ${execution.id}\nStatus: ${execution.status}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to execute pipeline:', error);
      // Update pipeline status to error
      const updatedPipelines = pipelines.map(p => 
        p.id === pipeline.id ? { ...p, status: 'error' as PipelineStatus } : p
      );
      setPipelines(updatedPipelines);
      await dialog.showAlert({
        title: 'Pipeline Execution Failed',
        message: `Failed to execute pipeline: ${pipeline.name}\n\nPlease check the console for details.`,
        type: 'error'
      });
    }
  };

  // Back to list
  const handleBackToList = () => {
    setView('list');
    setSelectedPipeline(null);
    setIsCreatingNew(false);
  };

  // Get status badge color
  const getStatusColor = (status: PipelineStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Safe date formatting
  const formatDate = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toLocaleDateString();
    } catch (error) {
      console.error('Date formatting error:', error, date);
      return 'Invalid Date';
    }
  };

  if (view === 'builder' && selectedPipeline) {
    return (
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToList}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to Pipelines
              </button>
              
              <div className="flex-1 flex items-start gap-3">
                <div className="flex-1">
                  <PipelineNameEditor
                    name={selectedPipeline.name}
                    description={selectedPipeline.description}
                    onNameChange={handlePipelineNameUpdate}
                    showDescription={true}
                    size="medium"
                    placeholder="Enter pipeline name..."
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    {isCreatingNew ? 'Creating new pipeline' : 'Editing pipeline'}
                  </p>
                </div>
                <HelpButton 
                  content={getHelpContent('pipeline')} 
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPipeline.status)}`}>
                {selectedPipeline.status}
              </span>
            </div>
          </div>
        </div>

        {/* Pipeline Builder */}
        <div className="flex-1">
          <PipelineBuilder
            pipeline={selectedPipeline}
            onSave={handleSave}
            onRun={handleRun}
          />
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      
      <main className="flex-1 overflow-auto">
        <div className="min-h-full bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Data Pipeline Builder</h1>
                    <p className="mt-2 text-gray-600">
                      Create visual workflows to automate your data processing tasks
                    </p>
                  </div>
                  <HelpButton 
                    content={getHelpContent('pipeline')} 
                    className="ml-2"
                  />
                </div>
                
                <button
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  New Pipeline
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-800">{error}</p>
                    <button
                      onClick={loadPipelines}
                      className="mt-2 text-sm text-yellow-700 hover:text-yellow-900 underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}

        {/* Pipeline List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading pipelines...</p>
          </div>
        ) : pipelines.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No pipelines</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new data processing pipeline
            </p>
            <div className="mt-6">
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors mx-auto"
              >
                <PlusIcon className="w-5 h-5" />
                Create Pipeline
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pipelines.map((pipeline) => (
              <div
                key={pipeline.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <PipelineNameEditor
                        name={pipeline.name}
                        description={pipeline.description}
                        onNameChange={async (name, description) => {
                          const updatedPipeline = {
                            ...pipeline,
                            name,
                            description: description || pipeline.description,
                            updatedAt: new Date()
                          };
                          try {
                            await handleSave(updatedPipeline);
                            setPipelines(pipelines.map(p => p.id === pipeline.id ? updatedPipeline : p));
                          } catch (error) {
                            console.error('Failed to update pipeline:', error);
                          }
                        }}
                        showDescription={true}
                        size="small"
                        className="mb-1"
                      />
                    </div>
                    
                    <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(pipeline.status)}`}>
                      {pipeline.status}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex justify-between text-sm text-gray-600 mb-4">
                    <span>{pipeline.nodes.length} nodes</span>
                    <span>v{pipeline.version}</span>
                    <span>{formatDate(pipeline.updatedAt)}</span>
                  </div>

                  {/* Tags */}
                  {pipeline.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {pipeline.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {pipeline.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          +{pipeline.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(pipeline)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </button>
                    
                    {pipeline.status === 'active' && (
                      <button
                        onClick={() => handleRun(pipeline)}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
                      >
                        <PlayIcon className="w-4 h-4" />
                        Run
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDelete(pipeline.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm font-medium transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Getting Started */}
        {pipelines.length > 0 && (
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <DocumentIcon className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  Getting Started with Pipeline Builder
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Drag nodes from the palette to create your workflow</li>
                  <li>• Connect nodes by dragging from output to input handles</li>
                  <li>• Configure each node by clicking on it</li>
                  <li>• Use source nodes to input data, transforms to process it, and outputs to save results</li>
                  <li>• Add privacy nodes to detect and redact sensitive information</li>
                </ul>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </main>

      {/* Create Pipeline Modal */}
      <CreatePipelineModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreatePipeline}
      />
    </AppLayout>
  );
}