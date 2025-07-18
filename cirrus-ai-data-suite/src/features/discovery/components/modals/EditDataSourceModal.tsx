import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@/features/shared/components';
import { DataSource } from '@/types/discovery';

interface EditDataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSource: DataSource;
  onSave: (id: string, updates: Partial<DataSource>) => Promise<void>;
}

export function EditDataSourceModal({ 
  isOpen, 
  onClose, 
  dataSource, 
  onSave 
}: EditDataSourceModalProps) {
  const [name, setName] = useState(dataSource.name);
  const [tags, setTags] = useState(dataSource.tags?.join(', ') || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(dataSource.name);
      setTags(dataSource.tags?.join(', ') || '');
    }
  }, [isOpen, dataSource]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(dataSource.id, {
        name: name.trim(),
        tags: tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0)
      });
      onClose();
    } catch (error) {
      console.error('Failed to update data source:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Data Source"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter tags separated by commas"
          />
          <p className="mt-1 text-sm text-gray-500">
            Separate multiple tags with commas
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Data Source Information
          </h4>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between">
              <dt className="text-gray-500">Type:</dt>
              <dd className="font-medium">{dataSource.type}</dd>
            </div>
            {dataSource.transformedAt && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Last Transformed:</dt>
                <dd className="font-medium">
                  {new Date(dataSource.transformedAt).toLocaleDateString()}
                </dd>
              </div>
            )}
            {dataSource.recordCount && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Records:</dt>
                <dd className="font-medium">
                  {dataSource.recordCount.toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}