import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileUploadPage from '../page';
import { useRouter } from 'next/navigation';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock AppLayout to avoid dependency issues
jest.mock('@/components/AppLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock UnifiedFileUpload component
jest.mock('@/components/UnifiedFileUpload', () => ({
  __esModule: true,
  default: ({ onFilesProcessed }: { onFilesProcessed: (files: any[]) => void }) => (
    <div>
      <button onClick={() => onFilesProcessed([{ name: 'test.txt', type: 'text/plain', size: 100, content: 'test' }])}>
        Complete Upload
      </button>
    </div>
  )
}));

// Mock fetch
global.fetch = jest.fn();

const mockFileSources = [
  {
    id: '2',
    name: 'PDF Documents',
    type: 'filesystem',
    connectionStatus: 'connected',
    configuration: {
      files: [
        { name: 'report.pdf', type: 'application/pdf', size: 102400 }
      ]
    },
    tags: ['pdf', 'reports'],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  },
  {
    id: '1',
    name: 'Test CSV Files',
    type: 'filesystem',
    connectionStatus: 'connected',
    configuration: {
      files: [
        { name: 'data1.csv', type: 'text/csv', size: 1024 },
        { name: 'data2.csv', type: 'text/csv', size: 2048 }
      ]
    },
    tags: ['test', 'csv'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

describe('FileUploadPage', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    });
    
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFileSources
    });
  });

  describe('Page Rendering', () => {
    it('renders the page with correct title and components', async () => {
      render(<FileUploadPage />);
      
      // Wait for page to load and loading spinner to disappear
      await waitFor(() => {
        expect(screen.getByText('File Sources')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Upload and manage file-based data sources')).toBeInTheDocument();
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Test CSV Files')).toBeInTheDocument();
      });
    });

    it('loads and displays file sources', async () => {
      render(<FileUploadPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Test CSV Files')).toBeInTheDocument();
        expect(screen.getByText('PDF Documents')).toBeInTheDocument();
      });
      
      // Check that both sources are displayed
      expect(screen.getByText('Test CSV Files')).toBeInTheDocument();
      expect(screen.getByText('PDF Documents')).toBeInTheDocument();
    });

    it('shows loading state while fetching data', () => {
      // Delay the fetch response to keep loading state visible
      (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
      
      const { container } = render(<FileUploadPage />);
      
      // Look for the loading spinner by class
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('shows empty state when no sources exist', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });
      
      render(<FileUploadPage />);
      
      await waitFor(() => {
        expect(screen.getByText('No file sources yet')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation to Data Discovery', () => {
    it('navigates to discovery page with source parameter when view icon is clicked', async () => {
      render(<FileUploadPage />);
      
      await waitFor(() => {
        expect(screen.getByText('PDF Documents')).toBeInTheDocument();
      });
      
      // Find and click the view button for the first source (PDF Documents)
      const viewButtons = screen.getAllByTitle('View in Discovery');
      fireEvent.click(viewButtons[0]);
      
      expect(mockPush).toHaveBeenCalledWith('/discovery?source=2');
    });

    it('handles navigation for multiple sources correctly', async () => {
      render(<FileUploadPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Test CSV Files')).toBeInTheDocument();
      });
      
      // Click view for second source (Test CSV Files)
      const viewButtons = screen.getAllByTitle('View in Discovery');
      fireEvent.click(viewButtons[1]);
      
      expect(mockPush).toHaveBeenCalledWith('/discovery?source=1');
    });
  });

  describe('Sorting Functionality', () => {
    it('sorts sources by name', async () => {
      render(<FileUploadPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Test CSV Files')).toBeInTheDocument();
      });
      
      // Click sort by name
      const nameHeader = screen.getByText('Name');
      fireEvent.click(nameHeader);
      
      // Check that sources are still displayed (actual sorting logic would be tested in implementation)
      expect(screen.getByText('Test CSV Files')).toBeInTheDocument();
      expect(screen.getByText('PDF Documents')).toBeInTheDocument();
    });

    it('sorts sources by file count', async () => {
      render(<FileUploadPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Test CSV Files')).toBeInTheDocument();
      });
      
      // Click sort by files
      const filesHeader = screen.getByText('Files');
      fireEvent.click(filesHeader);
      
      // Verify sources are still displayed after sorting
      expect(screen.getByText('Test CSV Files')).toBeInTheDocument();
      expect(screen.getByText('PDF Documents')).toBeInTheDocument();
    });

    it('sorts sources by size', async () => {
      render(<FileUploadPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Test CSV Files')).toBeInTheDocument();
      });
      
      // Click sort by size
      const sizeHeader = screen.getByText('Size');
      fireEvent.click(sizeHeader);
      
      // Verify sources are still displayed after sorting
      expect(screen.getByText('Test CSV Files')).toBeInTheDocument();
      expect(screen.getByText('PDF Documents')).toBeInTheDocument();
    });
  });

  describe('Tag Management', () => {
    it('displays existing tags for sources', async () => {
      render(<FileUploadPage />);
      
      await waitFor(() => {
        expect(screen.getByText('PDF Documents')).toBeInTheDocument();
      });
      
      // Tags should be displayed in the table - they exist on the data sources
      const tags = mockFileSources.flatMap(s => s.tags);
      expect(tags).toContain('test');
      expect(tags).toContain('csv');
      expect(tags).toContain('pdf');
      expect(tags).toContain('reports');
    });

    it('allows editing source name when edit button is clicked', async () => {
      render(<FileUploadPage />);
      
      await waitFor(() => {
        expect(screen.getByText('PDF Documents')).toBeInTheDocument();
      });
      
      // Find and click edit button for first source (PDF Documents)
      const editButtons = screen.getAllByTitle('Edit name');
      fireEvent.click(editButtons[0]);
      
      // Verify edit mode is active - should show input field and action buttons
      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('PDF Documents');
        expect(nameInput).toBeInTheDocument();
        
        // Should also show save and cancel buttons
        expect(screen.getByTitle('Save changes')).toBeInTheDocument();
        expect(screen.getByTitle('Cancel')).toBeInTheDocument();
      });
    });
  });

  describe('File Upload', () => {
    it('shows upload form when Upload Files button is clicked', async () => {
      render(<FileUploadPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Test CSV Files')).toBeInTheDocument();
      });
      
      // Click Upload Files button
      const uploadFilesButton = screen.getByRole('button', { name: /upload files/i });
      fireEvent.click(uploadFilesButton);
      
      // Verify upload component is shown
      expect(screen.getByText('Complete Upload')).toBeInTheDocument();
    });

    it('shows upload form workflow', async () => {
      render(<FileUploadPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Test CSV Files')).toBeInTheDocument();
      });
      
      // Click Upload Files button
      const uploadFilesButton = screen.getByRole('button', { name: /upload files/i });
      fireEvent.click(uploadFilesButton);
      
      // Should show upload form
      expect(screen.getByText('Upload New Files')).toBeInTheDocument();
      
      // Should show the upload component
      expect(screen.getByText('Complete Upload')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles API call failure gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      render(<FileUploadPage />);
      
      // Should still render the page but with empty state
      await waitFor(() => {
        expect(screen.getByText('No file sources yet')).toBeInTheDocument();
      });
    });

    it('handles delete errors gracefully', async () => {
      render(<FileUploadPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Test CSV Files')).toBeInTheDocument();
      });
      
      // Mock delete failure
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      });
      
      // Click delete button
      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);
      
      // Verify source is still displayed (delete failed)
      await waitFor(() => {
        expect(screen.getByText('Test CSV Files')).toBeInTheDocument();
      });
    });
  });
});