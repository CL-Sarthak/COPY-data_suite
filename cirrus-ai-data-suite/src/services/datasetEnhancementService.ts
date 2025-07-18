/**
 * Dataset Enhancement Service
 * Uses LLM analysis to suggest missing fields for existing datasets and generates consistent data
 */

import { llmService } from './llmService';

export interface MissingFieldSuggestion {
  fieldName: string;
  fieldType: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'phone' | 'ssn' | 'address';
  description: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  dependencies?: string[]; // Fields this depends on (e.g., DOB depends on Age)
}

export interface DatasetAnalysis {
  datasetType: string;
  existingFields: string[];
  missingFields: MissingFieldSuggestion[];
  analysisConfidence: number;
}

export interface FieldGenerationOptions {
  fieldName: string;
  fieldType: string;
  dependentFields?: Record<string, unknown>;
  datasetContext?: Record<string, unknown>;
}

export class DatasetEnhancementService {
  
  /**
   * Analyze a sample record and suggest missing fields
   */
  static async analyzeMissingFields(sampleRecord: Record<string, unknown>): Promise<DatasetAnalysis> {
    try {
      console.log('=== Dataset Enhancement: Analyzing missing fields ===', {
        sampleFields: Object.keys(sampleRecord),
        recordSize: JSON.stringify(sampleRecord).length
      });

      // Create a prompt for LLM analysis
      const prompt = this.createAnalysisPrompt(sampleRecord);
      
      // Call LLM API (using Claude/OpenAI)
      const response = await this.callLLMForAnalysis(prompt);
      
      // Parse the response into structured format
      const analysis = this.parseAnalysisResponse(response, sampleRecord);
      
      console.log('=== Dataset Enhancement: Analysis complete ===', {
        datasetType: analysis.datasetType,
        missingFieldsCount: analysis.missingFields.length,
        confidence: analysis.analysisConfidence
      });

      return analysis;
    } catch (error) {
      console.error('=== Dataset Enhancement: Analysis failed ===', error);
      throw new Error(`Failed to analyze dataset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate data for a specific field that's consistent with existing data
   */
  static generateFieldData(
    options: FieldGenerationOptions,
    existingRecord: Record<string, unknown>
  ): unknown {
    const { fieldName, fieldType, dependentFields: _dependentFields } = options;
    
    switch (fieldType) {
      case 'date':
        return this.generateDateField(fieldName, existingRecord, _dependentFields);
      
      case 'ssn':
        return this.generateSSN();
      
      case 'phone':
        return this.generatePhoneNumber();
      
      case 'email':
        return this.generateEmail(existingRecord);
      
      case 'address':
        return this.generateAddress();
      
      case 'string':
        return this.generateStringField(fieldName, existingRecord);
      
      case 'number':
        return this.generateNumberField(fieldName, existingRecord);
      
      default:
        return this.generateGenericField(fieldType);
    }
  }

  /**
   * Create LLM prompt for dataset analysis
   */
  private static createAnalysisPrompt(sampleRecord: Record<string, unknown>): string {
    const fieldsText = Object.entries(sampleRecord)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join('\n');

    return `Analyze this data record and identify what fields would typically be expected in a comprehensive dataset of this type but are currently missing.

SAMPLE DATA:
${fieldsText}

INSTRUCTIONS:
1. First, identify what type of dataset this appears to be based on the field names and values
2. Consider the language and cultural context of the data
3. Suggest missing fields that would typically be found in this type of dataset
4. Focus on fields that add value for analytics, compliance, or completeness

Response format (JSON):
{
  "datasetType": "specific type and context of dataset",
  "detectedLanguage": "primary language of the data",
  "analysisConfidence": 0.0-1.0,
  "existingFields": [
    {
      "name": "field_name",
      "inferredType": "detected data type",
      "sample": "sample value"
    }
  ],
  "missingFields": [
    {
      "fieldName": "suggested_field_name",
      "fieldType": "string|number|date|boolean|email|phone|ssn|address",
      "description": "what this field represents",
      "reasoning": "why this field is suggested",
      "priority": "high|medium|low",
      "dependencies": ["fields this depends on"],
      "culturalContext": "any cultural/regional considerations"
    }
  ],
  "dataQualityInsights": {
    "completeness": 0.0-1.0,
    "consistency": ["any consistency issues found"],
    "recommendations": ["suggestions for data quality improvement"]
  }
}

Consider global contexts:
- For US data: SSN, ZIP codes, state abbreviations
- For EU data: VAT numbers, IBAN, GDPR-relevant fields
- For Asian markets: different ID formats, address structures
- Industry-specific: Healthcare (HIPAA), Financial (PCI), Retail (SKU/UPC)

The analysis should be dynamic and adapt to ANY type of dataset in ANY language.`;
  }

  /**
   * Call LLM API for analysis
   */
  private static async callLLMForAnalysis(prompt: string): Promise<string> {
    console.log('=== LLM Analysis Request ===');
    console.log('Prompt length:', prompt.length);
    
    try {
      // Use the LLM service for truly dynamic analysis
      const response = await llmService.analyze({
        prompt,
        systemPrompt: 'You are an expert data analyst specializing in dataset structure analysis, data quality assessment, and global data standards. You can analyze datasets in any language and identify culturally-appropriate missing fields.',
        temperature: 0.3, // Lower temperature for more consistent analysis
        maxTokens: 2000
      });
      
      console.log('LLM Response received from provider:', response.provider);
      
      // If we get a valid JSON response, return it
      try {
        JSON.parse(response.content);
        return response.content;
      } catch {
        console.log('LLM response was not valid JSON, using fallback analysis');
        // Fall back to basic analysis if LLM response isn't valid JSON
        const analysis = await this.performIntelligentAnalysis(prompt);
        return JSON.stringify(analysis, null, 2);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('LLM API error:', errorMessage);
      
      // Always use fallback analysis when LLM is not available
      console.log('Using fallback analysis - LLM not available');
      const analysis = await this.performIntelligentAnalysis(prompt);
      return JSON.stringify(analysis, null, 2);
    }
  }

  /**
   * Perform intelligent dataset analysis based on field names and values
   */
  private static async performIntelligentAnalysis(prompt: string): Promise<{
    datasetType: string;
    detectedLanguage: string;
    analysisConfidence: number;
    missingFields: MissingFieldSuggestion[];
    dataQualityInsights: {
      completeness: number;
      consistency: string[];
      recommendations: string[];
      emptyFields: number;
      totalFields: number;
    };
  }> {
    // Parse the sample record from the prompt
    const sampleData = this.parseSampleFromPrompt(prompt);
    
    // Detect language from field values
    const detectedLanguage = this.detectLanguageFromData(sampleData.fields);
    
    // Analyze field names and values to determine dataset type
    const datasetTypeInfo = this.detectDatasetType(sampleData);
    
    // Generate contextually appropriate missing fields
    const missingFields = this.generateMissingFieldsForType(
      datasetTypeInfo.type, 
      datasetTypeInfo.confidence,
      sampleData.fields,
      detectedLanguage
    );
    
    // Analyze data quality
    const dataQualityInsights = this.analyzeDataQuality(sampleData.fields);
    
    return {
      datasetType: datasetTypeInfo.description,
      detectedLanguage,
      analysisConfidence: datasetTypeInfo.confidence,
      missingFields,
      dataQualityInsights
    };
  }

  /**
   * Parse sample data from prompt
   */
  private static parseSampleFromPrompt(prompt: string): { fields: Map<string, string> } {
    const fields = new Map<string, string>();
    const lines = prompt.split('\n');
    
    let inSampleData = false;
    for (const line of lines) {
      if (line.includes('SAMPLE DATA:')) {
        inSampleData = true;
        continue;
      }
      if (line.includes('INSTRUCTIONS:')) {
        break;
      }
      
      if (inSampleData) {
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          fields.set(match[1].trim(), match[2].trim());
        }
      }
    }
    
    return { fields };
  }

  /**
   * Detect language from data values
   */
  private static detectLanguageFromData(fields: Map<string, string>): string {
    const allText = Array.from(fields.values()).join(' ');
    
    // Character-based language detection
    if (/[\u4e00-\u9fa5]/.test(allText)) return 'Chinese';
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(allText)) return 'Japanese';
    if (/[\uac00-\ud7af]/.test(allText)) return 'Korean';
    if (/[\u0600-\u06ff]/.test(allText)) return 'Arabic';
    if (/[\u0400-\u04ff]/.test(allText)) return 'Russian';
    if (/[\u0900-\u097f]/.test(allText)) return 'Hindi';
    if (/[\u0e00-\u0e7f]/.test(allText)) return 'Thai';
    
    // Latin script language detection by common words/patterns
    const textLower = allText.toLowerCase();
    
    // Spanish indicators
    if (/\b(señor|señora|calle|ciudad|teléfono|correo|fecha|nombre|apellido|dirección)\b/.test(textLower)) {
      return 'Spanish';
    }
    
    // French indicators
    if (/\b(monsieur|madame|rue|ville|téléphone|courriel|prénom|adresse|département)\b/.test(textLower)) {
      return 'French';
    }
    
    // German indicators
    if (/\b(herr|frau|straße|stadt|telefon|geburtsdatum|vorname|nachname|postleitzahl)\b/.test(textLower)) {
      return 'German';
    }
    
    // Portuguese indicators
    if (/\b(senhor|senhora|rua|cidade|telefone|endereço|nome|sobrenome|código postal)\b/.test(textLower)) {
      return 'Portuguese';
    }
    
    // Italian indicators
    if (/\b(signore|signora|via|città|telefono|indirizzo|nome|cognome|codice postale)\b/.test(textLower)) {
      return 'Italian';
    }
    
    // Dutch indicators
    if (/\b(meneer|mevrouw|straat|stad|telefoon|adres|voornaam|achternaam|postcode)\b/.test(textLower)) {
      return 'Dutch';
    }
    
    return 'English';
  }

  /**
   * Detect dataset type based on field analysis
   */
  private static detectDatasetType(data: { fields: Map<string, string> }): {
    type: string;
    description: string;
    confidence: number;
  } {
    const fieldNames = Array.from(data.fields.keys());
    const fieldValues = Array.from(data.fields.values()).join(' ').toLowerCase();
    
    // Score different dataset types
    const scores: Record<string, number> = {
      financial: 0,
      healthcare: 0,
      ecommerce: 0,
      customer: 0,
      hr: 0,
      iot: 0,
      logistics: 0
    };
    
    // Financial indicators
    const financialTerms = ['amount', 'transaction', 'payment', 'balance', 'account', 'currency', 'credit', 'debit', 'invoice', 'billing', 'price', 'cost', 'fee', 'charge', 'bank', 'card'];
    scores.financial = this.calculateScore(fieldNames, fieldValues, financialTerms);
    
    // Healthcare indicators
    const healthcareTerms = ['patient', 'diagnosis', 'medical', 'health', 'condition', 'treatment', 'medication', 'doctor', 'hospital', 'symptom', 'blood', 'prescription', 'age', 'gender'];
    scores.healthcare = this.calculateScore(fieldNames, fieldValues, healthcareTerms);
    
    // E-commerce indicators
    const ecommerceTerms = ['product', 'order', 'customer', 'cart', 'shipping', 'inventory', 'sku', 'category', 'price', 'quantity', 'discount', 'review', 'rating'];
    scores.ecommerce = this.calculateScore(fieldNames, fieldValues, ecommerceTerms);
    
    // Customer/CRM indicators
    const customerTerms = ['customer', 'client', 'contact', 'email', 'phone', 'address', 'name', 'company', 'segment', 'status', 'created', 'updated'];
    scores.customer = this.calculateScore(fieldNames, fieldValues, customerTerms);
    
    // HR/Employee indicators
    const hrTerms = ['employee', 'salary', 'department', 'position', 'hire', 'manager', 'performance', 'leave', 'benefit', 'payroll'];
    scores.hr = this.calculateScore(fieldNames, fieldValues, hrTerms);
    
    // Find the highest scoring type
    let maxScore = 0;
    let detectedType = 'general';
    
    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedType = type;
      }
    }
    
    // Calculate confidence based on score strength
    const confidence = Math.min(0.95, 0.6 + (maxScore / 10) * 0.35);
    
    // Map to descriptions
    const typeDescriptions: Record<string, string> = {
      financial: 'Financial Transaction Records',
      healthcare: 'Healthcare Patient Records',
      ecommerce: 'E-commerce Order Data',
      customer: 'Customer Relationship Management (CRM) Data',
      hr: 'Human Resources Employee Records',
      iot: 'IoT Sensor Data',
      logistics: 'Logistics and Supply Chain Data',
      general: 'General Business Data'
    };
    
    return {
      type: detectedType,
      description: typeDescriptions[detectedType] || 'Unknown Dataset Type',
      confidence
    };
  }

  /**
   * Calculate relevance score for a dataset type
   */
  private static calculateScore(fieldNames: string[], fieldValues: string, terms: string[]): number {
    let score = 0;
    
    for (const term of terms) {
      // Check field names (weighted higher)
      if (fieldNames.some(f => f.includes(term))) {
        score += 2;
      }
      // Check field values
      if (fieldValues.includes(term)) {
        score += 1;
      }
    }
    
    return score;
  }

  /**
   * Generate missing fields based on detected dataset type
   */
  private static generateMissingFieldsForType(
    datasetType: string,
    confidence: number,
    existingFields: Map<string, string>,
    language: string
  ): MissingFieldSuggestion[] {
    const existingFieldNames = Array.from(existingFields.keys());
    
    // Define field templates for each dataset type
    const fieldTemplates: Record<string, MissingFieldSuggestion[]> = {
      financial: [
        { fieldName: "transaction_id", fieldType: "string", description: "Unique transaction identifier", reasoning: "Essential for tracking and auditing transactions", priority: "high" },
        { fieldName: "account_number", fieldType: "string", description: "Account number", reasoning: "Required for account identification", priority: "high" },
        { fieldName: "transaction_date", fieldType: "date", description: "Transaction timestamp", reasoning: "Critical for temporal analysis and reporting", priority: "high" },
        { fieldName: "merchant_name", fieldType: "string", description: "Merchant or vendor name", reasoning: "Important for categorization and analysis", priority: "medium" },
        { fieldName: "transaction_type", fieldType: "string", description: "Type of transaction", reasoning: "Helps classify transactions", priority: "medium" },
        { fieldName: "currency_code", fieldType: "string", description: "Currency code", reasoning: "Essential for multi-currency support", priority: "medium" },
        { fieldName: "authorization_code", fieldType: "string", description: "Payment authorization", reasoning: "Important for payment verification", priority: "low" }
      ],
      healthcare: [
        { fieldName: "patient_id", fieldType: "string", description: "Unique patient identifier", reasoning: "Essential for patient tracking", priority: "high" },
        { fieldName: "date_of_birth", fieldType: "date", description: "Patient DOB", reasoning: "Required for age calculation and verification", priority: "high", dependencies: ["age"] },
        { fieldName: "social_security_number", fieldType: "ssn", description: "SSN", reasoning: "Required for insurance and identification", priority: "high" },
        { fieldName: "phone_number", fieldType: "phone", description: "Contact phone", reasoning: "Essential for patient communication", priority: "high" },
        { fieldName: "email_address", fieldType: "email", description: "Email contact", reasoning: "Modern healthcare communication", priority: "medium" },
        { fieldName: "insurance_provider", fieldType: "string", description: "Insurance company", reasoning: "Required for billing", priority: "high" },
        { fieldName: "primary_physician", fieldType: "string", description: "Primary care doctor", reasoning: "Important for care coordination", priority: "medium" }
      ],
      ecommerce: [
        { fieldName: "order_id", fieldType: "string", description: "Order identifier", reasoning: "Essential for order tracking", priority: "high" },
        { fieldName: "customer_email", fieldType: "email", description: "Customer email", reasoning: "Required for communication", priority: "high" },
        { fieldName: "shipping_address", fieldType: "address", description: "Delivery address", reasoning: "Essential for fulfillment", priority: "high" },
        { fieldName: "order_date", fieldType: "date", description: "Order timestamp", reasoning: "Critical for processing and analytics", priority: "high" },
        { fieldName: "tracking_number", fieldType: "string", description: "Shipment tracking", reasoning: "Important for delivery tracking", priority: "medium" },
        { fieldName: "payment_method", fieldType: "string", description: "Payment type", reasoning: "Important for financial reconciliation", priority: "medium" },
        { fieldName: "discount_code", fieldType: "string", description: "Promotional code", reasoning: "Useful for marketing analysis", priority: "low" }
      ],
      customer: [
        { fieldName: "customer_id", fieldType: "string", description: "Unique customer ID", reasoning: "Essential for customer tracking", priority: "high" },
        { fieldName: "email", fieldType: "email", description: "Email address", reasoning: "Primary communication channel", priority: "high" },
        { fieldName: "phone", fieldType: "phone", description: "Phone number", reasoning: "Alternative contact method", priority: "high" },
        { fieldName: "address", fieldType: "address", description: "Mailing address", reasoning: "Required for shipping and billing", priority: "medium" },
        { fieldName: "date_created", fieldType: "date", description: "Account creation date", reasoning: "Important for customer lifecycle", priority: "medium" },
        { fieldName: "last_purchase_date", fieldType: "date", description: "Last transaction date", reasoning: "Key for engagement metrics", priority: "medium" },
        { fieldName: "lifetime_value", fieldType: "number", description: "Total customer value", reasoning: "Critical for segmentation", priority: "low" }
      ],
      hr: [
        { fieldName: "employee_id", fieldType: "string", description: "Employee identifier", reasoning: "Essential for HR tracking", priority: "high" },
        { fieldName: "ssn", fieldType: "ssn", description: "Social Security Number", reasoning: "Required for payroll and tax", priority: "high" },
        { fieldName: "hire_date", fieldType: "date", description: "Employment start date", reasoning: "Important for tenure and benefits", priority: "high" },
        { fieldName: "email", fieldType: "email", description: "Work email", reasoning: "Primary communication channel", priority: "high" },
        { fieldName: "phone", fieldType: "phone", description: "Contact phone", reasoning: "Emergency contact information", priority: "medium" },
        { fieldName: "emergency_contact", fieldType: "string", description: "Emergency contact info", reasoning: "Critical for emergencies", priority: "high" },
        { fieldName: "date_of_birth", fieldType: "date", description: "DOB", reasoning: "Required for benefits and compliance", priority: "medium" }
      ]
    };
    
    // Get relevant fields for the detected type
    let relevantFields = fieldTemplates[datasetType] || fieldTemplates.customer;
    
    // Add region-specific fields based on language
    const regionFields = this.getRegionSpecificFields(datasetType, language);
    relevantFields = [...relevantFields, ...regionFields];
    
    // Filter out fields that already exist
    const missingFields = relevantFields.filter(field => 
      !existingFieldNames.some(existing => 
        existing.toLowerCase().includes(field.fieldName.toLowerCase().replace('_', '')) ||
        field.fieldName.toLowerCase().replace('_', '').includes(existing.toLowerCase())
      )
    );
    
    // Adjust confidence in suggestions based on detection confidence
    return missingFields.map(field => ({
      ...field,
      dependencies: field.dependencies || []
    }));
  }

  /**
   * Get region-specific fields based on language and dataset type
   */
  private static getRegionSpecificFields(datasetType: string, language: string): MissingFieldSuggestion[] {
    const regionFields: MissingFieldSuggestion[] = [];
    
    // European languages - GDPR considerations
    if (['French', 'German', 'Italian', 'Spanish', 'Dutch', 'Portuguese'].includes(language)) {
      if (datasetType === 'customer' || datasetType === 'hr') {
        regionFields.push({
          fieldName: 'gdpr_consent',
          fieldType: 'boolean',
          description: 'GDPR consent status',
          reasoning: 'Required for GDPR compliance in EU',
          priority: 'high'
        });
        regionFields.push({
          fieldName: 'data_retention_date',
          fieldType: 'date',
          description: 'Date until which data can be retained',
          reasoning: 'GDPR requires data retention policies',
          priority: 'medium'
        });
      }
      
      if (datasetType === 'financial') {
        regionFields.push({
          fieldName: 'iban',
          fieldType: 'string',
          description: 'International Bank Account Number',
          reasoning: 'Standard for EU banking',
          priority: 'high'
        });
        regionFields.push({
          fieldName: 'bic_swift',
          fieldType: 'string',
          description: 'BIC/SWIFT code',
          reasoning: 'Required for international transactions',
          priority: 'medium'
        });
      }
    }
    
    // Asian languages - specific ID formats
    if (['Chinese', 'Japanese', 'Korean'].includes(language)) {
      if (datasetType === 'customer' || datasetType === 'hr') {
        regionFields.push({
          fieldName: 'national_id',
          fieldType: 'string',
          description: 'National identification number',
          reasoning: 'Common identification method in Asia',
          priority: 'high'
        });
      }
      
      if (language === 'Chinese') {
        regionFields.push({
          fieldName: 'hukou_location',
          fieldType: 'string',
          description: 'Household registration location',
          reasoning: 'Important for Chinese administrative purposes',
          priority: 'medium'
        });
      }
      
      if (language === 'Japanese') {
        regionFields.push({
          fieldName: 'furigana',
          fieldType: 'string',
          description: 'Name pronunciation in katakana',
          reasoning: 'Essential for proper name reading in Japanese',
          priority: 'high'
        });
      }
    }
    
    // Arabic - specific considerations
    if (language === 'Arabic') {
      regionFields.push({
        fieldName: 'name_arabic',
        fieldType: 'string',
        description: 'Name in Arabic script',
        reasoning: 'Official records often require Arabic names',
        priority: 'high'
      });
      
      if (datasetType === 'financial') {
        regionFields.push({
          fieldName: 'islamic_banking_compliant',
          fieldType: 'boolean',
          description: 'Sharia-compliant banking flag',
          reasoning: 'Important for Islamic banking requirements',
          priority: 'medium'
        });
      }
    }
    
    // Spanish/Portuguese - Latin America considerations
    if (['Spanish', 'Portuguese'].includes(language)) {
      if (datasetType === 'customer' || datasetType === 'hr') {
        regionFields.push({
          fieldName: 'maternal_surname',
          fieldType: 'string',
          description: 'Maternal family name',
          reasoning: 'Common naming convention in Hispanic cultures',
          priority: 'medium'
        });
        regionFields.push({
          fieldName: 'rfc_curp',
          fieldType: 'string',
          description: 'Tax ID (RFC) or population registry (CURP)',
          reasoning: 'Standard identifiers in Latin America',
          priority: 'high'
        });
      }
    }
    
    return regionFields;
  }

  /**
   * Analyze data quality
   */
  private static analyzeDataQuality(fields: Map<string, string>): {
    completeness: number;
    consistency: string[];
    recommendations: string[];
    emptyFields: number;
    totalFields: number;
  } {
    const fieldArray = Array.from(fields.entries());
    const totalFields = fieldArray.length;
    
    // Calculate completeness
    let filledFields = 0;
    const emptyFields: string[] = [];
    
    fieldArray.forEach(([key, value]) => {
      if (value && value.trim() && value.toLowerCase() !== 'null' && value.toLowerCase() !== 'n/a') {
        filledFields++;
      } else {
        emptyFields.push(key);
      }
    });
    
    const completeness = totalFields > 0 ? filledFields / totalFields : 0;
    
    // Check consistency
    const consistency: string[] = [];
    
    // Check date formats
    const dateFields = fieldArray.filter(([key]) => 
      key.toLowerCase().includes('date') || key.toLowerCase().includes('time')
    );
    
    if (dateFields.length > 1) {
      const dateFormats = new Set(dateFields.map(([, value]) => this.detectDateFormat(value)));
      if (dateFormats.size > 1) {
        consistency.push('Inconsistent date formats detected across fields');
      }
    }
    
    // Check for potential duplicates
    const values = fieldArray.map(([, value]) => value.toLowerCase().trim());
    const uniqueValues = new Set(values);
    if (uniqueValues.size < values.length * 0.8) {
      consistency.push('Potential duplicate values detected');
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (completeness < 0.8) {
      recommendations.push(`Improve data completeness (currently ${Math.round(completeness * 100)}%)`);
    }
    
    if (emptyFields.length > 0) {
      recommendations.push(`Fill in missing values for: ${emptyFields.slice(0, 3).join(', ')}${emptyFields.length > 3 ? '...' : ''}`);
    }
    
    if (consistency.length > 0) {
      recommendations.push('Standardize data formats across fields');
    }
    
    return {
      completeness,
      consistency,
      recommendations,
      emptyFields: emptyFields.length,
      totalFields
    };
  }

  /**
   * Detect date format
   */
  private static detectDateFormat(dateStr: string): string {
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return 'ISO';
    if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) return 'US';
    if (/^\d{2}-\d{2}-\d{4}/.test(dateStr)) return 'EU';
    if (/^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(dateStr)) return 'Text';
    return 'Unknown';
  }

  /**
   * Parse LLM response into structured format
   */
  private static parseAnalysisResponse(
    response: string, 
    sampleRecord: Record<string, unknown>
  ): DatasetAnalysis {
    try {
      const parsed = JSON.parse(response);
      
      // Handle both old and new response formats
      const missingFields = parsed.missingFields || [];
      
      // Ensure all missing fields have the correct structure
      const validatedFields = missingFields.map((field: MissingFieldSuggestion) => ({
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        description: field.description,
        reasoning: field.reasoning,
        priority: field.priority || 'medium',
        dependencies: field.dependencies || []
      }));
      
      // Log additional insights if available
      if (parsed.detectedLanguage) {
        console.log('Detected language:', parsed.detectedLanguage);
      }
      if (parsed.dataQualityInsights) {
        console.log('Data quality insights:', parsed.dataQualityInsights);
      }
      
      return {
        datasetType: parsed.datasetType || 'Unknown Dataset Type',
        existingFields: Object.keys(sampleRecord),
        missingFields: validatedFields,
        analysisConfidence: parsed.analysisConfidence || 0.8
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      
      // Fallback response
      return {
        datasetType: 'Unknown Dataset Type',
        existingFields: Object.keys(sampleRecord),
        missingFields: [],
        analysisConfidence: 0.0
      };
    }
  }

  /**
   * Generate date field (e.g., DOB based on age)
   */
  private static generateDateField(
    fieldName: string, 
    existingRecord: Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _dependentFields?: Record<string, unknown>
  ): string {
    if (fieldName.toLowerCase().includes('birth') || fieldName.toLowerCase().includes('dob')) {
      // Generate DOB based on age
      const age = existingRecord.Age || existingRecord.age;
      if (typeof age === 'number') {
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - age;
        const birthMonth = Math.floor(Math.random() * 12) + 1;
        const birthDay = Math.floor(Math.random() * 28) + 1; // Safe day range
        
        return `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;
      }
    }
    
    // Generate random date within reasonable range
    const startDate = new Date('1950-01-01');
    const endDate = new Date();
    const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
    const randomDate = new Date(randomTime);
    
    return randomDate.toISOString().split('T')[0];
  }

