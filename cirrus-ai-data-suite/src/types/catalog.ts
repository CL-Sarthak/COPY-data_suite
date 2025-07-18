export interface CatalogField {
  id: string;
  name: string;
  displayName: string;
  description: string;
  dataType: string;
  category: string;
  isRequired: boolean;
  isStandard: boolean;
  tags: string[];
  validationRules?: ValidationRules;
  createdAt?: string;
  updatedAt?: string;
}

export interface ValidationRules {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  enumValues?: string[];
  decimalPlaces?: number;
}

export interface Category {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  color: string;
  icon?: string;
  sortOrder: number;
  isStandard: boolean;
  isActive: boolean;
  count: number;
}

export interface FieldFormData {
  name: string;
  displayName: string;
  description: string;
  dataType: string;
  category: string;
  isRequired: boolean;
  tags: string;
  validationRules: ValidationRules;
}

export interface CategoryFormData {
  name: string;
  displayName: string;
  description: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export interface ImportResult {
  success: boolean;
  message: string;
  importedCount?: number;
  errors?: string[];
}

export interface DataTypeOption {
  value: string;
  label: string;
}

export const DATA_TYPES: DataTypeOption[] = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'DateTime' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'enum', label: 'Enum (List)' },
  { value: 'array', label: 'Array' },
  { value: 'object', label: 'Object' }
];

export const DEFAULT_FIELD_FORM_DATA: FieldFormData = {
  name: '',
  displayName: '',
  description: '',
  dataType: 'string',
  category: 'uncategorized',
  isRequired: false,
  tags: '',
  validationRules: {}
};

export const DEFAULT_CATEGORY_FORM_DATA: CategoryFormData = {
  name: '',
  displayName: '',
  description: '',
  color: '#6b7280',
  icon: '',
  sortOrder: 999
};