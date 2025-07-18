'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  DocumentIcon, 
  CircleStackIcon, 
  CloudIcon,
  ArrowsRightLeftIcon,
  FunnelIcon,
  ArrowsPointingOutIcon,
  ChartBarIcon,
  ChartPieIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  PaperAirplaneIcon,
  ArrowsUpDownIcon,
  ArrowsPointingInIcon,
  CogIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import { NodeData, NodeInput, NodeOutput } from '@/types/pipeline';
import NodeConfigurationPanel from './NodeConfigurationPanel';

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  DocumentIcon,
  CircleStackIcon,
  CloudIcon,
  ArrowsRightLeftIcon,
  FunnelIcon,
  ArrowsPointingOutIcon,
  ChartBarIcon,
  ChartPieIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  PaperAirplaneIcon,
  ArrowsUpDownIcon,
  ArrowsPointingInIcon,
  CogIcon
};

interface PipelineNodeComponentProps extends NodeProps {
  data: NodeData & {
    onUpdateConfig?: (nodeId: string, config: Record<string, unknown>) => void;
  };
}

const PipelineNodeComponent = memo(({ id, type, data, selected }: PipelineNodeComponentProps) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const IconComponent = iconMap[data.icon] || CogIcon;

  // Handle configuration updates
  const handleConfigUpdate = (nodeId: string, config: Record<string, unknown>) => {
    if (data.onUpdateConfig) {
      data.onUpdateConfig(nodeId, config);
    } else {
      console.log('Configuration updated for node:', nodeId, config);
    }
  };

  // Get background color based on node type
  const getBackgroundColor = () => {
    if (selected) return '#dbeafe'; // blue-100
    if (isHovered) return '#f9fafb'; // gray-50
    return '#ffffff';
  };

  // Get border color based on node type
  const getBorderColor = () => {
    if (selected) return '#3b82f6'; // blue-500
    return data.color || '#6b7280';
  };

  // Render input handles
  const renderInputs = () => {
    if (!data.inputs || data.inputs.length === 0) return null;

    return data.inputs.map((input: NodeInput, index: number) => {
      const yPosition = data.inputs.length === 1 ? 50 : (index / (data.inputs.length - 1)) * 100;
      
      return (
        <Handle
          key={input.id}
          type="target"
          position={Position.Left}
          id={input.id}
          style={{
            top: `${yPosition}%`,
            transform: 'translateY(-50%)',
            width: '12px',
            height: '12px',
            backgroundColor: input.required ? '#dc2626' : '#6b7280',
            border: '2px solid white'
          }}
          title={`${input.name}${input.required ? ' (Required)' : ''}: ${input.description || ''}`}
        />
      );
    });
  };

  // Render output handles
  const renderOutputs = () => {
    if (!data.outputs || data.outputs.length === 0) return null;

    return data.outputs.map((output: NodeOutput, index: number) => {
      const yPosition = data.outputs.length === 1 ? 50 : (index / (data.outputs.length - 1)) * 100;
      
      return (
        <Handle
          key={output.id}
          type="source"
          position={Position.Right}
          id={output.id}
          style={{
            top: `${yPosition}%`,
            transform: 'translateY(-50%)',
            width: '12px',
            height: '12px',
            backgroundColor: data.color || '#6b7280',
            border: '2px solid white'
          }}
          title={`${output.name}: ${output.description || ''}`}
        />
      );
    });
  };

  // Check for configuration errors
  const hasConfigErrors = () => {
    // Basic validation - in a real implementation, this would be more sophisticated
    if (data.config) {
      const config = data.config;
      
      // Check for empty required fields (simplified)
      if (data.category === 'database' && !config.query) return true;
      if (data.category === 'api' && !config.url) return true;
      if (data.category === 'file' && (!config.fileTypes || (config.fileTypes as string[]).length === 0)) return true;
    }
    
    return false;
  };

  return (
    <>
      <div
        className="relative min-w-[200px] max-w-[280px] rounded-lg border-2 shadow-lg transition-all duration-200"
        style={{
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          boxShadow: selected ? '0 4px 12px rgba(59, 130, 246, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Node Header */}
        <div 
          className="flex items-center gap-3 p-4 rounded-t-lg border-b"
          style={{ 
            backgroundColor: `${data.color}15`,
            borderColor: `${data.color}30`
          }}
        >
          <div 
            className="w-8 h-8 rounded-md flex items-center justify-center text-white"
            style={{ backgroundColor: data.color }}
          >
            <IconComponent className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm truncate">
              {data.label}
            </h3>
            <p className="text-xs text-gray-500 capitalize">
              {data.category}
            </p>
          </div>

          {/* Warning indicator for configuration issues */}
          {hasConfigErrors() && (
            <ExclamationTriangleIcon 
              className="w-4 h-4 text-amber-500" 
              title="Configuration issues detected"
            />
          )}
        </div>

        {/* Node Body */}
        <div className="p-4">
          {data.description && (
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
              {data.description}
            </p>
          )}

          {/* Input/Output Summary */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              {data.inputs?.length || 0} input{(data.inputs?.length || 0) !== 1 ? 's' : ''}
            </span>
            <span>
              {data.outputs?.length || 0} output{(data.outputs?.length || 0) !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Configuration Actions */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsConfigPanelOpen(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
              >
                <CogIcon className="w-3 h-3" />
                Configure
              </button>
              
              {data.config && Object.keys(data.config).length > 0 && (
                <button
                  onClick={() => setIsConfigOpen(!isConfigOpen)}
                  className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                >
                  {isConfigOpen ? 'Hide' : 'Show'} Config
                </button>
              )}
            </div>
            
            {isConfigOpen && data.config && Object.keys(data.config).length > 0 && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                <pre className="text-gray-700 whitespace-pre-wrap break-words">
                  {JSON.stringify(data.config, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Connection Handles */}
        {renderInputs()}
        {renderOutputs()}
      </div>

      {/* Detailed tooltip on hover */}
      {isHovered && (data.inputs?.length > 0 || data.outputs?.length > 0) && (
        <div className="absolute z-50 top-full left-0 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[250px] max-w-[350px]">
          {data.inputs && data.inputs.length > 0 && (
            <div className="mb-3">
              <h4 className="font-semibold text-xs text-gray-700 mb-2">Inputs:</h4>
              {data.inputs.map((input: NodeInput) => (
                <div key={input.id} className="mb-1 text-xs">
                  <span className="font-medium text-gray-900">{input.name}</span>
                  {input.required && <span className="text-red-500 ml-1">*</span>}
                  <span className="text-gray-500 ml-1">({input.type})</span>
                  {input.description && (
                    <p className="text-gray-600 mt-1">{input.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {data.outputs && data.outputs.length > 0 && (
            <div>
              <h4 className="font-semibold text-xs text-gray-700 mb-2">Outputs:</h4>
              {data.outputs.map((output: NodeOutput) => (
                <div key={output.id} className="mb-1 text-xs">
                  <span className="font-medium text-gray-900">{output.name}</span>
                  <span className="text-gray-500 ml-1">({output.type})</span>
                  {output.description && (
                    <p className="text-gray-600 mt-1">{output.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Configuration Panel */}
      <NodeConfigurationPanel
        node={{ id, type, data, position: { x: 0, y: 0 } }}
        isOpen={isConfigPanelOpen}
        onClose={() => setIsConfigPanelOpen(false)}
        onSave={(config) => handleConfigUpdate(id, config)}
      />
    </>
  );
});

PipelineNodeComponent.displayName = 'PipelineNodeComponent';

export default PipelineNodeComponent;