  /**
   * Generate SSN
   */
  private static generateSSN(): string {
    // Generate realistic but fake SSN (avoid real SSN ranges)
    const area = Math.floor(Math.random() * 899) + 100; // 100-999 (avoid 000, 666, 900-999)
    const group = Math.floor(Math.random() * 99) + 1;   // 01-99
    const serial = Math.floor(Math.random() * 9999) + 1; // 0001-9999
    
    return `${area}-${group.toString().padStart(2, '0')}-${serial.toString().padStart(4, '0')}`;
  }

  /**
   * Generate phone number
   */
  private static generatePhoneNumber(): string {
    const areaCodes = ['555', '404', '312', '213', '415', '718', '206', '303', '617', '713'];
    const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
    const exchange = Math.floor(Math.random() * 900) + 100;
    const number = Math.floor(Math.random() * 9000) + 1000;
    
    return `(${areaCode}) ${exchange}-${number}`;
  }

  /**
   * Generate email based on name
   */
  private static generateEmail(existingRecord: Record<string, unknown>): string {
    const name = existingRecord.Name || existingRecord.name;
    if (typeof name === 'string') {
      const nameParts = name.toLowerCase().split(' ');
      const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com'];
      const domain = domains[Math.floor(Math.random() * domains.length)];
      
      if (nameParts.length >= 2) {
        return `${nameParts[0]}.${nameParts[1]}@${domain}`;
      } else {
        return `${nameParts[0]}${Math.floor(Math.random() * 100)}@${domain}`;
      }
    }
    
    return `user${Math.floor(Math.random() * 10000)}@example.com`;
  }

