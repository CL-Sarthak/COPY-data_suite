import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RelationalImportDialog from '@/components/RelationalImportDialog';

// Mock fetch
global.fetch = jest.fn();

describe('RelationalImportDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnImport = jest.fn();
  const connectionId = 'test-connection-id';

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should render the dialog with basic elements', async () => {
    // Mock initial table load
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tables: [
          { name: 'customers' },
          { name: 'orders' },
          { name: 'products' }
        ]
      })
    });

    render(
      <RelationalImportDialog
        connectionId={connectionId}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
    );

    // Check title
    expect(screen.getByText('Relational Import')).toBeInTheDocument();
    expect(screen.getByText('Import data with foreign key relationships as nested JSON')).toBeInTheDocument();

    // Wait for tables to load
    await waitFor(() => {
      expect(screen.getByText('Select a table...')).toBeInTheDocument();
    });

    // Check primary table dropdown
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    
    // Verify tables are loaded
    fireEvent.change(select, { target: { value: 'customers' } });
    expect(select).toHaveValue('customers');
  });

  it('should show cluster detection option in advanced settings', async () => {
    // Mock initial table load
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tables: [{ name: 'customers' }]
      })
    });

    // Mock relationship analysis
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        relationships: [
          {
            fromTable: 'customers',
            fromColumn: 'id',
            toTable: 'orders',
            toColumn: 'customer_id',
            relationshipType: 'one-to-many'
          }
        ],
        tables: [{ name: 'customers' }, { name: 'orders' }],
        relationshipDiagram: 'customers (id) -> orders (customer_id)'
      })
    });

    render(
      <RelationalImportDialog
        connectionId={connectionId}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
    );

    // Wait for tables to load
    await waitFor(() => {
      expect(screen.getByText('Select a table...')).toBeInTheDocument();
    });

    // Select a table
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'customers' } });

    // Wait for relationship analysis
    await waitFor(() => {
      expect(screen.getByText('Discovered Relationships')).toBeInTheDocument();
    });

    // Click advanced settings
    const advancedButton = screen.getByText('Advanced Settings');
    fireEvent.click(advancedButton);

    // Check for cluster detection option
    const clusterCheckbox = screen.getByLabelText('Enable cluster pattern detection');
    expect(clusterCheckbox).toBeInTheDocument();
    expect(clusterCheckbox).not.toBeChecked();

    // Enable cluster detection
    fireEvent.click(clusterCheckbox);
    expect(clusterCheckbox).toBeChecked();

    // Check for description text
    expect(screen.getByText('Automatically detect patterns of related sensitive data fields across imported tables')).toBeInTheDocument();
  });

  it('should include enableClusterDetection in import settings', async () => {
    // Mock initial table load
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tables: [{ name: 'customers' }]
        })
      })
      // Mock relationship analysis that happens when table is selected
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          relationships: [
            {
              fromTable: 'customers',
              fromColumn: 'id',
              toTable: 'orders',
              toColumn: 'customer_id',
              relationshipType: 'one-to-many'
            }
          ],
          tables: [{ name: 'customers' }, { name: 'orders' }],
          relationshipDiagram: 'customers (id) -> orders (customer_id)'
        })
      });

    render(
      <RelationalImportDialog
        connectionId={connectionId}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
    );

    // Wait and select table
    await waitFor(() => {
      expect(screen.getByText('Select a table...')).toBeInTheDocument();
    });
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'customers' } });

    // Wait for analysis
    await waitFor(() => {
      expect(screen.getByText('Discovered Relationships')).toBeInTheDocument();
    });

    // Set name
    const nameInput = screen.getByPlaceholderText('Enter a name for this data source');
    fireEvent.change(nameInput, { target: { value: 'Test Import' } });

    // Enable cluster detection
    fireEvent.click(screen.getByText('Advanced Settings'));
    const clusterCheckbox = screen.getByLabelText('Enable cluster pattern detection');
    fireEvent.click(clusterCheckbox);

    // Click import
    const importButton = screen.getByText('Import with Relationships');
    fireEvent.click(importButton);

    // Verify onImport was called with correct settings
    expect(mockOnImport).toHaveBeenCalledWith({
      relationalImport: true,
      primaryTable: 'customers',
      name: 'Test Import',
      description: 'Relational import from customers including 2 related tables',
      includedTables: undefined,
      excludedTables: undefined,
      maxDepth: 2,
      followReverse: true,
      sampleSize: 100,
      enableClusterDetection: true
    });
  });

  it('should handle table loading errors', async () => {
    // Mock failed table load
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to load schema' })
    });

    render(
      <RelationalImportDialog
        connectionId={connectionId}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
    );

    // Wait for error
    await waitFor(() => {
      expect(screen.getByText('Failed to load available tables')).toBeInTheDocument();
    });
  });

  it('should close dialog when cancel is clicked', () => {
    render(
      <RelationalImportDialog
        connectionId={connectionId}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should disable import button when no table selected', async () => {
    // Mock initial table load
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tables: [{ name: 'customers' }]
      })
    });

    render(
      <RelationalImportDialog
        connectionId={connectionId}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Select a table...')).toBeInTheDocument();
    });

    const importButton = screen.getByText('Import with Relationships');
    expect(importButton).toBeDisabled();
  });
});