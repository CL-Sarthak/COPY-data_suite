import { renderHook, act, waitFor } from '@testing-library/react';
import { useCatalogFields } from '../useCatalogFields';
import { CatalogFieldService } from '@/services/catalogFieldService';

// Mock the service
jest.mock('@/services/catalogFieldService');

// Mock toast
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
};

jest.mock('@/contexts/ToastContext', () => ({
  useToastActions: () => mockToast,
}));

// Mock window.confirm
global.confirm = jest.fn();

describe('useCatalogFields Hook', () => {
  const mockFields = [
    {
      id: '1',
      name: 'test_field',
      displayName: 'Test Field',
      description: 'A test field',
      dataType: 'string',
      category: 'custom',
      isRequired: true,
      isStandard: false,
      tags: ['test'],
      sortOrder: 1,
      validationRules: {},
    },
    {
      id: '2',
      name: 'standard_field',
      displayName: 'Standard Field',
      description: 'A standard field',
      dataType: 'number',
      category: 'standard',
      isRequired: false,
      isStandard: true,
      tags: ['standard'],
      sortOrder: 2,
      validationRules: {},
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (CatalogFieldService.fetchFields as jest.Mock).mockResolvedValue(mockFields);
    (global.confirm as jest.Mock).mockReturnValue(true);
  });

  describe('Initial State', () => {
    it('should start with loading state and empty fields', () => {
      const { result } = renderHook(() => useCatalogFields());
      
      expect(result.current.loading).toBe(true);
      expect(result.current.fields).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.showCreateModal).toBe(false);
      expect(result.current.showEditModal).toBe(false);
      expect(result.current.editingField).toBeNull();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch fields on mount', async () => {
      const { result } = renderHook(() => useCatalogFields());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(CatalogFieldService.fetchFields).toHaveBeenCalled();
      expect(result.current.fields).toEqual(mockFields);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch');
      (CatalogFieldService.fetchFields as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useCatalogFields());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockToast.error).toHaveBeenCalledWith('Failed to load catalog fields', 'Failed to fetch');
      expect(result.current.error).toBe('Failed to fetch');
      expect(result.current.fields).toEqual([]);
    });
  });

  describe('Field Creation', () => {
    it('should create a new field successfully', async () => {
      const newField = { ...mockFields[0], id: '3', name: 'new_field' };
      const formData = {
        name: 'new_field',
        displayName: 'New Field',
        description: 'A new field',
        dataType: 'string',
        category: 'custom',
        isRequired: false,
        tags: 'tag1, tag2',
        validationRules: {},
      };

      (CatalogFieldService.validateFieldData as jest.Mock).mockReturnValue([]);
      (CatalogFieldService.createField as jest.Mock).mockResolvedValue(newField);

      const { result } = renderHook(() => useCatalogFields());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.createField(formData);
      });

      expect(CatalogFieldService.validateFieldData).toHaveBeenCalledWith(formData);
      expect(CatalogFieldService.createField).toHaveBeenCalledWith(formData);
      expect(mockToast.success).toHaveBeenCalledWith('Field created successfully');
      expect(result.current.fields).toContain(newField);
      expect(result.current.showCreateModal).toBe(false);
    });

    it('should handle validation errors', async () => {
      const formData = {
        name: '',
        displayName: '',
        description: '',
        dataType: 'string',
        category: 'custom',
        isRequired: false,
        tags: '',
        validationRules: {},
      };

      (CatalogFieldService.validateFieldData as jest.Mock).mockReturnValue(['Name is required', 'Display name is required']);

      const { result } = renderHook(() => useCatalogFields());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.createField(formData)).rejects.toThrow('Name is required, Display name is required');
      expect(mockToast.error).toHaveBeenCalledWith('Failed to create field', 'Name is required, Display name is required');
    });
  });

  describe('Field Update', () => {
    it('should update a field successfully', async () => {
      const updatedField = { ...mockFields[0], displayName: 'Updated Field' };
      const formData = {
        name: 'test_field',
        displayName: 'Updated Field',
        description: 'Updated description',
        dataType: 'string',
        category: 'custom',
        isRequired: true,
        tags: 'updated',
        validationRules: {},
      };

      (CatalogFieldService.validateFieldData as jest.Mock).mockReturnValue([]);
      (CatalogFieldService.updateField as jest.Mock).mockResolvedValue(updatedField);

      const { result } = renderHook(() => useCatalogFields());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateField('1', formData);
      });

      expect(CatalogFieldService.updateField).toHaveBeenCalledWith('1', formData);
      expect(mockToast.success).toHaveBeenCalledWith('Field updated successfully');
      expect(result.current.fields[0]).toEqual(updatedField);
    });
  });

  describe('Field Deletion', () => {
    it('should delete a field when confirmed', async () => {
      (CatalogFieldService.deleteField as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCatalogFields());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteField(mockFields[0]);
      });

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete the field "Test Field"? This action cannot be undone.'
      );
      expect(CatalogFieldService.deleteField).toHaveBeenCalledWith('1');
      expect(mockToast.success).toHaveBeenCalledWith('Field deleted successfully');
      expect(result.current.fields).not.toContain(mockFields[0]);
    });

    it('should not delete when cancelled', async () => {
      (global.confirm as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useCatalogFields());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteField(mockFields[0]);
      });

      expect(CatalogFieldService.deleteField).not.toHaveBeenCalled();
      expect(result.current.fields).toContain(mockFields[0]);
    });
  });

  describe('Modal Management', () => {
    it('should manage create modal state', () => {
      const { result } = renderHook(() => useCatalogFields());

      expect(result.current.showCreateModal).toBe(false);

      act(() => {
        result.current.setShowCreateModal(true);
      });

      expect(result.current.showCreateModal).toBe(true);
    });

    it('should manage edit modal state and editing field', () => {
      const { result } = renderHook(() => useCatalogFields());

      expect(result.current.showEditModal).toBe(false);
      expect(result.current.editingField).toBeNull();

      act(() => {
        result.current.setEditingField(mockFields[0]);
        result.current.setShowEditModal(true);
      });

      expect(result.current.showEditModal).toBe(true);
      expect(result.current.editingField).toEqual(mockFields[0]);
    });
  });
});