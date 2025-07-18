import { faker } from '@faker-js/faker';
import { getDatabase } from '@/database/connection';
import { SyntheticDataset } from '@/entities/SyntheticDataset';
import { SyntheticDataJob } from '@/entities/SyntheticDataJob';
import { DataSourceService } from './dataSourceService';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export interface SyntheticDataRequest {
  name: string;
  description?: string;
  dataType: string;
  recordCount: number;
  schema: DataSchema;
  outputFormat: 'json' | 'csv' | 'sql';
  configuration?: SyntheticDataConfiguration;
  sourceDataId?: string; // Reference to source data for realistic generation
}

export interface DataSchema {
  [fieldName: string]: FieldDefinition;
}

export interface FieldDefinition {
  type: 'name' | 'email' | 'phone' | 'address' | 'ssn' | 'creditCard' | 'date' | 'number' | 'text' | 'boolean' | 'uuid';
  subtype?: string; // e.g., 'firstName', 'lastName', 'zipCode', 'city', etc.
  constraints?: {
    min?: number;
    max?: number;
    format?: string;
    options?: string[];
  };
  sourceAnalysis?: FieldSourceAnalysis; // Analysis from source data
}

export interface FieldSourceAnalysis {
  sampleValues?: unknown[];
  distinctValues?: unknown[];
  valueDistribution?: Record<string, number>;
  numericStats?: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
  };
  stringPatterns?: {
    averageLength: number;
    commonPrefixes: string[];
    commonSuffixes: string[];
    regexPattern?: string;
  };
  numericFormat?: {
    isInteger: boolean;
    decimalPlaces: number;
    isCurrency: boolean;
    hasLeadingZeros: boolean;
    commonFormat?: string; // e.g., "##.##", "###-##-####"
  };
  dateStats?: {
    minDate: Date;
    maxDate: Date;
    commonFormats: string[];
  };
}

export interface SyntheticDataConfiguration {
  locale?: string;
  seed?: number;
  anonymization?: {
    preserveFormat?: boolean;
    preserveLength?: boolean;
  };
}

export class SyntheticDataService {
  /**
   * Analyze source data to understand patterns for realistic synthetic generation
   */
  static async analyzeSourceData(sourceDataId: string): Promise<Record<string, FieldSourceAnalysis>> {
    try {
      
      // Get the transformed data from the source
      const catalog = await DataSourceService.getTransformedData(sourceDataId);
      if (!catalog || !catalog.records || catalog.records.length === 0) {
        return {};
      }

      const fieldAnalysis: Record<string, FieldSourceAnalysis> = {};
      const records = catalog.records.map(r => r.data);
      
      // Analyze each field in the dataset
      if (records.length > 0) {
        const fieldNames = Object.keys(records[0]);
        
        for (const fieldName of fieldNames) {
          fieldAnalysis[fieldName] = this.analyzeField(fieldName, records);
        }
      }

      
      return fieldAnalysis;
    } catch (error) {
      console.error('Error analyzing source data:', error);
      return {};
    }
  }

  /**
   * Analyze a specific field across all records
   */
  private static analyzeField(fieldName: string, records: Record<string, unknown>[]): FieldSourceAnalysis {
    const values = records.map(r => r[fieldName]).filter(v => v !== null && v !== undefined);
    const analysis: FieldSourceAnalysis = {};

    if (values.length === 0) return analysis;

    // Sample values (up to 20 for variety)
    analysis.sampleValues = values.slice(0, 20);
    
    // Distinct values (up to 50 to avoid memory issues)
    const distinctValues = [...new Set(values)];
    analysis.distinctValues = distinctValues.slice(0, 50);

    // Value distribution for categorical data
    if (distinctValues.length <= 20) {
      analysis.valueDistribution = {};
      for (const value of values) {
        const key = String(value);
        analysis.valueDistribution[key] = (analysis.valueDistribution[key] || 0) + 1;
      }
    }

    // Numeric analysis
    const numericValues = values.filter(v => typeof v === 'number' || !isNaN(Number(v))).map(v => Number(v));
    if (numericValues.length > 0) {
      const sorted = numericValues.sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const mean = sum / sorted.length;
      
      analysis.numericStats = {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean,
        median: sorted[Math.floor(sorted.length / 2)],
        stdDev: Math.sqrt(sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sorted.length)
      };

      // Analyze numeric formatting patterns
      analysis.numericFormat = this.analyzeNumericFormat(fieldName, values);
    }

    // String pattern analysis
    const stringValues = values.filter(v => typeof v === 'string') as string[];
    if (stringValues.length > 0) {
      const lengths = stringValues.map(s => s.length);
      const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      
      analysis.stringPatterns = {
        averageLength: avgLength,
        commonPrefixes: this.findCommonPrefixes(stringValues),
        commonSuffixes: this.findCommonSuffixes(stringValues)
      };
    }

    // Date analysis
    const dateValues = values.filter(v => {
      const date = new Date(String(v));
      return !isNaN(date.getTime());
    }).map(v => new Date(String(v)));
    
    if (dateValues.length > 0) {
      const sortedDates = dateValues.sort((a, b) => a.getTime() - b.getTime());
      analysis.dateStats = {
        minDate: sortedDates[0],
        maxDate: sortedDates[sortedDates.length - 1],
        commonFormats: [] // Could be enhanced to detect common date formats
      };
    }

    return analysis;
  }

