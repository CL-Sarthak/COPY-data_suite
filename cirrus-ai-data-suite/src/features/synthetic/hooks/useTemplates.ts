import { useState, useEffect, useCallback } from 'react';
import { syntheticAPI } from '@/core/api';
import { TemplateOption } from '../types';

export function useTemplates() {
  const [templates, setTemplates] = useState<Record<string, Record<string, unknown>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const templateData = await syntheticAPI.getTemplates();
      
      // Validate template data
      if (templateData && typeof templateData === 'object') {
        setTemplates(templateData);
        
        // Set default template if none selected
        const templateKeys = Object.keys(templateData);
        if (templateKeys.length > 0 && !selectedTemplate) {
          setSelectedTemplate(templateKeys[0]);
        }
      } else {
        console.error('Invalid template data received:', templateData);
        setTemplates({});
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Failed to fetch templates:', error);
      setTemplates({});
    } finally {
      setLoading(false);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const getTemplateOptions = useCallback((): TemplateOption[] => {
    return Object.entries(templates).map(([id, schema]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '),
      schema,
      description: getTemplateDescription(id)
    }));
  }, [templates]);

  const getTemplateSchema = useCallback((templateId: string) => {
    return templates[templateId] || null;
  }, [templates]);

  return {
    templates,
    templateOptions: getTemplateOptions(),
    selectedTemplate,
    setSelectedTemplate,
    loading,
    error,
    refetch: loadTemplates,
    getTemplateSchema
  };
}

// Helper function to provide template descriptions
function getTemplateDescription(templateId: string): string {
  const descriptions: Record<string, string> = {
    'customer': 'Customer data with personal information fields',
    'product': 'Product catalog with inventory details',
    'employee': 'Employee records with HR information',
    'transaction': 'Financial transaction records',
    'medical': 'Medical records with patient information',
    'education': 'Educational records with student data'
  };
  
  return descriptions[templateId] || `${templateId} data template`;
}