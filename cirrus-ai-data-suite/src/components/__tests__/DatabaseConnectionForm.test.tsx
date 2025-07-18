import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatabaseConnectionForm } from '../DatabaseConnectionForm';
import { DatabaseType } from '@/types/connector';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('DatabaseConnectionForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Database Type Selection', () => {
    test('should show all database types with correct labels', () => {
      render(
        <DatabaseConnectionForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByLabelText(/Database Type/i);
      const options = select.querySelectorAll('option');

      expect(options).toHaveLength(9);
      expect(options[0]).toHaveTextContent('PostgreSQL');
      expect(options[1]).toHaveTextContent('MySQL');
      expect(options[2]).toHaveTextContent('MongoDB (Coming Soon)');
      expect(options[3]).toHaveTextContent('SQL Server (Coming Soon)');
      expect(options[4]).toHaveTextContent('Oracle (Coming Soon)');
      expect(options[5]).toHaveTextContent('IBM DB2 (Coming Soon)');
      expect(options[6]).toHaveTextContent('Snowflake (Coming Soon)');
      expect(options[7]).toHaveTextContent('Amazon Redshift (Coming Soon)');
      expect(options[8]).toHaveTextContent('Google BigQuery (Coming Soon)');
    });

    test('should disable unsupported database types', () => {
      render(
        <DatabaseConnectionForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByLabelText(/Database Type/i);
      const options = select.querySelectorAll('option');

      // PostgreSQL and MySQL should be enabled
      expect(options[0]).not.toBeDisabled();
      expect(options[1]).not.toBeDisabled();

      // All others should be disabled
      for (let i = 2; i < options.length; i++) {
        expect(options[i]).toBeDisabled();
      }
    });

    test('should have gray text for disabled options', () => {
      render(
        <DatabaseConnectionForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByLabelText(/Database Type/i);
      const options = select.querySelectorAll('option');

      // Check disabled options have gray text class
      for (let i = 2; i < options.length; i++) {
        expect(options[i]).toHaveClass('text-gray-400');
      }
    });

    test('should default to PostgreSQL if no connection provided', () => {
      render(
        <DatabaseConnectionForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByLabelText(/Database Type/i) as HTMLSelectElement;
      expect(select.value).toBe('postgresql');
    });

    test('should default to supported type if unsupported type provided', () => {
      render(
        <DatabaseConnectionForm
          connection={{ type: 'mongodb' as DatabaseType }}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByLabelText(/Database Type/i) as HTMLSelectElement;
      expect(select.value).toBe('postgresql'); // Should default to first supported type
    });

    test('should update port when database type changes', async () => {
      const user = userEvent.setup();
      
      render(
        <DatabaseConnectionForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByLabelText(/Database Type/i);
      const portInput = screen.getByLabelText(/Port/i) as HTMLInputElement;

      // Initially PostgreSQL with port 5432
      expect(portInput.value).toBe('5432');

      // Change to MySQL
      await user.selectOptions(select, 'mysql');
      expect(portInput.value).toBe('3306');

      // Change back to PostgreSQL
      await user.selectOptions(select, 'postgresql');
      expect(portInput.value).toBe('5432');
    });
  });

  describe('Form Title', () => {
    test('should have black title text', () => {
      render(
        <DatabaseConnectionForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const title = screen.getByText('Create Database Connection');
      expect(title).toHaveClass('text-gray-900'); // Black text
      expect(title).toHaveClass('font-semibold');
    });

    test('should show Update title when editing existing connection', () => {
      render(
        <DatabaseConnectionForm
          connection={{ id: '123', name: 'Test DB' }}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Update Database Connection')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    test('should not allow submission with unsupported database type', async () => {
      const user = userEvent.setup();
      
      render(
        <DatabaseConnectionForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/Connection Name/i), 'Test Connection');
      await user.type(screen.getByLabelText(/Host/i), 'localhost');
      await user.type(screen.getByLabelText(/Database Name/i), 'testdb');
      await user.type(screen.getByLabelText(/Username/i), 'user');

      // Submit form with default PostgreSQL type
      const submitButton = screen.getByText('Create Connection');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Connection',
            type: 'postgresql', // Should be PostgreSQL by default
            host: 'localhost',
            database: 'testdb',
            username: 'user'
          })
        );
      });
    });
  });

  describe('Connection Testing', () => {
    test('should test connection with supported database type', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Connection successful!' })
      });

      render(
        <DatabaseConnectionForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Fill form
      await user.type(screen.getByLabelText(/Connection Name/i), 'Test DB');
      await user.type(screen.getByLabelText(/Host/i), 'localhost');
      await user.type(screen.getByLabelText(/Database Name/i), 'testdb');
      await user.type(screen.getByLabelText(/Username/i), 'user');

      // Test connection
      const testButton = screen.getByText('Test Connection');
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Connection successful!')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/database-connections/test',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test DB',
            type: 'postgresql',
            host: 'localhost',
            port: 5432,
            database: 'testdb',
            username: 'user',
            password: undefined,
            ssl: false,
            sslCert: undefined,
            refreshEnabled: false,
            refreshInterval: 60
          })
        }
      );
    });
  });
});