import { CatalogField, Category, ImportResult } from '@/types/catalog';

export class CatalogImportExportService {
  /**
   * Export catalog to JSON
   */
  static exportCatalog(fields: CatalogField[], categories: Category[]): void {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      categories: categories.map(cat => ({
        name: cat.name,
        displayName: cat.displayName,
        description: cat.description,
        color: cat.color,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
        isStandard: cat.isStandard
      })),
      fields: fields.map(field => ({
        name: field.name,
        displayName: field.displayName,
        description: field.description,
        dataType: field.dataType,
        category: field.category,
        isRequired: field.isRequired,
        isStandard: field.isStandard,
        tags: field.tags,
        validationRules: field.validationRules
      }))
    };

    this.downloadJSON(exportData, 'catalog-export.json');
  }

  /**
   * Generate import template
   */
  static generateImportTemplate(): void {
    const template = {
      version: '1.0',
      categories: [
        {
          name: 'custom_category',
          displayName: 'Custom Category',
          description: 'Description of the category',
          color: '#6b7280',
          icon: 'folder',
          sortOrder: 100,
          isStandard: false
        }
      ],
      fields: [
        {
          name: 'example_field',
          displayName: 'Example Field',
          description: 'This is an example field',
          dataType: 'string',
          category: 'custom_category',
          isRequired: false,
          isStandard: false,
          tags: ['example', 'template'],
          validationRules: {
            minLength: 1,
            maxLength: 100
          }
        }
      ]
    };

    this.downloadJSON(template, 'catalog-import-template.json');
  }

  /**
   * Parse and validate import file
   */
  static async parseImportFile(file: File): Promise<{ categories: Array<{ name: string; description?: string; fields: Array<{ name: string; dataType: string; isRequired?: boolean; displayOrder?: number }> }> }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          // Basic validation
          if (!data.fields || !Array.isArray(data.fields)) {
            reject(new Error('Invalid import file: missing fields array'));
            return;
          }
          
          if (data.categories && !Array.isArray(data.categories)) {
            reject(new Error('Invalid import file: categories must be an array'));
            return;
          }
          
          resolve(data);
        } catch {
          reject(new Error('Invalid JSON file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Import catalog data
   */
  static async importCatalog(data: { categories: Array<{ name: string; description?: string; fields: Array<{ name: string; dataType: string; isRequired?: boolean; displayOrder?: number }> }> }): Promise<ImportResult> {
    const errors: string[] = [];
    let importedCount = 0;

    try {
      // Import categories first if present
      if (data.categories && data.categories.length > 0) {
        for (const category of data.categories) {
          // Only import custom categories (all imported categories are custom)
            try {
              await fetch('/api/catalog/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(category)
              });
            } catch (error) {
              errors.push(`Failed to import category ${category.name}: ${error}`);
            }
        }
      }

      // Import fields from categories
      // The new format has fields nested within categories
      if (data.categories && data.categories.length > 0) {
        for (const category of data.categories) {
          if (category.fields && Array.isArray(category.fields)) {
            for (const field of category.fields) {
              // All imported fields are considered custom
              try {
                const response = await fetch('/api/catalog/fields', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...field,
                    category: category.name
                  })
                });
                
                if (response.ok) {
                  importedCount++;
                } else {
                  const error = await response.json();
                  errors.push(`Failed to import field ${field.name}: ${error.error}`);
                }
              } catch (error) {
                errors.push(`Failed to import field ${field.name}: ${error}`);
              }
            }
          }
        }
      }

      return {
        success: errors.length === 0,
        message: errors.length === 0 
          ? `Successfully imported ${importedCount} fields` 
          : `Imported ${importedCount} fields with ${errors.length} errors`,
        importedCount,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return {
        success: false,
        message: 'Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Download JSON file
   */
  private static downloadJSON(data: Record<string, unknown>, filename: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}