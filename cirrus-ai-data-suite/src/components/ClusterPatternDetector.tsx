import React, { useState, useEffect } from 'react';
import { ClusterPatternService, DetectedCluster, ClusterPattern } from '@/services/clusterPatternService';
import { SensitivePattern } from '@/types';
import { 
  UserGroupIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface Props {
  data: Record<string, unknown> | Record<string, unknown>[];
  onClusterSelect?: (patterns: SensitivePattern[]) => void;
  onCreateCluster?: (cluster: ClusterPattern) => void;
}

export function ClusterPatternDetector({ data, onClusterSelect, onCreateCluster }: Props) {
  const [detectedClusters, setDetectedClusters] = useState<DetectedCluster[]>([]);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [selectedClusters, setSelectedClusters] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClusterName, setNewClusterName] = useState('');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (data) {
      const dataArray = Array.isArray(data) ? data : [data];
      const allClusters: DetectedCluster[] = [];
      
      // Detect clusters in each record
      dataArray.forEach(record => {
        // Convert record values to strings for cluster detection
        const stringRecord: Record<string, string> = {};
        Object.entries(record).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            stringRecord[key] = String(value);
          }
        });
        
        const clusters = ClusterPatternService.detectClustersLegacy(stringRecord);
        clusters.forEach(cluster => {
          // Check if we already have this cluster
          const existing = allClusters.find(c => c.clusterId === cluster.clusterId);
          if (!existing) {
            allClusters.push(cluster);
          } else {
            // Merge confidence scores
            existing.confidence = Math.max(existing.confidence, cluster.confidence);
          }
        });
      });
      
      setDetectedClusters(allClusters);
    }
  }, [data]);

  const toggleClusterExpansion = (clusterId: string) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(clusterId)) {
      newExpanded.delete(clusterId);
    } else {
      newExpanded.add(clusterId);
    }
    setExpandedClusters(newExpanded);
  };

  const toggleClusterSelection = (clusterId: string) => {
    const newSelected = new Set(selectedClusters);
    if (newSelected.has(clusterId)) {
      newSelected.delete(clusterId);
    } else {
      newSelected.add(clusterId);
    }
    setSelectedClusters(newSelected);
  };

  const applySelectedClusters = () => {
    if (onClusterSelect) {
      const selectedClusterData = detectedClusters.filter(c => selectedClusters.has(c.clusterId));
      const patterns = ClusterPatternService.clustersToPatterns(selectedClusterData);
      onClusterSelect(patterns);
    }
  };

  const createCustomCluster = () => {
    if (newClusterName && selectedFields.size > 0) {
      const fields = Array.from(selectedFields).map(fieldName => ({
        fieldName,
        pattern: 'Custom Field'
      }));
      
      const newCluster = ClusterPatternService.createClusterFromRelationships(
        fields[0].fieldName,
        fields.slice(1),
        newClusterName,
        'CUSTOM'
      );
      
      if (onCreateCluster) {
        onCreateCluster(newCluster);
      }
      
      // Reset form
      setNewClusterName('');
      setSelectedFields(new Set());
      setShowCreateForm(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.9) return <CheckCircleIcon className="w-4 h-4" />;
    return <ExclamationCircleIcon className="w-4 h-4" />;
  };

  const allFieldNames = Array.isArray(data) 
    ? [...new Set(data.flatMap(d => Object.keys(d)))]
    : Object.keys(data);

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-medium text-purple-900">Cluster Patterns Detected</h3>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-xs text-purple-700 hover:text-purple-900 flex items-center gap-1"
          >
            <PlusIcon className="w-3 h-3" />
            Create Custom Cluster
          </button>
        </div>

        {detectedClusters.length === 0 ? (
          <p className="text-sm text-gray-700">No cluster patterns detected in the current data.</p>
        ) : (
          <div className="space-y-2">
            {detectedClusters.map((cluster) => (
              <div
                key={cluster.clusterId}
                className="bg-white rounded-lg border border-purple-200 p-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleClusterExpansion(cluster.clusterId)}
                        className="p-0.5 hover:bg-purple-100 rounded"
                      >
                        {expandedClusters.has(cluster.clusterId) ? (
                          <ChevronDownIcon className="w-4 h-4 text-gray-700" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4 text-gray-700" />
                        )}
                      </button>
                      <input
                        type="checkbox"
                        checked={selectedClusters.has(cluster.clusterId)}
                        onChange={() => toggleClusterSelection(cluster.clusterId)}
                        className="rounded border-gray-300"
                      />
                      <h4 className="font-medium text-gray-900">{cluster.clusterName}</h4>
                      <div className={`flex items-center gap-1 ${getConfidenceColor(cluster.confidence)}`}>
                        {getConfidenceIcon(cluster.confidence)}
                        <span className="text-xs">
                          {Math.round(cluster.confidence * 100)}% match
                        </span>
                      </div>
                    </div>
                    
                    <div className="ml-9 mt-1">
                      <p className="text-xs text-gray-700">
                        {cluster.detectedFields.length} fields detected • 
                        {Math.round(cluster.completeness * 100)}% complete
                      </p>
                    </div>

                    {expandedClusters.has(cluster.clusterId) && (
                      <div className="ml-9 mt-3 space-y-1">
                        {cluster.detectedFields.map((field, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-black min-w-[120px]">
                              {field.fieldName}:
                            </span>
                            <span className="font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">
                              {field.value.length > 30 ? field.value.substring(0, 30) + '...' : field.value}
                            </span>
                            <span className="text-xs text-gray-700">({field.pattern})</span>
                          </div>
                        ))}
                        
                        {cluster.missingRequiredFields.length > 0 && (
                          <div className="mt-2 text-xs text-orange-700 bg-orange-50 p-2 rounded">
                            Missing required fields: {cluster.missingRequiredFields.join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedClusters.size > 0 && (
          <div className="mt-4 p-3 bg-purple-100 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm text-purple-900">
                <strong>{selectedClusters.size} cluster{selectedClusters.size !== 1 ? 's' : ''} selected</strong>
                <p className="text-xs mt-1">These will be saved as comprehensive redaction patterns</p>
              </div>
              <button
                onClick={applySelectedClusters}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <CheckCircleIcon className="w-4 h-4" />
                Create Pattern{selectedClusters.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Create Custom Cluster</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Cluster Name
              </label>
              <input
                type="text"
                value={newClusterName}
                onChange={(e) => setNewClusterName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                placeholder="e.g., Customer Contact Information"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Select Fields for Cluster
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
                {allFieldNames.map(fieldName => (
                  <label key={fieldName} className="flex items-center gap-2 p-1 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedFields.has(fieldName)}
                      onChange={(e) => {
                        const newFields = new Set(selectedFields);
                        if (e.target.checked) {
                          newFields.add(fieldName);
                        } else {
                          newFields.delete(fieldName);
                        }
                        setSelectedFields(newFields);
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-900">{fieldName}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewClusterName('');
                  setSelectedFields(new Set());
                }}
                className="px-3 py-1.5 text-gray-700 text-sm hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={createCustomCluster}
                disabled={!newClusterName || selectedFields.size === 0}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Create Cluster
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3">
        <strong>Cluster Patterns</strong> automatically detect groups of related fields that commonly appear together,
        such as complete addresses, payment information, or personal identity data. This helps ensure comprehensive
        redaction of related sensitive information.
      </div>
    </div>
  );
}