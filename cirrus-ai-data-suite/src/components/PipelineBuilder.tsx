'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  NodeTypes,
  ReactFlowInstance,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Pipeline, PipelineNode, PipelineEdge, NodeType } from '@/types/pipeline';
import { PipelineNodeTemplates } from '@/services/pipelineNodeTemplates';
import { PipelineService } from '@/services/pipelineService';
import PipelineNodeComponent from './PipelineNodeComponent';
import NodePalette from './NodePalette';
import PipelineControls from './PipelineControls';

interface PipelineBuilderProps {
  pipeline?: Pipeline;
  onPipelineChange?: (pipeline: Pipeline) => void;
  onSave?: (pipeline: Pipeline) => void;
  onRun?: (pipeline: Pipeline) => void;
  readOnly?: boolean;
}

const nodeTypes: NodeTypes = {
  source: PipelineNodeComponent,
  transform: PipelineNodeComponent,
  analyze: PipelineNodeComponent,
  privacy: PipelineNodeComponent,
  output: PipelineNodeComponent,
  control: PipelineNodeComponent,
};

export default function PipelineBuilder({
  pipeline,
  onPipelineChange,
  onSave,
  onRun,
  readOnly = false
}: PipelineBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  // Handle node configuration updates
  // Initialize nodes and edges from pipeline first
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const handleNodeConfigUpdate = useCallback((nodeId: string, config: Record<string, unknown>) => {
    setNodes(nds => nds.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, config } }
        : node
    ));
  }, [setNodes]);

  // Initialize with pipeline data
  useEffect(() => {
    if (pipeline) {
      const initialNodes: Node[] = pipeline.nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: { ...node.data, onUpdateConfig: handleNodeConfigUpdate },
        selected: node.selected
      }));

      const initialEdges: Edge[] = pipeline.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || undefined,
        targetHandle: edge.targetHandle || undefined,
        type: edge.type || 'default'
      }));

      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [pipeline, handleNodeConfigUpdate, setNodes, setEdges]);
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);

  // Update nodes with configuration callback when pipeline changes
  React.useEffect(() => {
    if (pipeline?.nodes) {
      const updatedNodes = pipeline.nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: { ...node.data, onUpdateConfig: handleNodeConfigUpdate },
        selected: node.selected
      }));
      setNodes(updatedNodes);
    }
  }, [pipeline?.nodes, handleNodeConfigUpdate, setNodes]);

  // Handle new connections between nodes
  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return;
      
      setEdges((eds) => addEdge({
        ...params,
        id: `edge_${Date.now()}`,
        type: 'default'
      }, eds));
    },
    [setEdges, readOnly]
  );

  // Handle dropping nodes from palette
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (readOnly) return;
      
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const templateName = event.dataTransfer.getData('application/reactflow');

      if (templateName && reactFlowBounds && reactFlowInstance) {
        const template = PipelineNodeTemplates.getTemplateByName(templateName);
        if (!template) return;

        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        const newNode = PipelineNodeTemplates.createNodeFromTemplate(template, position);
        
        setNodes((nds) => nds.concat({
          id: newNode.id,
          type: newNode.type,
          position: newNode.position,
          data: { ...newNode.data, onUpdateConfig: handleNodeConfigUpdate }
        }));
      }
    },
    [reactFlowInstance, setNodes, readOnly, handleNodeConfigUpdate]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle node deletion
  const onNodesDelete = useCallback(
    (nodesToDelete: Node[]) => {
      if (readOnly) return;
      
      const nodeIdsToDelete = nodesToDelete.map(node => node.id);
      setEdges((eds) => eds.filter(edge => 
        !nodeIdsToDelete.includes(edge.source) && 
        !nodeIdsToDelete.includes(edge.target)
      ));
    },
    [setEdges, readOnly]
  );

  // Create pipeline object from current state
  const getCurrentPipeline = useCallback((): Pipeline => {
    const pipelineNodes: PipelineNode[] = nodes.map(node => ({
      id: node.id,
      type: node.type as NodeType,
      position: node.position,
      data: node.data,
      selected: node.selected
    }));

    const pipelineEdges: PipelineEdge[] = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || undefined,
      targetHandle: edge.targetHandle || undefined,
      type: (edge.type === 'smoothstep' || edge.type === 'straight') ? edge.type : 'default'
    }));

    return {
      id: pipeline?.id || `pipeline_${Date.now()}`,
      name: pipeline?.name || 'Untitled Pipeline',
      description: pipeline?.description || '',
      nodes: pipelineNodes,
      edges: pipelineEdges,
      triggers: pipeline?.triggers || [],
      status: pipeline?.status || 'draft',
      createdAt: pipeline?.createdAt || new Date(),
      updatedAt: new Date(),
      createdBy: pipeline?.createdBy || 'current-user',
      tags: pipeline?.tags || [],
      version: (pipeline?.version || 0) + 1
    };
  }, [nodes, edges, pipeline]);

  // Auto-save and notify parent of changes
  React.useEffect(() => {
    const currentPipeline = getCurrentPipeline();
    
    if (onPipelineChange) {
      onPipelineChange(currentPipeline);
    }

    // Auto-save to local storage (debounced)
    if (currentPipeline.nodes.length > 0 || currentPipeline.edges.length > 0) {
      PipelineService.autoSavePipeline(currentPipeline);
    }
  }, [nodes, edges, onPipelineChange, getCurrentPipeline]);

  // Handle save
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(getCurrentPipeline());
    }
  }, [onSave, getCurrentPipeline]);

  // Handle run
  const handleRun = useCallback(() => {
    if (onRun) {
      onRun(getCurrentPipeline());
    }
  }, [onRun, getCurrentPipeline]);

  // Clear pipeline
  const handleClear = useCallback(() => {
    if (readOnly) return;
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges, readOnly]);

  return (
    <div className="flex h-full bg-gray-50">
      {/* Node Palette */}
      {isPaletteOpen && !readOnly && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <NodePalette
            onClose={() => setIsPaletteOpen(false)}
          />
        </div>
      )}

      {/* Main Pipeline Canvas */}
      <div className="flex-1 relative">
        <div
          ref={reactFlowWrapper}
          className="w-full h-full"
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodesDelete={onNodesDelete}
            onInit={(instance) => setReactFlowInstance(instance)}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
            className="bg-gray-50"
            deleteKeyCode={readOnly ? null : 'Delete'}
          >
            <Controls position="top-left" />
            <MiniMap
              position="bottom-right"
              nodeStrokeColor="#374151"
              nodeColor="#f3f4f6"
              nodeBorderRadius={4}
            />
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#d1d5db"
            />
            
            {/* Pipeline Controls Panel */}
            <Panel position="top-right">
              <PipelineControls
                pipeline={getCurrentPipeline()}
                onSave={handleSave}
                onRun={handleRun}
                onClear={handleClear}
                onTogglePalette={() => setIsPaletteOpen(!isPaletteOpen)}
                readOnly={readOnly}
                isPaletteOpen={isPaletteOpen}
              />
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}