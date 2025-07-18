'use client';

import React, { useState } from 'react';
import { 
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

import { NodeType, NodeTemplate } from '@/types/pipeline';
import { PipelineNodeTemplates } from '@/services/pipelineNodeTemplates';

interface NodePaletteProps {
  onClose: () => void;
}

const NODE_TYPE_INFO = {
  source: {
    label: 'Sources',
    description: 'Data input nodes',
    color: '#3b82f6'
  },
  transform: {
    label: 'Transforms',
    description: 'Data processing nodes',
    color: '#dc2626'
  },
  analyze: {
    label: 'Analysis',
    description: 'Data analysis nodes',
    color: '#059669'
  },
  privacy: {
    label: 'Privacy',
    description: 'Privacy protection nodes',
    color: '#7c2d12'
  },
  output: {
    label: 'Outputs',
    description: 'Data export nodes',
    color: '#0891b2'
  },
  control: {
    label: 'Control',
    description: 'Flow control nodes',
    color: '#6b7280'
  }
} as const;

export default function NodePalette({ onClose }: NodePaletteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodeTypes, setExpandedNodeTypes] = useState<Set<NodeType>>(new Set(['source', 'transform']));
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['file', 'format']));

  // Get all templates and filter by search
  const allTemplates = PipelineNodeTemplates.getAllTemplates().filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group templates by node type, then by category
  const templatesByTypeAndCategory = allTemplates.reduce((acc, template) => {
    if (!acc[template.type]) {
      acc[template.type] = {};
    }
    if (!acc[template.type][template.category]) {
      acc[template.type][template.category] = [];
    }
    acc[template.type][template.category].push(template);
    return acc;
  }, {} as Record<NodeType, Record<string, NodeTemplate[]>>);

  // Handle drag start
  const onDragStart = (event: React.DragEvent, template: NodeTemplate) => {
    event.dataTransfer.setData('application/reactflow', template.name);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Toggle node type expansion
  const toggleNodeType = (nodeType: NodeType) => {
    const newExpanded = new Set(expandedNodeTypes);
    if (newExpanded.has(nodeType)) {
      newExpanded.delete(nodeType);
    } else {
      newExpanded.add(nodeType);
    }
    setExpandedNodeTypes(newExpanded);
  };

  // Toggle category expansion within a node type
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Node Palette</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Node Templates - Accordion Style */}
      <div className="flex-1 overflow-y-auto">
        {Object.keys(templatesByTypeAndCategory).length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">No nodes found</p>
            {searchTerm && (
              <p className="text-xs mt-1">Try adjusting your search terms</p>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {(Object.keys(NODE_TYPE_INFO) as NodeType[]).map((nodeType) => {
              const nodeTypeInfo = NODE_TYPE_INFO[nodeType];
              const isNodeTypeExpanded = expandedNodeTypes.has(nodeType);
              const categoriesForType = templatesByTypeAndCategory[nodeType] || {};
              const totalNodesForType = Object.values(categoriesForType).reduce(
                (sum, templates) => sum + templates.length, 0
              );

              // Skip node types with no templates
              if (totalNodesForType === 0) return null;

              return (
                <div key={nodeType} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Node Type Header */}
                  <button
                    onClick={() => toggleNodeType(nodeType)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{ backgroundColor: nodeTypeInfo.color }}
                      >
                        <div className="w-3 h-3 bg-white rounded-sm opacity-90"></div>
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {nodeTypeInfo.label}
                        </h3>
                        <p className="text-xs text-gray-600">{nodeTypeInfo.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                        {totalNodesForType}
                      </span>
                      {isNodeTypeExpanded ? (
                        <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {/* Categories within Node Type */}
                  {isNodeTypeExpanded && (
                    <div className="border-t border-gray-200">
                      {Object.entries(categoriesForType).map(([category, templates]) => {
                        const isCategoryExpanded = expandedCategories.has(`${nodeType}-${category}`);
                        
                        return (
                          <div key={category} className="border-b border-gray-100 last:border-b-0">
                            {/* Category Header */}
                            <button
                              onClick={() => toggleCategory(`${nodeType}-${category}`)}
                              className="w-full flex items-center justify-between p-3 pl-6 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="capitalize font-medium">{category}</span>
                                <span className="text-xs text-gray-500">({templates.length})</span>
                              </div>
                              {isCategoryExpanded ? (
                                <ChevronDownIcon className="w-3 h-3 text-gray-400" />
                              ) : (
                                <ChevronRightIcon className="w-3 h-3 text-gray-400" />
                              )}
                            </button>

                            {/* Templates in Category */}
                            {isCategoryExpanded && (
                              <div className="pl-6 pr-3 pb-3 space-y-2">
                                {templates.map((template) => (
                                  <div
                                    key={template.name}
                                    className="p-3 border border-gray-200 rounded-lg cursor-move hover:border-blue-300 hover:shadow-sm transition-all bg-white"
                                    draggable
                                    onDragStart={(e) => onDragStart(e, template)}
                                    title={`Drag to add ${template.name} to pipeline`}
                                  >
                                    <div className="flex items-start gap-3">
                                      {/* Icon */}
                                      <div
                                        className="w-8 h-8 rounded-md flex items-center justify-center text-white flex-shrink-0"
                                        style={{ backgroundColor: template.color }}
                                      >
                                        <div className="w-4 h-4 bg-white rounded-sm opacity-80"></div>
                                      </div>

                                      {/* Content */}
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm text-gray-900 truncate">
                                          {template.name}
                                        </h4>
                                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                          {template.description}
                                        </p>
                                        
                                        {/* Input/Output info */}
                                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                                          <span>{template.inputs.length} in</span>
                                          <span>{template.outputs.length} out</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-600">
          Drag nodes onto the canvas to build your pipeline
        </p>
      </div>
    </div>
  );
}