  /**
   * Find common prefixes in string values
   */
  private static findCommonPrefixes(strings: string[], minLength = 2): string[] {
    const prefixCounts: Record<string, number> = {};
    
    for (const str of strings) {
      for (let i = minLength; i <= Math.min(str.length, 5); i++) {
        const prefix = str.substring(0, i);
        prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
      }
    }
    
    // Return prefixes that appear in at least 20% of strings
    const threshold = Math.max(1, strings.length * 0.2);
    return Object.entries(prefixCounts)
      .filter(([, count]) => count >= threshold)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([prefix]) => prefix);
  }

  /**
   * Find common suffixes in string values
   */
  private static findCommonSuffixes(strings: string[], minLength = 2): string[] {
    const suffixCounts: Record<string, number> = {};
    
    for (const str of strings) {
      for (let i = minLength; i <= Math.min(str.length, 5); i++) {
        const suffix = str.substring(str.length - i);
        suffixCounts[suffix] = (suffixCounts[suffix] || 0) + 1;
      }
    }
    
    // Return suffixes that appear in at least 20% of strings
    const threshold = Math.max(1, strings.length * 0.2);
    return Object.entries(suffixCounts)
      .filter(([, count]) => count >= threshold)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([suffix]) => suffix);
  }

  /**
   * Analyze numeric formatting patterns to determine if values should be integers or decimals
   */
  private static analyzeNumericFormat(fieldName: string, values: unknown[]): FieldSourceAnalysis['numericFormat'] {
    const numericValues = values.filter(v => typeof v === 'number' || !isNaN(Number(v))).map(v => Number(v));
    if (numericValues.length === 0) {
      return {
        isInteger: true,
        decimalPlaces: 0,
        isCurrency: false,
        hasLeadingZeros: false
      };
    }

    const fieldNameLower = fieldName.toLowerCase();
    
    // Check if field name suggests integer values
    const integerFields = ['age', 'room', 'count', 'quantity', 'number', 'id', 'index', 'rank', 'level', 'floor', 'year'];
    const isIntegerField = integerFields.some(field => fieldNameLower.includes(field));
    
    // Check if field name suggests currency
    const currencyFields = ['amount', 'price', 'cost', 'fee', 'billing', 'payment', 'salary', 'income', 'balance', 'total', 'charge', 'bill', 'expense', 'revenue', 'dollar', 'usd', 'money', 'financial'];
    const isCurrencyField = currencyFields.some(field => fieldNameLower.includes(field));
    
    // Analyze the actual values
    const integerCount = numericValues.filter(v => Number.isInteger(v)).length;
    const hasDecimals = numericValues.some(v => !Number.isInteger(v));
    const isActuallyInteger = integerCount >= numericValues.length * 0.8; // 80% are integers
    
    // Calculate common decimal places for non-integer values
    let commonDecimalPlaces = 0;
    if (hasDecimals) {
      const decimalPlacesCounts: Record<number, number> = {};
      
      numericValues.forEach(v => {
        if (!Number.isInteger(v)) {
          const str = v.toString();
          const decimalIndex = str.indexOf('.');
          const places = decimalIndex >= 0 ? str.length - decimalIndex - 1 : 0;
          decimalPlacesCounts[places] = (decimalPlacesCounts[places] || 0) + 1;
        }
      });
      
      // Find most common decimal places
      const entries = Object.entries(decimalPlacesCounts);
      if (entries.length > 0) {
        entries.sort(([, a], [, b]) => b - a);
        commonDecimalPlaces = parseInt(entries[0][0]);
      }
    }
    
    // Check for leading zeros (relevant for ID fields, phone numbers, etc.)
    const stringValues = values.filter(v => typeof v === 'string') as string[];
    const hasLeadingZeros = stringValues.some(v => /^0\d/.test(v));
    
    // Determine final formatting
    let isInteger: boolean;
    let decimalPlaces: number;
    let isCurrency: boolean;
    
    if (isCurrencyField) {
      // Currency fields should have decimals (typically 2 decimal places)
      isInteger = false;
      decimalPlaces = commonDecimalPlaces > 0 ? commonDecimalPlaces : 2;
      isCurrency = true;
    } else if (isIntegerField || (isActuallyInteger && !hasDecimals)) {
      // Integer fields or values that are actually all integers
      isInteger = true;
      decimalPlaces = 0;
      isCurrency = false;
    } else {
      // Default to decimal with observed decimal places
      isInteger = false;
      decimalPlaces = commonDecimalPlaces > 0 ? commonDecimalPlaces : 1;
      isCurrency = false;
    }
    
    return {
      isInteger,
      decimalPlaces,
      isCurrency,
      hasLeadingZeros,
      commonFormat: isInteger ? '###' : `###.${'#'.repeat(decimalPlaces)}`
    };
  }

  static async createSyntheticDataset(request: SyntheticDataRequest): Promise<SyntheticDataset> {
    try {
      
      const db = await getDatabase();
      
      const repository = db.getRepository(SyntheticDataset);

      // Check if table exists by trying a simple query first
      try {
        await repository.count();
      } catch (tableError) {
        console.error('Table may not exist, attempting to synchronize schema:', tableError);
        await db.synchronize();
      }

      // If source data is provided, analyze it for realistic generation
      let enhancedSchema = request.schema;
      if (request.sourceDataId) {
        const sourceAnalysis = await this.analyzeSourceData(request.sourceDataId);
        
        // Enhance schema with source analysis
        enhancedSchema = { ...request.schema };
        for (const [fieldName, fieldDef] of Object.entries(enhancedSchema)) {
          if (sourceAnalysis[fieldName]) {
            enhancedSchema[fieldName] = {
              ...fieldDef,
              sourceAnalysis: sourceAnalysis[fieldName]
            };
          }
        }
        
      }

      // Create dataset record
      const dataset = repository.create({
        name: request.name,
        description: request.description,
        dataType: request.dataType,
        schema: enhancedSchema as Record<string, unknown>,
        recordCount: request.recordCount,
        configuration: {
          ...request.configuration,
          sourceDataId: request.sourceDataId
        } as Record<string, unknown>,
        outputFormat: request.outputFormat,
        status: 'draft'
      });

      await repository.save(dataset);
      
      // Check if this is a serverless environment that might not persist data
      const isServerless = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;
      const isInMemoryDb = (db.options as { database?: string }).database === ':memory:';
      
      if (isServerless && isInMemoryDb) {
        console.warn('Serverless environment with in-memory database detected - data may not persist');
        return {
          ...dataset,
          warning: 'Dataset created in serverless environment with in-memory database. Data may not persist between requests.'
        } as SyntheticDataset & { warning: string };
      }
      
      return dataset;
    } catch (error) {
      console.error('Error in SyntheticDataService.createSyntheticDataset:', error);
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  static async generateData(datasetId: string): Promise<{ dataset: SyntheticDataset; job: SyntheticDataJob }> {
    const db = await getDatabase();
    const datasetRepository = db.getRepository(SyntheticDataset);
    const jobRepository = db.getRepository(SyntheticDataJob);

    const dataset = await datasetRepository.findOne({ where: { id: datasetId } });
    if (!dataset) {
      throw new Error('Dataset not found');
    }

    // Create a job record
    const job = jobRepository.create({
      datasetId: dataset.id,
      status: 'running',
      progress: 0,
      recordsGenerated: 0
    });
    await jobRepository.save(job);

    try {
      // Update dataset status to generating
      dataset.status = 'generating';
      await datasetRepository.save(dataset);

      // Configure faker
      if (dataset.configuration?.seed) {
        faker.seed(dataset.configuration.seed as number);
      }

      // Generate synthetic data

      const records = [];
      for (let i = 0; i < dataset.recordCount; i++) {
        const record: Record<string, unknown> = {};
        
        for (const [fieldName, fieldDef] of Object.entries(dataset.schema || {})) {
          const value = this.generateFieldValue(fieldDef as FieldDefinition, fieldName);
          record[fieldName] = value;
        }
        
        records.push(record);

        // Update progress
        const progress = Math.round(((i + 1) / dataset.recordCount) * 100);
        if (progress % 10 === 0 || i === dataset.recordCount - 1) {
          job.progress = progress;
          job.recordsGenerated = i + 1;
          await jobRepository.save(job);
        }
      }


      // Save to file
      const filePath = await this.saveDataToFile(records, dataset);
      const fileName = filePath.split('/').pop() || `synthetic_${Date.now()}.json`;
      
      // Update dataset with success
      dataset.status = 'completed';
      // filePath is not a real column, just a getter
      // dataset.errorMessage = undefined; // errorMessage also doesn't exist
      await datasetRepository.save(dataset);

      // Update job with success
      job.status = 'completed';
      job.progress = 100;
      job.recordsGenerated = dataset.recordCount;
      job.outputFile = fileName;
      job.endTime = new Date();
      await jobRepository.save(job);

      return { dataset, job };
    } catch (error) {
      // Update dataset with error
      dataset.status = 'failed';
      // errorMessage doesn't exist in the entity
      await datasetRepository.save(dataset);

      // Update job with error
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      job.endTime = new Date();
      await jobRepository.save(job);

      throw error;
    }
  }

  /**
   * Generate realistic values based on source data analysis
   */
  private static generateRealisticValue(
    type: string, 
    analysis: FieldSourceAnalysis, 
    subtype?: string,
    fieldName?: string
  ): unknown | null {
    try {
      // For categorical data with limited distinct values, use weighted sampling
      if (analysis.valueDistribution && Object.keys(analysis.valueDistribution).length <= 20) {
        return this.weightedSample(analysis.valueDistribution);
      }

      // For numeric data, use statistical distribution
      if (analysis.numericStats && (type === 'number' || type === 'date')) {
        const numericValue = this.generateRealisticNumeric(analysis.numericStats, type, analysis.numericFormat);
        
        // Apply currency formatting if this is a currency field (by subtype or analysis)
        if (subtype === 'currency' || (analysis.numericFormat && analysis.numericFormat.isCurrency)) {
          return parseFloat(numericValue.toFixed(2));
        }
        
        return numericValue;
      }

      // For date data, use date range
      if (analysis.dateStats && type === 'date') {
        return this.generateRealisticDate(analysis.dateStats);
      }

      // For string data, use patterns and samples
      if (analysis.stringPatterns && analysis.sampleValues) {
        return this.generateRealisticString(analysis.stringPatterns, analysis.sampleValues, type, subtype, fieldName);
      }

      // For any type, use sample values as fallback
      if (analysis.sampleValues && analysis.sampleValues.length > 0) {
        return faker.helpers.arrayElement(analysis.sampleValues);
      }

      return null;
    } catch (error) {
      console.error('Error generating realistic value:', error);
      return null;
    }
  }

  /**
   * Weighted random sampling based on value distribution
   */
  private static weightedSample(distribution: Record<string, number>): unknown {
    const entries = Object.entries(distribution);
    const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const [value, weight] of entries) {
      random -= weight;
      if (random <= 0) {
        // Try to preserve original type
        if (!isNaN(Number(value))) return Number(value);
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
      }
    }
    
    return entries[0][0]; // Fallback
  }

  /**
   * Generate realistic numeric values using normal distribution and formatting analysis
   */
  private static generateRealisticNumeric(
    stats: FieldSourceAnalysis['numericStats'], 
    type: string,
    numericFormat?: FieldSourceAnalysis['numericFormat']
  ): number {
    if (!stats) return 0;
    
    // For currency fields, generate more reasonable bounds to avoid extreme values
    let minBound, maxBound;
    
    if (numericFormat?.isCurrency) {
      // For currency, use tighter bounds to avoid extreme values
      const spread = Math.min(stats.stdDev * 1.5, (stats.max - stats.min) / 4);
      minBound = Math.max(stats.min, stats.mean - spread);
      maxBound = Math.min(stats.max, stats.mean + spread);
    } else {
      // Use normal distribution with some bounds
      minBound = Math.max(stats.min, stats.mean - 2 * stats.stdDev);
      maxBound = Math.min(stats.max, stats.mean + 2 * stats.stdDev);
    }
    
    let value = faker.number.float({
      min: minBound,
      max: maxBound
    });

    // Apply formatting based on analysis
    if (numericFormat) {
      if (numericFormat.isInteger) {
        // Round to integer for fields that should be integers
        value = Math.round(value);
      } else if (numericFormat.isCurrency || numericFormat.decimalPlaces > 0) {
        // Round to appropriate decimal places for currency or decimal fields
        value = parseFloat(value.toFixed(numericFormat.decimalPlaces));
      }
    } else {
      // Fallback: if no format analysis, use integer detection based on mean
      if (type === 'number' && Number.isInteger(stats.mean)) {
        value = Math.round(value);
      }
    }

    // Ensure we stay within observed bounds and apply final formatting
    let finalValue = Math.max(stats.min, Math.min(stats.max, value));
    
    // Apply final decimal formatting if it's a currency or decimal field
    if (numericFormat && (numericFormat.isCurrency || numericFormat.decimalPlaces > 0)) {
      finalValue = parseFloat(finalValue.toFixed(numericFormat.decimalPlaces));
    }
    
    return finalValue;
  }

  /**
   * Generate realistic dates within observed range
   */
  private static generateRealisticDate(stats: FieldSourceAnalysis['dateStats']): Date {
    if (!stats) return new Date();
    
    return faker.date.between({
      from: stats.minDate,
      to: stats.maxDate
    });
  }

  /**
   * Generate realistic strings based on patterns and samples
   */
  private static generateRealisticString(
    patterns: FieldSourceAnalysis['stringPatterns'], 
    sampleValues: unknown[], 
    type: string,
    subtype?: string,
    fieldName?: string
  ): string {
    if (!patterns) return faker.lorem.word();

    // Enhanced field name detection for medical and business contexts
    const fieldNameLower = (fieldName || '').toLowerCase();
    
    // Medical field detection
    if (fieldNameLower.includes('doctor') || fieldNameLower.includes('physician') || fieldNameLower.includes('dr')) {
      const titles = ['Dr.', 'Dr.', 'Dr.', 'Prof.', ''];
      const title = faker.helpers.arrayElement(titles);
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      return title ? `${title} ${firstName} ${lastName}` : `${firstName} ${lastName}`;
    }
    
    if (fieldNameLower.includes('hospital') || fieldNameLower.includes('clinic') || fieldNameLower.includes('medical')) {
      const hospitalTypes = [
        'Hospital', 'Medical Center', 'General Hospital', 'Regional Medical Center', 
        'Memorial Hospital', 'Community Hospital', 'Medical Clinic', 'Health Center'
      ];
      const locations = [
        'Central', 'North', 'South', 'East', 'West', 'Downtown', 'Regional', 
        'Metro', 'City', 'University', 'Memorial', 'General', 'Community'
      ];
      const location = faker.helpers.arrayElement(locations);
      const type = faker.helpers.arrayElement(hospitalTypes);
      return `${location} ${type}`;
    }
    
    if (fieldNameLower.includes('department') || fieldNameLower.includes('specialty')) {
      const departments = [
        'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Emergency Medicine',
        'Internal Medicine', 'Surgery', 'Radiology', 'Oncology', 'Psychiatry',
        'Dermatology', 'Ophthalmology', 'ENT', 'Gastroenterology', 'Endocrinology'
      ];
      return faker.helpers.arrayElement(departments);
    }

    // For specific types, still use faker but constrain to realistic patterns
    if (type === 'email') {
      // Use a sample email domain if available
      const emailSamples = sampleValues.filter(v => 
        typeof v === 'string' && v.includes('@')
      ) as string[];
      
      if (emailSamples.length > 0) {
        const sampleEmail = faker.helpers.arrayElement(emailSamples);
        const domain = sampleEmail.split('@')[1];
        return faker.internet.email({ provider: domain });
      }
      return faker.internet.email();
    }

    if (type === 'phone') {
      // Use realistic phone patterns
      const phoneSamples = sampleValues.filter(v => 
        typeof v === 'string' && /[\d\-\(\)\s]/.test(v)
      ) as string[];
      
      if (phoneSamples.length > 0) {
        const sample = faker.helpers.arrayElement(phoneSamples);
        // Replace digits while keeping format
        return sample.replace(/\d/g, () => String(faker.number.int({ min: 0, max: 9 })));
      }
      return faker.phone.number();
    }

    if (type === 'name') {
      if (subtype === 'firstName') return faker.person.firstName();
      if (subtype === 'lastName') return faker.person.lastName();
      return faker.person.fullName();
    }

    // If we have good sample values, use them more frequently
    const stringSamples = sampleValues.filter(v => typeof v === 'string') as string[];
    if (stringSamples.length > 0 && Math.random() < 0.3) {
      // 30% chance to use a variation of existing sample
      const sample = faker.helpers.arrayElement(stringSamples);
      
      // For shorter strings, just use samples directly more often
      if (sample.length <= 15) {
        return sample;
      }
      
      // For longer strings, create variations
      const words = sample.split(' ');
      if (words.length > 1) {
        // Shuffle words or use partial combinations
        const shuffled = faker.helpers.shuffle(words);
        return shuffled.slice(0, Math.max(1, Math.ceil(words.length / 2))).join(' ');
      }
    }

    // For generic text, try to match length and use prefixes/suffixes
    const targetLength = Math.round(patterns.averageLength);
    let generatedText = faker.lorem.word();
    
    // Apply common prefix if available
    if (patterns.commonPrefixes && patterns.commonPrefixes.length > 0) {
      const prefix = faker.helpers.arrayElement(patterns.commonPrefixes);
      generatedText = prefix + generatedText.substring(prefix.length);
    }
    
    // Apply common suffix if available
    if (patterns.commonSuffixes && patterns.commonSuffixes.length > 0) {
      const suffix = faker.helpers.arrayElement(patterns.commonSuffixes);
      generatedText = generatedText.substring(0, generatedText.length - suffix.length) + suffix;
    }
    
    // Adjust length to match average
    if (generatedText.length < targetLength) {
      generatedText += faker.lorem.word().substring(0, targetLength - generatedText.length);
    } else if (generatedText.length > targetLength) {
      generatedText = generatedText.substring(0, targetLength);
    }
    
    return generatedText;
  }

  private static generateFieldValue(fieldDef: FieldDefinition, fieldName?: string): unknown {
    const { type, subtype, constraints, sourceAnalysis } = fieldDef;

    // If we have source analysis, use it for more realistic generation
    if (sourceAnalysis) {
      const realisticValue = this.generateRealisticValue(type, sourceAnalysis, subtype, fieldName);
      if (realisticValue !== null) {
        // Additional safety check for currency formatting
        if (subtype === 'currency' && typeof realisticValue === 'number') {
          return parseFloat(realisticValue.toFixed(2));
        }
        return realisticValue;
      }
    }

    // Fallback to standard generation
    switch (type) {
      case 'name':
        if (subtype === 'firstName') return faker.person.firstName();
        if (subtype === 'lastName') return faker.person.lastName();
        if (subtype === 'fullName') return faker.person.fullName();
        return faker.person.fullName();

      case 'email':
        return faker.internet.email();

      case 'phone':
        if (subtype === 'international') return faker.phone.number();
        return faker.phone.number();

      case 'address':
        if (subtype === 'street') return faker.location.streetAddress();
        if (subtype === 'city') return faker.location.city();
        if (subtype === 'state') return faker.location.state();
        if (subtype === 'zipCode') return faker.location.zipCode();
        if (subtype === 'country') return faker.location.country();
        return faker.location.streetAddress() + ', ' + faker.location.city() + ', ' + faker.location.state() + ' ' + faker.location.zipCode();

      case 'ssn':
        return faker.number.int({ min: 100000000, max: 999999999 }).toString().replace(/(\d{3})(\d{2})(\d{4})/, '$1-$2-$3');

      case 'creditCard':
        if (subtype === 'visa') return faker.finance.creditCardNumber('visa');
        if (subtype === 'mastercard') return faker.finance.creditCardNumber('mastercard');
        return faker.finance.creditCardNumber();

      case 'date':
        if (constraints?.min && constraints?.max) {
          return faker.date.between({ from: new Date(constraints.min), to: new Date(constraints.max) });
        }
        if (subtype === 'birthDate') return faker.date.birthdate();
        if (subtype === 'recent') return faker.date.recent();
        if (subtype === 'future') return faker.date.future();
        return faker.date.past();

      case 'number':
        if (subtype === 'currency') {
          // Currency fields should generate decimal values
          const min = constraints?.min !== undefined ? constraints.min : 0;
          const max = constraints?.max !== undefined ? constraints.max : 1000;
          const value = faker.number.float({ min, max });
          return parseFloat(value.toFixed(2)); // Currency with 2 decimal places
        }
        
        if (subtype === 'integer') {
          // Integer fields should generate whole numbers
          const min = constraints?.min !== undefined ? constraints.min : 1;
          const max = constraints?.max !== undefined ? constraints.max : 1000;
          return faker.number.int({ min, max });
        }
        
        // Default number generation
        if (constraints?.min !== undefined && constraints?.max !== undefined) {
          return faker.number.int({ min: constraints.min, max: constraints.max });
        }
        return faker.number.int();

      case 'text':
        if (subtype === 'sentence') return faker.lorem.sentence();
        if (subtype === 'paragraph') return faker.lorem.paragraph();
        if (subtype === 'word') return faker.lorem.word();
        if (constraints?.options) {
          return faker.helpers.arrayElement(constraints.options);
        }
        return faker.lorem.words(3);

      case 'boolean':
        return faker.datatype.boolean();

      case 'uuid':
        return faker.string.uuid();

      default:
        return faker.lorem.word();
    }
  }

  private static async saveDataToFile(records: Record<string, unknown>[], dataset: SyntheticDataset): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${dataset.name}_${timestamp}.${dataset.outputFormat}`;
    
    // Check if we're in a production/serverless environment
    const isProduction = process.env.NODE_ENV === 'production';
    const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
    
    let content: string;

    switch (dataset.outputFormat) {
      case 'json':
        content = JSON.stringify(records, null, 2);
        break;

      case 'csv':
        if (records.length === 0) {
          content = '';
        } else {
          const headers = Object.keys(records[0]);
          const csvHeaders = headers.join(',');
          const csvRows = records.map(record => 
            headers.map(header => {
              const value = record[header];
              if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            }).join(',')
          );
          content = [csvHeaders, ...csvRows].join('\n');
        }
        break;

      case 'sql':
        if (records.length === 0) {
          content = '';
        } else {
          const tableName = dataset.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          const headers = Object.keys(records[0]);
          const insertStatements = records.map(record => {
            const values = headers.map(header => {
              const value = record[header];
              if (typeof value === 'string') {
                return `'${value.replace(/'/g, "''")}'`;
              }
              if (value === null || value === undefined) {
                return 'NULL';
              }
              return value;
            });
            return `INSERT INTO ${tableName} (${headers.join(', ')}) VALUES (${values.join(', ')});`;
          });
          content = insertStatements.join('\n');
        }
        break;

      default:
        throw new Error(`Unsupported output format: ${dataset.outputFormat}`);
    }

    // In production/serverless environments, store data in database instead of filesystem
    if (isProduction || isVercel) {
      // Store the generated content in the dataset entity itself
      // This is stored as a virtual path that will be used by the download endpoint
      const virtualPath = `synthetic://${dataset.id}/${filename}`;
      
      // Store the content in a temporary in-memory cache or database
      // For now, we'll store it in the dataset's metadata field
      const db = await getDatabase();
      const repository = db.getRepository(SyntheticDataset);
      
      // Update the dataset with the generated content
      dataset.generatedContent = content;
      dataset.generatedContentSize = content.length;
      await repository.save(dataset);
      
      return virtualPath;
    } else {
      // Development environment - write to filesystem
      const dataDir = join(process.cwd(), 'data', 'synthetic');
      await mkdir(dataDir, { recursive: true });
      const filePath = join(dataDir, filename);
      await writeFile(filePath, content, 'utf8');
      return filePath;
    }
  }

  static async getAllDatasets(): Promise<SyntheticDataset[]> {
    const db = await getDatabase();
    const repository = db.getRepository(SyntheticDataset);
    return repository.find({ order: { createdAt: 'DESC' } });
  }

  static async getDataset(id: string): Promise<SyntheticDataset | null> {
    const db = await getDatabase();
    const repository = db.getRepository(SyntheticDataset);
    return repository.findOne({ where: { id } });
  }

  static async updateDataset(id: string, updates: Partial<SyntheticDataRequest>): Promise<SyntheticDataset> {
    const db = await getDatabase();
    const repository = db.getRepository(SyntheticDataset);
    
    const dataset = await repository.findOne({ where: { id } });
    if (!dataset) {
      throw new Error('Dataset not found');
    }
    
    // Update allowed fields
    if (updates.name) dataset.name = updates.name;
    if (updates.description) dataset.description = updates.description;
    if (updates.recordCount) dataset.recordCount = updates.recordCount;
    if (updates.schema) dataset.schema = updates.schema as Record<string, unknown>;
    // outputFormat is a readonly getter
    if (updates.configuration) {
      // configuration is stored in parameters column as JSON string
      dataset.parameters = JSON.stringify(updates.configuration);
    }
    
    // Reset status if configuration changes
    if (updates.schema || updates.recordCount) {
      dataset.status = 'draft';
      // filePath and errorMessage are readonly getters
    }
    
    await repository.save(dataset);
    return dataset;
  }

  static async deleteDataset(id: string): Promise<void> {
    const db = await getDatabase();
    const datasetRepository = db.getRepository(SyntheticDataset);
    const jobRepository = db.getRepository(SyntheticDataJob);
    
    // Get dataset to check for files
    const dataset = await datasetRepository.findOne({ where: { id } });
    
    // Delete associated files if they exist (only for non-virtual paths)
    if (dataset?.filePath && !dataset.filePath.startsWith('synthetic://')) {
      try {
        const { unlink } = await import('fs/promises');
        await unlink(dataset.filePath);
      } catch (error) {
        console.warn('Could not delete dataset file:', dataset.filePath, error);
      }
    }
    
    // Delete associated jobs (cascade delete should handle this, but being explicit)
    await jobRepository.delete({ datasetId: id });
    
    // Delete the dataset
    await datasetRepository.delete(id);
  }

  // Job management methods
  static async getAllJobs(): Promise<SyntheticDataJob[]> {
    const db = await getDatabase();
    const repository = db.getRepository(SyntheticDataJob);
    return repository.find({ 
      relations: ['dataset'],
      order: { startTime: 'DESC' } 
    });
  }

  static async getJob(id: string): Promise<SyntheticDataJob | null> {
    const db = await getDatabase();
    const repository = db.getRepository(SyntheticDataJob);
    return repository.findOne({ 
      where: { id },
      relations: ['dataset']
    });
  }

  static async getJobsForDataset(datasetId: string): Promise<SyntheticDataJob[]> {
    const db = await getDatabase();
    const repository = db.getRepository(SyntheticDataJob);
    return repository.find({ 
      where: { datasetId },
      order: { startTime: 'DESC' } 
    });
  }

  static async deleteJob(id: string): Promise<void> {
    const db = await getDatabase();
    const repository = db.getRepository(SyntheticDataJob);
    await repository.delete(id);
  }

  /**
   * Generate preview data without saving to database - returns small sample for UI preview
   */
  static async generatePreviewData(datasetId: string, maxRecords: number = 5): Promise<{ records: Record<string, unknown>[]; schema: DataSchema; dataset: { name: string; recordCount: number } }> {
    const db = await getDatabase();
    const datasetRepository = db.getRepository(SyntheticDataset);

    const dataset = await datasetRepository.findOne({ where: { id: datasetId } });
    if (!dataset) {
      throw new Error('Dataset not found');
    }

    // Configure faker with seed for consistent preview if available
    if (dataset.configuration?.seed) {
      faker.seed(dataset.configuration.seed as number);
    }

    const records: Record<string, unknown>[] = [];
    const schema = dataset.schema as DataSchema;

    // Generate the specified number of preview records
    for (let i = 0; i < maxRecords; i++) {
      const record: Record<string, unknown> = {};
      
      for (const [fieldName, fieldDef] of Object.entries(schema)) {
        record[fieldName] = this.generateFieldValue(fieldDef as FieldDefinition, fieldName);
      }
      
      records.push(record);
    }

    return {
      records,
      schema,
      dataset: {
        name: dataset.name,
        recordCount: dataset.recordCount
      }
    };
  }

  // Predefined schema templates
  static getSchemaTemplates(): Record<string, DataSchema> {
    return {
      'users': {
        id: { type: 'uuid' },
        firstName: { type: 'name', subtype: 'firstName' },
        lastName: { type: 'name', subtype: 'lastName' },
        email: { type: 'email' },
        phone: { type: 'phone' },
        dateOfBirth: { type: 'date', subtype: 'birthDate' },
        address: { type: 'address' },
        city: { type: 'address', subtype: 'city' },
        state: { type: 'address', subtype: 'state' },
        zipCode: { type: 'address', subtype: 'zipCode' }
      },
      'financial': {
        id: { type: 'uuid' },
        accountNumber: { type: 'number', constraints: { min: 1000000000, max: 9999999999 } },
        routingNumber: { type: 'number', constraints: { min: 100000000, max: 999999999 } },
        creditCardNumber: { type: 'creditCard' },
        ssn: { type: 'ssn' },
        income: { type: 'number', constraints: { min: 20000, max: 200000 } },
        creditScore: { type: 'number', constraints: { min: 300, max: 850 } },
        accountType: { type: 'text', constraints: { options: ['checking', 'savings', 'credit', 'investment'] } }
      },
      'medical': {
        id: { type: 'uuid' },
        patientId: { type: 'number', constraints: { min: 100000, max: 999999 } },
        firstName: { type: 'name', subtype: 'firstName' },
        lastName: { type: 'name', subtype: 'lastName' },
        dateOfBirth: { type: 'date', subtype: 'birthDate' },
        gender: { type: 'text', constraints: { options: ['Male', 'Female', 'Other'] } },
        bloodType: { type: 'text', constraints: { options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] } },
        allergies: { type: 'text', subtype: 'sentence' },
        medications: { type: 'text', subtype: 'sentence' },
        emergencyContact: { type: 'phone' }
      },
      'employees': {
        id: { type: 'uuid' },
        employeeId: { type: 'number', constraints: { min: 1000, max: 9999 } },
        firstName: { type: 'name', subtype: 'firstName' },
        lastName: { type: 'name', subtype: 'lastName' },
        email: { type: 'email' },
        department: { type: 'text', constraints: { options: ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'] } },
        position: { type: 'text', subtype: 'sentence' },
        salary: { type: 'number', constraints: { min: 40000, max: 150000 } },
        hireDate: { type: 'date', subtype: 'past' },
        manager: { type: 'name', subtype: 'fullName' }
      }
    };
  }
}