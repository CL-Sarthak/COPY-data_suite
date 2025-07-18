'use client';

import React, { useState } from 'react';
import {
  PlayIcon,
  StopIcon,
  BookmarkIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

import { Pipeline, PipelineStatus } from '@/types/pipeline';

interface PipelineControlsProps {
  pipeline: Pipeline;
  onSave?: () => void;
  onRun?: () => void;
  onClear?: () => void;
  onTogglePalette?: () => void;
  readOnly?: boolean;
  isPaletteOpen?: boolean;
}

export default function PipelineControls({
  pipeline,
  onSave,
  onRun,
  onClear,
  onTogglePalette,
  readOnly = false,
  isPaletteOpen = true
}: PipelineControlsProps) {
  const [showInfo, setShowInfo] = useState(false);

  // Get pipeline status info
  const getStatusInfo = (status: PipelineStatus) => {
    switch (status) {
      case 'draft':
        return {
          icon: InformationCircleIcon,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          label: 'Draft'
        };
      case 'active':
        return {
          icon: CheckCircleIcon,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: 'Active'
        };
      case 'paused':
        return {
          icon: StopIcon,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          label: 'Paused'
        };
      case 'error':
        return {
          icon: ExclamationTriangleIcon,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: 'Error'
        };
      case 'completed':
        return {
          icon: CheckCircleIcon,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          label: 'Completed'
        };
      default:
        return {
          icon: InformationCircleIcon,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          label: 'Unknown'
        };
    }
  };

  const statusInfo = getStatusInfo(pipeline.status);
  const StatusIcon = statusInfo.icon;

  // Validate pipeline
  const validatePipeline = () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for nodes
    if (pipeline.nodes.length === 0) {
      errors.push('Pipeline must contain at least one node');
    }

    // Check for source nodes
    const sourceNodes = pipeline.nodes.filter(node => node.type === 'source');
    if (sourceNodes.length === 0) {
      errors.push('Pipeline must contain at least one source node');
    }

    // Check for output nodes
    const outputNodes = pipeline.nodes.filter(node => node.type === 'output');
    if (outputNodes.length === 0) {
      warnings.push('Pipeline has no output nodes - processed data will not be saved');
    }

    // Check for disconnected nodes
    const connectedNodeIds = new Set<string>();
    pipeline.edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });
    
    const disconnectedNodes = pipeline.nodes.filter(node => 
      !connectedNodeIds.has(node.id) && pipeline.nodes.length > 1
    );
    
    if (disconnectedNodes.length > 0) {
      warnings.push(`${disconnectedNodes.length} node(s) are not connected to the pipeline`);
    }

    return { errors, warnings, isValid: errors.length === 0 };
  };

  const validation = validatePipeline();

  // Can run pipeline
  const canRun = !readOnly && validation.isValid && pipeline.nodes.length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[280px]">
      {/* Pipeline Info */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-sm truncate">
            {pipeline.name}
          </h3>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <InformationCircleIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color} ${statusInfo.bgColor}`}>
            <StatusIcon className="w-3 h-3" />
            {statusInfo.label}
          </div>
          <span className="text-xs text-gray-500">
            v{pipeline.version}
          </span>
        </div>

        {/* Extended Info */}
        {showInfo && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-gray-700">Nodes:</span>
                <span className="ml-1 text-gray-600">{pipeline.nodes.length}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Edges:</span>
                <span className="ml-1 text-gray-600">{pipeline.edges.length}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <span className="ml-1 text-gray-600">
                  {pipeline.createdAt.toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Updated:</span>
                <span className="ml-1 text-gray-600">
                  {pipeline.updatedAt.toLocaleDateString()}
                </span>
              </div>
            </div>
            
            {pipeline.description && (
              <div className="mt-2">
                <span className="font-medium text-gray-700">Description:</span>
                <p className="text-gray-600 mt-1">{pipeline.description}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Validation Status */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="mb-4 space-y-2">
          {validation.errors.map((error, index) => (
            <div key={`error-${index}`} className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-red-700">{error}</span>
            </div>
          ))}
          
          {validation.warnings.map((warning, index) => (
            <div key={`warning-${index}`} className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <span className="text-yellow-700">{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {/* Primary Actions */}
        <div className="flex gap-2">
          {!readOnly && (
            <>
              <button
                onClick={onRun}
                disabled={!canRun}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  canRun
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                title={canRun ? 'Run pipeline' : 'Fix validation errors to run'}
              >
                <PlayIcon className="w-4 h-4" />
                Run
              </button>

              <button
                onClick={onSave}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                title="Save pipeline"
              >
                <BookmarkIcon className="w-4 h-4" />
                Save
              </button>
            </>
          )}
        </div>

        {/* Secondary Actions */}
        <div className="flex gap-2">
          {!readOnly && (
            <button
              onClick={onClear}
              className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
              title="Clear all nodes"
            >
              <TrashIcon className="w-4 h-4" />
              Clear
            </button>
          )}

          <button
            onClick={onTogglePalette}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            title={`${isPaletteOpen ? 'Hide' : 'Show'} node palette`}
          >
            {isPaletteOpen ? (
              <EyeSlashIcon className="w-4 h-4" />
            ) : (
              <EyeIcon className="w-4 h-4" />
            )}
            Palette
          </button>
        </div>
      </div>

      {/* Node Type Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Node Types</h4>
        <div className="grid grid-cols-3 gap-1 text-xs">
          {['source', 'transform', 'analyze', 'privacy', 'output', 'control'].map(type => {
            const count = pipeline.nodes.filter(node => node.type === type).length;
            return (
              <div key={type} className="text-center p-1">
                <div className="font-medium text-gray-900">{count}</div>
                <div className="text-gray-500 capitalize">{type}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}