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
}

export interface CatalogCategory {
  id: string;
  name: string;
  displayName: string;
  description: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export interface FieldMapping {
  id: string;
  sourceId: string;
  sourceFieldName: string;
  catalogFieldId: string;
  confidence: number;
  isManual: boolean;
}

export interface TransformationResult {
  success: boolean;
  message?: string;
  transformedRecords: number;
  fieldsMapped?: number;
  errors?: string[];
  warnings?: string[];
  statistics?: {
    totalRecords: number;
    successfulRecords: number;
    failedRecords: number;
    mappedFields: number;
    unmappedFields: string[];
  };
  validationErrors?: Array<{
    recordIndex: number;
    field: string;
    value: unknown;
    errors: string[];
  }>;
  transformedData?: unknown[];
}

export interface ConfirmationData {
  lastTransformationDate: string;
  recordCount: number;
  estimatedDuration: string;
}

export interface MappingSuggestion {
  sourceFieldName: string;
  suggestedMappings: Array<{
    field: CatalogField;
    confidence: number;
    reason: string;
  }>;
}


export interface FieldMappingInterfaceProps {
  sourceId: string;
  sourceName: string;
  sourceFields?: string[];
  onMappingsChanged?: () => void;
  onClose: () => void;
}

export interface NewFieldFormData {
  name: string;
  displayName: string;
  description: string;
  dataType: string;
  category: string;
  isRequired: boolean;
  tags: string;
}

export const DEFAULT_NEW_FIELD_DATA: NewFieldFormData = {
  name: '',
  displayName: '',
  description: '',
  dataType: 'string',
  category: 'custom',
  isRequired: false,
  tags: ''
};

export const DATA_TYPE_OPTIONS = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'enum', label: 'Choice List' }
];