  /**
   * Generate address
   */
  private static generateAddress(): string {
    const streetNumbers = [
      Math.floor(Math.random() * 9999) + 1,
      Math.floor(Math.random() * 999) + 1
    ];
    
    const streetNames = [
      'Main St', 'Oak Ave', 'Elm St', 'Park Rd', 'First St', 'Second Ave', 
      'Maple Dr', 'Cedar Ln', 'Pine St', 'Washington Ave', 'Lincoln Blvd'
    ];
    
    const cities = [
      'Springfield', 'Madison', 'Franklin', 'Georgetown', 'Arlington', 
      'Riverside', 'Highland', 'Fairview', 'Centerville', 'Brookfield'
    ];
    
    const states = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI'];
    
    const streetNumber = streetNumbers[Math.floor(Math.random() * streetNumbers.length)];
    const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    const zipCode = Math.floor(Math.random() * 90000) + 10000;
    
    return `${streetNumber} ${streetName}, ${city}, ${state} ${zipCode}`;
  }

  /**
   * Generate string field
   */
  private static generateStringField(
    fieldName: string, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _existingRecord: Record<string, unknown>
  ): string {
    const fieldLower = fieldName.toLowerCase();
    
    // Financial fields
    if (fieldLower.includes('transaction') && fieldLower.includes('id')) {
      return `TXN-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }
    
    if (fieldLower.includes('account') && fieldLower.includes('number')) {
      return `${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    }
    
    if (fieldLower.includes('routing')) {
      // Generate valid-looking routing number (9 digits)
      return `${Math.floor(Math.random() * 900000000) + 100000000}`;
    }
    
    if (fieldLower.includes('merchant')) {
      const merchants = ['Amazon', 'Walmart', 'Target', 'Starbucks', 'Shell Gas', 'Apple Store', 'Best Buy', 'Home Depot', 'Kroger', 'CVS Pharmacy'];
      return merchants[Math.floor(Math.random() * merchants.length)];
    }
    
    if (fieldLower.includes('transaction') && fieldLower.includes('type')) {
      const types = ['Purchase', 'Refund', 'Transfer', 'Withdrawal', 'Deposit', 'Payment'];
      return types[Math.floor(Math.random() * types.length)];
    }
    
    if (fieldLower.includes('transaction') && fieldLower.includes('status')) {
      const statuses = ['Completed', 'Pending', 'Processing'];
      return statuses[Math.floor(Math.random() * statuses.length)];
    }
    
    if (fieldLower.includes('currency')) {
      const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
      return currencies[Math.floor(Math.random() * currencies.length)];
    }
    
    if (fieldLower.includes('authorization') || fieldLower.includes('auth_code')) {
      return `AUTH${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    }
    
    if (fieldLower.includes('card') && fieldLower.includes('four')) {
      return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    }
    
    if (fieldLower.includes('customer') && fieldLower.includes('id')) {
      return `CUST-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    }
    
    if (fieldLower.includes('allerg')) {
      const allergies = ['None', 'Penicillin', 'Shellfish', 'Nuts', 'Latex', 'Aspirin', 'Pollen'];
      return allergies[Math.floor(Math.random() * allergies.length)];
    }
    
    if (fieldLower.includes('emergency') || fieldLower.includes('contact')) {
      const names = ['John Smith', 'Mary Johnson', 'Robert Brown', 'Linda Davis', 'Michael Wilson'];
      const name = names[Math.floor(Math.random() * names.length)];
      const phone = this.generatePhoneNumber();
      return `${name} - ${phone}`;
    }
    
    if (fieldLower.includes('physician') || fieldLower.includes('doctor')) {
      const doctors = ['Dr. Sarah Johnson', 'Dr. Michael Brown', 'Dr. Emily Davis', 'Dr. David Wilson', 'Dr. Lisa Garcia'];
      return doctors[Math.floor(Math.random() * doctors.length)];
    }
    
    if (fieldLower.includes('height')) {
      const feet = Math.floor(Math.random() * 3) + 4; // 4-6 feet
      const inches = Math.floor(Math.random() * 12);  // 0-11 inches
      return `${feet}'${inches}"`;
    }
    
    if (fieldLower.includes('weight')) {
      const weight = Math.floor(Math.random() * 200) + 100; // 100-300 lbs
      return `${weight} lbs`;
    }
    
    return `Generated ${fieldName}`;
  }

  /**
   * Generate number field
   */
  private static generateNumberField(
    fieldName: string, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _existingRecord: Record<string, unknown>
  ): number {
    const fieldLower = fieldName.toLowerCase();
    
    if (fieldLower.includes('id') || fieldLower.includes('number')) {
      return Math.floor(Math.random() * 1000000) + 100000;
    }
    
    if (fieldLower.includes('age')) {
      return Math.floor(Math.random() * 80) + 18;
    }
    
    return Math.floor(Math.random() * 1000);
  }

  /**
   * Generate generic field
   */
  private static generateGenericField(fieldType: string): unknown {
    switch (fieldType) {
      case 'boolean':
        return Math.random() > 0.5;
      case 'number':
        return Math.floor(Math.random() * 1000);
      default:
        return 'Generated Value';
    }
  }
}