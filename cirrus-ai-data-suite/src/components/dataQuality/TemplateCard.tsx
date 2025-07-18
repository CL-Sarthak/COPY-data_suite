'use client';

import { useState } from 'react';
import {
  BeakerIcon,
  ClipboardDocumentIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ChartBarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface DataQualityTemplate {
  id: string;
  name: string;
  description?: string;
  templateType: 'remediation' | 'normalization' | 'global';
  category: string;
  methodName: string;
  usageCount: number;
  successRate?: number;
  avgProcessingTimeMs?: number;
  isSystemTemplate: boolean;
  isCustom: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  tags?: string[];
  usageRecommendations?: string;
  exampleBefore?: Record<string, unknown>;
  exampleAfter?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
}

interface TemplateCardProps {
  template: DataQualityTemplate;
  onEdit?: (template: DataQualityTemplate) => void;
  onDelete?: (template: DataQualityTemplate) => void;
  onDuplicate?: (template: DataQualityTemplate) => void;
  onPreview?: (template: DataQualityTemplate) => void;
  onSelect?: (template: DataQualityTemplate) => void;
  isSelected?: boolean;
  showActions?: boolean;
}

export default function TemplateCard({
  template,
  onEdit,
  onDelete,
  onDuplicate,
  onPreview,
  onSelect,
  isSelected = false,
  showActions = true
}: TemplateCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'statistical_normalization': return <ChartBarIcon className="h-5 w-5" />;
      case 'format_standardization': return <ArrowPathIcon className="h-5 w-5" />;
      case 'data_cleaning': return <SparklesIcon className="h-5 w-5" />;
      case 'validation': return <CheckCircleIcon className="h-5 w-5" />;
      default: return <BeakerIcon className="h-5 w-5" />;
    }
  };

  const getSuccessRateColor = (rate?: number) => {
    if (!rate) return 'text-gray-500';
    if (rate >= 0.9) return 'text-green-600';
    if (rate >= 0.75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatProcessingTime = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div
      className={`bg-white overflow-hidden shadow rounded-lg border-2 transition-all ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
      } ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={() => onSelect && onSelect(template)}
    >
      <div className="px-4 py-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg ${
              template.templateType === 'normalization' ? 'bg-blue-100' :
              template.templateType === 'remediation' ? 'bg-orange-100' :
              'bg-purple-100'
            }`}>
              {getCategoryIcon(template.category)}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
              {template.description && (
                <p className="mt-1 text-sm text-gray-500">{template.description}</p>
              )}
            </div>
          </div>
          
          {showActions && (
            <div className="flex space-x-1">
              {onPreview && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(template);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600"
                  title="Preview"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
              )}
              {onDuplicate && !template.isSystemTemplate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(template);
                  }}
                  className="p-1 text-gray-400 hover:text-green-600"
                  title="Duplicate"
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                </button>
              )}
              {onEdit && !template.isSystemTemplate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(template);
                  }}
                  className="p-1 text-gray-400 hover:text-yellow-600"
                  title="Edit"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              )}
              {onDelete && !template.isSystemTemplate && template.isCustom && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(template);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Delete"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          {/* Template Type */}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            template.templateType === 'normalization' ? 'bg-blue-100 text-blue-800' :
            template.templateType === 'remediation' ? 'bg-orange-100 text-orange-800' :
            'bg-purple-100 text-purple-800'
          }`}>
            {template.templateType}
          </span>

          {/* Risk Level */}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskLevelColor(template.riskLevel)}`}>
            {template.riskLevel} risk
          </span>

          {/* System/Custom */}
          {template.isSystemTemplate ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              System
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Custom
            </span>
          )}

          {/* Category */}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {template.category.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Usage</p>
            <p className="font-medium">{template.usageCount} times</p>
          </div>
          <div>
            <p className="text-gray-500">Success Rate</p>
            <p className={`font-medium ${getSuccessRateColor(template.successRate)}`}>
              {template.successRate ? `${Math.round(template.successRate * 100)}%` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Avg Time</p>
            <p className="font-medium">{formatProcessingTime(template.avgProcessingTimeMs)}</p>
          </div>
        </div>

        {/* Show Details Toggle */}
        {(template.usageRecommendations || template.exampleBefore) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <InformationCircleIcon className="h-4 w-4 mr-1" />
            {showDetails ? 'Hide' : 'Show'} details
          </button>
        )}

        {/* Expandable Details */}
        {showDetails && (
          <div className="mt-4 space-y-3 border-t pt-4">
            {template.usageRecommendations && (
              <div>
                <h4 className="text-sm font-medium text-gray-900">Usage Recommendations</h4>
                <p className="mt-1 text-sm text-gray-600">{template.usageRecommendations}</p>
              </div>
            )}

            {template.exampleBefore && template.exampleAfter && (
              <div>
                <h4 className="text-sm font-medium text-gray-900">Example</h4>
                <div className="mt-1 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Before:</p>
                    <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(template.exampleBefore, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">After:</p>
                    <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(template.exampleAfter, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {template.configuration && typeof template.configuration.normalizationType === 'string' && (
              <div>
                <h4 className="text-sm font-medium text-gray-900">Configuration</h4>
                <p className="mt-1 text-sm text-gray-600">
                  Type: {template.configuration.normalizationType}
                  {Array.isArray(template.configuration.scaleRange) && ` | Range: [${template.configuration.scaleRange.join(', ')}]`}
                  {template.configuration.handleOutliers === true && ' | Handles Outliers'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}