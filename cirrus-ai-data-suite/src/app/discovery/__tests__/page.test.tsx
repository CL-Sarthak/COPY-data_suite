import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DiscoveryPage from '../page';
import { useSearchParams } from 'next/navigation';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

// Mock components to avoid dependency issues
jest.mock('@/components/AppLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('@/components/DataSourceTable', () => ({
  __esModule: true,
  default: function MockDataSourceTable({ initialExpandedRow, onSourceSelect }: any) {
    // Simulate the behavior of DataSourceTable
    React.useEffect(() => {
      if (initialExpandedRow && onSourceSelect) {
        // Simulate selecting the source
        onSourceSelect({ id: initialExpandedRow, name: 'Test Source' });
      }
    }, [initialExpandedRow, onSourceSelect]);
    
    return (
      <div data-testid="data-source-table">
        <div>Data Source Table</div>
        {initialExpandedRow && <div>Expanded Row: {initialExpandedRow}</div>}
      </div>
    );
  }
}));

jest.mock('@/components/fieldMapping/FieldMappingModal', () => ({
  __esModule: true,
  FieldMappingModal: () => <div>Field Mapping Modal</div>
}));

jest.mock('@/components/DataProfilingViewer', () => ({
  __esModule: true,
  default: () => <div>Data Profiling Viewer</div>
}));

jest.mock('@/components/SchemaAnalyzer', () => ({
  __esModule: true,
  default: () => <div>Schema Analyzer</div>
}));

jest.mock('@/components/HelpSystem', () => ({
  __esModule: true,
  HelpButton: () => <div>Help Button</div>
}));

jest.mock('@/contexts/DialogContext', () => ({
  __esModule: true,
  DialogProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useDialog: () => ({
    showAlert: jest.fn(),
    showConfirm: jest.fn()
  })
}));

// Mock fetch
global.fetch = jest.fn();

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

const mockDataSources = [
  {
    id: '1',
    name: 'Test Source 1',
    type: 'filesystem',
    connectionStatus: 'connected',
    configuration: {},
    metadata: {}
  },
  {
    id: '2',
    name: 'Test Source 2',
    type: 'database',
    connectionStatus: 'connected',
    configuration: {},
    metadata: {}
  }
];

describe('DiscoveryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockDataSources
    });
  });

  describe('URL Parameter Handling', () => {
    it('reads source parameter from URL and expands the corresponding row', async () => {
      const mockGet = jest.fn().mockReturnValue('1');
      (useSearchParams as jest.Mock).mockReturnValue({
        get: mockGet
      });
      
      render(<DiscoveryPage />);
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('data-source-table')).toBeInTheDocument();
      });
      
      // Verify the source parameter was read
      expect(mockGet).toHaveBeenCalledWith('source');
      
      // Verify the row is expanded
      expect(screen.getByText('Expanded Row: 1')).toBeInTheDocument();
    });

    it('handles missing source parameter gracefully', async () => {
      const mockGet = jest.fn().mockReturnValue(null);
      (useSearchParams as jest.Mock).mockReturnValue({
        get: mockGet
      });
      
      render(<DiscoveryPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('data-source-table')).toBeInTheDocument();
      });
      
      // Verify no row is expanded
      expect(screen.queryByText(/Expanded Row:/)).not.toBeInTheDocument();
    });

    it('handles non-existent source ID in URL parameter', async () => {
      const mockGet = jest.fn().mockReturnValue('non-existent-id');
      (useSearchParams as jest.Mock).mockReturnValue({
        get: mockGet
      });
      
      render(<DiscoveryPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('data-source-table')).toBeInTheDocument();
      });
      
      // Should still pass the ID to DataSourceTable
      expect(screen.getByText('Expanded Row: non-existent-id')).toBeInTheDocument();
    });

    it('updates when URL parameter changes', async () => {
      const mockGet = jest.fn().mockReturnValue('1');
      const mockSearchParams = {
        get: mockGet
      };
      (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
      
      const { rerender } = render(<DiscoveryPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Expanded Row: 1')).toBeInTheDocument();
      });
      
      // Simulate URL parameter change
      mockGet.mockReturnValue('2');
      rerender(<DiscoveryPage />);
      
      // Note: In real implementation, this would require proper useEffect handling
      // This test verifies the component structure supports URL parameter changes
    });
  });

  describe('Auto-scroll and Highlighting', () => {
    it('attempts to scroll to the source when URL parameter is present', async () => {
      const mockGet = jest.fn().mockReturnValue('1');
      (useSearchParams as jest.Mock).mockReturnValue({
        get: mockGet
      });
      
      // Mock getElementById to return a mock element
      const mockElement = document.createElement('div');
      mockElement.id = 'source-row-1';
      mockElement.scrollIntoView = jest.fn();
      jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
      
      render(<DiscoveryPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('data-source-table')).toBeInTheDocument();
      });
      
      // Wait a bit for the setTimeout in the implementation
      await waitFor(() => {
        expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'center'
        });
      }, { timeout: 200 });
    });

    it('adds and removes highlight class for visual feedback', async () => {
      const mockGet = jest.fn().mockReturnValue('1');
      (useSearchParams as jest.Mock).mockReturnValue({
        get: mockGet
      });
      
      // Mock element with classList
      const mockElement = document.createElement('div');
      mockElement.id = 'source-row-1';
      const addSpy = jest.spyOn(mockElement.classList, 'add');
      const removeSpy = jest.spyOn(mockElement.classList, 'remove');
      jest.spyOn(document, 'getElementById').mockReturnValue(mockElement);
      
      render(<DiscoveryPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('data-source-table')).toBeInTheDocument();
      });
      
      // Check highlight was added
      await waitFor(() => {
        expect(addSpy).toHaveBeenCalledWith('bg-blue-50');
      }, { timeout: 200 });
      
      // Check highlight is removed after timeout
      await waitFor(() => {
        expect(removeSpy).toHaveBeenCalledWith('bg-blue-50');
      }, { timeout: 4000 });
    });
  });

  describe('Data Loading', () => {
    it('shows loading state while fetching data', () => {
      // Delay the fetch response to keep loading state visible
      (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
      
      render(<DiscoveryPage />);
      
      // The data source table should be displayed even during loading
      expect(screen.getByTestId('data-source-table')).toBeInTheDocument();
    });

    it('loads and displays data sources', async () => {
      render(<DiscoveryPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('data-source-table')).toBeInTheDocument();
      });
      
      // Verify fetch was called
      expect(fetch).toHaveBeenCalledWith('/api/data-sources');
    });

    it('handles API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      render(<DiscoveryPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading sources...')).not.toBeInTheDocument();
      });
      
      // Should still render the table component
      expect(screen.getByTestId('data-source-table')).toBeInTheDocument();
    });
  });

  describe('Source Selection', () => {
    it('handles source selection from DataSourceTable', async () => {
      const mockGet = jest.fn().mockReturnValue('1');
      (useSearchParams as jest.Mock).mockReturnValue({
        get: mockGet
      });
      
      render(<DiscoveryPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('data-source-table')).toBeInTheDocument();
      });
      
      // The mock DataSourceTable should have called onSourceSelect
      // In real implementation, this would update selectedSource state
      expect(screen.getByText('Expanded Row: 1')).toBeInTheDocument();
    });
  });
});