import { useState, useCallback, useEffect } from 'react';
import { patternAPI } from '@/core/api';
import { Pattern } from '@/services/patternService';
import { SensitivePattern } from '@/types';
import { useToastActions } from '@/contexts/ToastContext';
import { useDialog } from '@/contexts/DialogContext';

export function usePatterns() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const toast = useToastActions();
  const dialog = useDialog();

  const loadPatterns = useCallback(async () => {
    try {
      setLoading(true);
      const data = await patternAPI.getPatterns();
      setPatterns(data);
    } catch (error) {
      console.error('Error loading patterns:', error);
      toast.error('Failed to load patterns');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadPatterns();
  }, [loadPatterns]);

  const createPattern = useCallback(async (patternData: Omit<Pattern, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Transform pattern data to match API request structure
      const createRequest = {
        ...patternData,
        regex: patternData.regex ? [patternData.regex] : undefined // Convert string to array
      };
      const newPattern = await patternAPI.createPattern(createRequest);
      setPatterns(prev => [...prev, newPattern]);
      toast.success(`Pattern "${patternData.name}" created successfully`);
      return newPattern;
    } catch (error) {
      console.error('Error creating pattern:', error);
      toast.error('Failed to create pattern');
      throw error;
    }
  }, [toast]);

  const updatePattern = useCallback(async (id: string, updates: Partial<Pattern>) => {
    try {
      // Transform pattern updates to match API request structure
      const updateRequest = {
        ...updates,
        regex: updates.regex ? [updates.regex] : undefined // Convert string to array
      };
      const updatedPattern = await patternAPI.updatePattern(id, updateRequest);
      setPatterns(prev => prev.map(p => p.id === id ? updatedPattern : p));
      
      if (selectedPattern?.id === id) {
        setSelectedPattern(updatedPattern);
      }
      
      toast.success('Pattern updated successfully');
      return updatedPattern;
    } catch (error) {
      console.error('Error updating pattern:', error);
      toast.error('Failed to update pattern');
      throw error;
    }
  }, [selectedPattern, toast]);

  const togglePattern = useCallback(async (pattern: Pattern) => {
    try {
      const updatedPattern = await patternAPI.togglePattern(pattern.id, !pattern.isActive);
      setPatterns(prev => prev.map(p => p.id === pattern.id ? updatedPattern : p));
      
      if (selectedPattern?.id === pattern.id) {
        setSelectedPattern(updatedPattern);
      }
      
      toast.success(`Pattern ${updatedPattern.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling pattern:', error);
      toast.error('Failed to toggle pattern');
    }
  }, [selectedPattern, toast]);

  const deletePattern = useCallback(async (pattern: Pattern) => {
    const confirmed = await dialog.showConfirm({
      title: 'Delete Pattern',
      message: `Are you sure you want to delete "${pattern.name}"? This action cannot be undone.`,
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      await patternAPI.deletePattern(pattern.id);
      setPatterns(prev => prev.filter(p => p.id !== pattern.id));
      
      if (selectedPattern?.id === pattern.id) {
        setSelectedPattern(null);
      }
      
      toast.success(`Pattern "${pattern.name}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting pattern:', error);
      toast.error('Failed to delete pattern');
    }
  }, [selectedPattern, dialog, toast]);

  const addExample = useCallback(async (patternId: string, example: string) => {
    const pattern = patterns.find(p => p.id === patternId);
    if (!pattern) return;

    const updatedExamples = [...(pattern.examples || []), example];
    await updatePattern(patternId, { examples: updatedExamples });
  }, [patterns, updatePattern]);

  const removeExample = useCallback(async (patternId: string, index: number) => {
    const pattern = patterns.find(p => p.id === patternId);
    if (!pattern || !pattern.examples) return;

    const updatedExamples = pattern.examples.filter((_, i) => i !== index);
    await updatePattern(patternId, { examples: updatedExamples });
  }, [patterns, updatePattern]);

  const updateExample = useCallback(async (patternId: string, index: number, newValue: string) => {
    const pattern = patterns.find(p => p.id === patternId);
    if (!pattern || !pattern.examples) return;

    const updatedExamples = [...pattern.examples];
    updatedExamples[index] = newValue;
    await updatePattern(patternId, { examples: updatedExamples });
  }, [patterns, updatePattern]);

  const createPatternsFromAnnotation = useCallback(async (annotationPatterns: SensitivePattern[]) => {
    try {
      await patternAPI.createPatternsFromAnnotation(annotationPatterns);
      await loadPatterns(); // Reload to get the new patterns
      toast.success(`Created ${annotationPatterns.length} new patterns from annotation`);
    } catch (error) {
      console.error('Error creating patterns from annotation:', error);
      toast.error('Failed to create patterns from annotation');
      throw error;
    }
  }, [loadPatterns, toast]);

  const filteredPatterns = selectedCategory === 'all' 
    ? patterns 
    : patterns.filter(p => p.category === selectedCategory);

  return {
    patterns,
    filteredPatterns,
    selectedPattern,
    selectedCategory,
    loading,
    actions: {
      reload: loadPatterns,
      create: createPattern,
      update: updatePattern,
      toggle: togglePattern,
      delete: deletePattern,
      select: setSelectedPattern,
      setCategory: setSelectedCategory,
      addExample,
      removeExample,
      updateExample,
      createFromAnnotation: createPatternsFromAnnotation
    }
  };
}