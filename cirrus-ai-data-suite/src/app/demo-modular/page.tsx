'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { 
  Modal, 
  Button, 
  Panel, 
  LoadingState, 
  ErrorState, 
  EmptyState 
} from '@/features/shared/components';
import { useModal, useLoading, useAPI } from '@/features/shared/hooks';
import { 
  DocumentPlusIcon, 
  TrashIcon, 
  PencilIcon 
} from '@heroicons/react/24/outline';

// Demo data
const demoItems = [
  { id: '1', name: 'Item One', description: 'First demo item' },
  { id: '2', name: 'Item Two', description: 'Second demo item' },
];

// Mock API functions
const mockAPI = {
  getItems: () => new Promise<typeof demoItems>(resolve => 
    setTimeout(() => resolve(demoItems), 1000)
  ),
  createItem: (data: { name: string; description: string }) => new Promise<{ id: string; name: string; description: string }>(resolve => 
    setTimeout(() => resolve({ id: Date.now().toString(), ...data }), 1000)
  ),
  deleteItem: () => new Promise(resolve => 
    setTimeout(() => resolve({ success: true }), 500)
  ),
};

export default function ModularDemoPage() {
  const [items, setItems] = useState<typeof demoItems>([]);
  const [showError, setShowError] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  
  // Hooks
  const createModal = useModal();
  const deleteModal = useModal();
  const { isLoading, withLoading } = useLoading();
  
  // API hooks
  const loadItems = useAPI(mockAPI.getItems, {
    onSuccess: (data) => setItems(data),
  });
  
  const createItem = useAPI(mockAPI.createItem, {
    onSuccess: (newItem: { id: string; name: string; description: string }) => {
      setItems([...items, newItem]);
      createModal.close();
    },
  });

  // Demo controls
  const toggleError = () => setShowError(!showError);
  const toggleEmpty = () => setShowEmpty(!showEmpty);

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Modular Components Demo</h1>
          <p className="text-gray-600 mt-2">
            This page demonstrates the new shared components and patterns
          </p>
        </div>

        {/* Demo Controls */}
        <Panel title="Demo Controls" description="Toggle different states">
          <div className="flex gap-4">
            <Button variant="secondary" onClick={toggleError}>
              Toggle Error State
            </Button>
            <Button variant="secondary" onClick={toggleEmpty}>
              Toggle Empty State
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => withLoading(() => loadItems.execute())}
            >
              Load Items
            </Button>
          </div>
        </Panel>

        {/* Main Content Panel */}
        <Panel 
          title="Items"
          description="Manage your items using the new component patterns"
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<DocumentPlusIcon className="h-4 w-4" />}
              onClick={createModal.open}
            >
              Add Item
            </Button>
          }
        >
          {isLoading || loadItems.loading ? (
            <LoadingState message="Loading items..." />
          ) : showError ? (
            <ErrorState 
              title="Failed to load items"
              message="This is a demo error state"
              onRetry={() => setShowError(false)}
            />
          ) : showEmpty || items.length === 0 ? (
            <EmptyState
              icon={<DocumentPlusIcon />}
              title="No items yet"
              description="Create your first item to get started with this demo"
              action={{
                label: "Create Item",
                onClick: createModal.open,
                icon: <DocumentPlusIcon className="h-4 w-4" />
              }}
            />
          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<PencilIcon className="h-4 w-4" />}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<TrashIcon className="h-4 w-4" />}
                      onClick={() => deleteModal.open()}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Create Modal */}
        <Modal
          isOpen={createModal.isOpen}
          onClose={createModal.close}
          title="Create New Item"
          size="md"
        >
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createItem.execute({
                name: formData.get('name') as string,
                description: formData.get('description') as string,
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                name="name"
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={createModal.close}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={createItem.loading}
              >
                Create Item
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModal.isOpen}
          onClose={deleteModal.close}
          title="Delete Item"
          size="sm"
        >
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete this item? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={deleteModal.close}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                // Delete logic here
                deleteModal.close();
              }}
            >
              Delete
            </Button>
          </div>
        </Modal>

        {/* Component Examples */}
        <Panel title="Button Variants">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="lg">Large</Button>
            <Button variant="primary" loading>Loading</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </Panel>
      </div>
    </AppLayout>
  );
}