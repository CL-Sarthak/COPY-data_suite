import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NodeConfigurationPanel } from '../index';
import { PipelineNode } from '@/types/pipeline';

// Mock createPortal
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

describe('NodeConfigurationPanel', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  const mockNode: PipelineNode = {
    id: 'test-node',
    type: 'customNode',
    position: { x: 0, y: 0 },
    data: {
      label: 'Test Node',
      nodeType: 'source',
      category: 'file',
      config: {},
      style: {}
    }
  };

  const mockDataSources = [
    { id: 'ds1', name: 'Test Data Source 1', type: 'filesystem', configuration: { files: [] } },
    { id: 'ds2', name: 'Test Data Source 2', type: 'filesystem', configuration: { files: [] } }
  ];

  const mockPatterns = [
    { id: 'p1', name: 'SSN Pattern', type: 'ssn', pattern: '\\d{3}-\\d{2}-\\d{4}' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fetch for API calls
    global.fetch = jest.fn((url) => {
      if (url === '/api/data-sources') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDataSources)
        } as Response);
      }
      if (url === '/api/patterns') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPatterns)
        } as Response);
      }
      return Promise.reject(new Error('Unknown URL'));
    }) as jest.Mock;
  });

  it('should not render when closed', () => {
    const { container } = render(
      <NodeConfigurationPanel
        isOpen={false}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should render when open with a node', async () => {
    render(
      <NodeConfigurationPanel
        isOpen={true}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Configure Test Node')).toBeInTheDocument();
      expect(screen.getByText('source / file')).toBeInTheDocument();
    });
  });

  it('should show loading state while fetching resources', async () => {
    render(
      <NodeConfigurationPanel
        isOpen={true}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Loading configuration resources...')).toBeInTheDocument();
  });

  it('should show error state when resources fail to load', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Failed to load')) as jest.Mock;

    render(
      <NodeConfigurationPanel
        isOpen={true}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load configuration resources/)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('should close when close button is clicked', async () => {
    render(
      <NodeConfigurationPanel
        isOpen={true}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Configure Test Node')).toBeInTheDocument();
    });

    // Find the X icon button in the header
    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find(button => {
      // The X button is the one with an svg child
      return button.querySelector('svg') && button.className.includes('hover:text-gray-500');
    });
    
    expect(xButton).toBeTruthy();
    fireEvent.click(xButton!);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should validate required fields', async () => {
    render(
      <NodeConfigurationPanel
        isOpen={true}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      const saveButton = screen.getByText('Save Configuration');
      expect(saveButton).toBeDisabled();
    });
  });

  it('should save configuration when valid', async () => {
    render(
      <NodeConfigurationPanel
        isOpen={true}
        node={mockNode}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      // Select a data source
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'ds1' } });
    });

    await waitFor(() => {
      const saveButton = screen.getByText('Save Configuration');
      expect(saveButton).not.toBeDisabled();
      fireEvent.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalledWith({
        dataSourceId: 'ds1'
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});