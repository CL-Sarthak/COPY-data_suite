import { NextRequest, NextResponse } from 'next/server';
import { EnhancedDataProfile, EnhancedFieldProfile } from '@/types/profiling';
import {
  calculateFullStatistics,
  detectOutliersIQR,
  detectOutliersZScore,
  detectOutliersModifiedZScore,
  generateHistogramBins,
  detectDistributionType
} from '@/utils/statisticalUtils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const sampleSize = parseInt(searchParams.get('sampleSize') || '100');
    const includeOutliers = searchParams.get('includeOutliers') !== 'false';
    const includeDistributions = searchParams.get('includeDistributions') !== 'false';
    const outlierMethod = (searchParams.get('outlierMethod') || 'IQR') as 'IQR' | 'Z-Score' | 'Modified-Z-Score';
    const distributionBins = parseInt(searchParams.get('distributionBins') || '10');

    // First, check if data source exists and has transformed data
    const dataSourceCheckResponse = await fetch(`${request.nextUrl.origin}/api/data-sources/${id}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!dataSourceCheckResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Data source not found' },
        { status: 404 }
      );
    }

    const dataSourceInfo = await dataSourceCheckResponse.json();
    
    // Note: We no longer require hasTransformedData flag
    // The transform API can handle both raw and transformed data sources

    // Fetch transformed data using the transform endpoint (skip pagination to get ALL records)
    const transformResponse = await fetch(`${request.nextUrl.origin}/api/data-sources/${id}/transform?skipPagination=true`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!transformResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch transformed data' },
        { status: transformResponse.status }
      );
    }

    const catalog = await transformResponse.json();

    console.log('Enhanced Profile - Transform response:', {
      id,
      hasCatalog: !!catalog,
      catalogKeys: catalog ? Object.keys(catalog) : [],
      recordCount: catalog?.totalRecords || catalog?.records?.length || 0,
      hasRecords: !!(catalog?.records && catalog.records.length > 0),
      sourceName: catalog?.sourceName || dataSourceInfo.name
    });

    // Parse the records from the catalog and extract actual data content
    let records: Record<string, unknown>[] = [];
    try {
      // The transform endpoint returns a catalog object with records
      let catalogRecords: Record<string, unknown>[] = [];
      if (catalog.records && Array.isArray(catalog.records)) {
        catalogRecords = catalog.records;
      } else if (Array.isArray(catalog)) {
        catalogRecords = catalog;
      } else {
        console.error('Unexpected catalog format:', {
          type: typeof catalog,
          isArray: Array.isArray(catalog),
          keys: catalog ? Object.keys(catalog) : []
        });
        return NextResponse.json(
          { success: false, error: 'Invalid catalog format - expected records array' },
          { status: 400 }
        );
      }

      // Extract the actual data content from each record (like basic profile does)
      records = catalogRecords.map(record => {
        // If the record has a 'data' property, use that (UnifiedDataRecord format)
        if (record && typeof record === 'object' && 'data' in record && record.data) {
          return record.data as Record<string, unknown>;
        }
        // Otherwise, use the record as-is
        return record as Record<string, unknown>;
      }).filter(record => record && typeof record === 'object') as Record<string, unknown>[];

      console.log('Enhanced Profile - Extracted data records:', {
        originalRecordCount: catalogRecords.length,
        extractedRecordCount: records.length,
        sampleOriginalRecord: catalogRecords[0] ? Object.keys(catalogRecords[0]) : [],
        sampleExtractedRecord: records[0] ? Object.keys(records[0]) : []
      });
      
      if (records.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid data records found in transformed data' },
          { status: 400 }
        );
      }
    } catch (parseError) {
      console.error('Error parsing catalog data:', parseError);
      return NextResponse.json(
        { success: false, error: `Invalid data format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}` },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No records found in data source' },
        { status: 400 }
      );
    }

    // Generate enhanced profile using ALL records for quality calculations
    // but limit sample records for display
    const profile = await generateEnhancedProfile({
      dataSourceId: id,
      dataSourceName: catalog.sourceName || dataSourceInfo.name || 'Unknown',
      records, // Use ALL records for quality calculations
      sampleSize, // Only used for sample record display
      includeOutliers,
      includeDistributions,
      outlierMethod,
      distributionBins
    });

    return NextResponse.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('Enhanced profile generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

interface GenerateEnhancedProfileParams {
  dataSourceId: string;
  dataSourceName: string;
  records: Record<string, unknown>[];
  sampleSize: number;
  includeOutliers: boolean;
  includeDistributions: boolean;
  outlierMethod: 'IQR' | 'Z-Score' | 'Modified-Z-Score';
  distributionBins: number;
}

async function generateEnhancedProfile(params: GenerateEnhancedProfileParams): Promise<EnhancedDataProfile> {
  const {
    dataSourceId,
    dataSourceName,
    records,
    sampleSize,
    includeOutliers,
    includeDistributions,
    outlierMethod,
    distributionBins
  } = params;

  // Extract field names
  const fieldNames = Array.from(
    new Set(records.flatMap(record => Object.keys(record)))
  );

  // Generate field profiles using ALL records for accurate quality metrics
  const fields: EnhancedFieldProfile[] = await Promise.all(
    fieldNames.map(fieldName => 
      generateFieldProfile({
        fieldName,
        records, // Use ALL records for quality calculations
        includeOutliers,
        includeDistributions,
        outlierMethod,
        distributionBins
      })
    )
  );

  // Calculate overall statistics
  const overallStatistics = calculateOverallStatistics(fields);

  // Get sample records for display only (quality metrics calculated on full dataset)
  const sampleRecords = getSampleRecords(records, sampleSize);

  return {
    dataSourceId,
    dataSourceName,
    profileDate: new Date().toISOString(), // Serialize to string to prevent date serialization issues
    recordCount: records.length,
    fieldCount: fields.length,
    fields,
    overallStatistics,
    sampleRecords
  };
}

interface GenerateFieldProfileParams {
  fieldName: string;
  records: Record<string, unknown>[];
  includeOutliers: boolean;
  includeDistributions: boolean;
  outlierMethod: 'IQR' | 'Z-Score' | 'Modified-Z-Score';
  distributionBins: number;
}

async function generateFieldProfile(params: GenerateFieldProfileParams): Promise<EnhancedFieldProfile> {
  const { fieldName, records, includeOutliers, includeDistributions, outlierMethod, distributionBins } = params;

  // Extract field values
  const allValues = records.map(record => record[fieldName]);
  const nonNullValues = allValues.filter(val => val !== null && val !== undefined && val !== '');
  
  // Determine data type and classification
  const dataType = inferDataType(nonNullValues);
  const dataClassification = inferDataClassification(allValues, dataType);
  
  // Basic counts
  const totalCount = allValues.length;
  const nullCount = totalCount - nonNullValues.length;
  const uniqueCount = new Set(nonNullValues).size;
  const completeness = totalCount > 0 ? ((totalCount - nullCount) / totalCount) * 100 : 0;

  // Get sample data for this field (for display purposes only)
  const sampleData = getSampleData(allValues, 100);

  // Initialize profile
  const profile: EnhancedFieldProfile = {
    fieldName,
    dataType,
    dataClassification,
    statistics: {},
    outliers: {
      count: 0,
      percentage: 0,
      values: [],
      indices: [],
      method: outlierMethod
    },
    distribution: {
      bins: [],
      type: 'unknown',
      histogram: [],
      binEdges: []
    },
    sampleData,
    uniqueCount,
    nullCount,
    totalCount,
    completeness
  };

  // Handle numeric data
  if (dataType === 'numeric') {
    const numericValues = nonNullValues
      .map(val => parseFloat(String(val)))
      .filter(val => !isNaN(val));

    if (numericValues.length > 0) {
      // Calculate statistics
      profile.statistics = calculateFullStatistics(numericValues);

      // Detect outliers
      if (includeOutliers && numericValues.length > 3) {
        let outlierResult;
        switch (outlierMethod) {
          case 'Z-Score':
            outlierResult = detectOutliersZScore(numericValues);
            profile.outliers = {
              count: outlierResult.outliers.length,
              percentage: (outlierResult.outliers.length / numericValues.length) * 100,
              values: outlierResult.outliers,
              indices: outlierResult.indices,
              method: outlierMethod
            };
            break;
          case 'Modified-Z-Score':
            outlierResult = detectOutliersModifiedZScore(numericValues);
            profile.outliers = {
              count: outlierResult.outliers.length,
              percentage: (outlierResult.outliers.length / numericValues.length) * 100,
              values: outlierResult.outliers,
              indices: outlierResult.indices,
              method: outlierMethod
            };
            break;
          default: // IQR
            outlierResult = detectOutliersIQR(numericValues);
            profile.outliers = {
              count: outlierResult.outliers.length,
              percentage: (outlierResult.outliers.length / numericValues.length) * 100,
              values: outlierResult.outliers,
              indices: outlierResult.indices,
              method: outlierMethod,
              bounds: outlierResult.bounds
            };
        }
      }

      // Generate distribution
      if (includeDistributions && numericValues.length > 4) {
        const histogramData = generateHistogramBins(numericValues, distributionBins);
        const distributionType = detectDistributionType(
          numericValues,
          profile.statistics.skewness,
          profile.statistics.kurtosis
        );

        profile.distribution = {
          bins: histogramData.bins.map(bin => ({
            ...bin,
            percentage: (bin.count / numericValues.length) * 100
          })),
          type: distributionType,
          histogram: histogramData.histogram,
          binEdges: histogramData.binEdges
        };
      }
    }
  } else {
    // Handle categorical data
    const categoryCount = new Map<unknown, number>();
    nonNullValues.forEach(value => {
      const count = categoryCount.get(value) || 0;
      categoryCount.set(value, count + 1);
    });

    const categories = Array.from(categoryCount.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: (count / nonNullValues.length) * 100
      }))
      .sort((a, b) => b.count - a.count);

    profile.categoricalAnalysis = {
      categories,
      topCategories: categories.slice(0, 10)
    };

    // Calculate mode for categorical data
    if (categories.length > 0) {
      profile.statistics.mode = categories[0].value;
    }
  }

  return profile;
}

function inferDataType(values: unknown[]): 'numeric' | 'string' | 'boolean' | 'date' | 'mixed' {
  if (values.length === 0) return 'mixed';

  const types = new Set<string>();
  let numericCount = 0;
  let booleanCount = 0;
  let dateCount = 0;

  for (const value of values.slice(0, Math.min(100, values.length))) {
    if (typeof value === 'boolean') {
      booleanCount++;
      types.add('boolean');
    } else if (typeof value === 'number' || (!isNaN(parseFloat(String(value))) && isFinite(parseFloat(String(value))))) {
      numericCount++;
      types.add('numeric');
    } else if (value instanceof Date || !isNaN(Date.parse(String(value)))) {
      dateCount++;
      types.add('date');
    } else {
      types.add('string');
    }
  }

  const totalSampled = Math.min(100, values.length);
  
  if (numericCount / totalSampled > 0.8) return 'numeric';
  if (booleanCount / totalSampled > 0.8) return 'boolean';
  if (dateCount / totalSampled > 0.8) return 'date';
  if (types.size === 1) return Array.from(types)[0] as 'numeric' | 'string' | 'boolean' | 'date';
  
  return 'mixed';
}

function inferDataClassification(values: unknown[], dataType: string): 'categorical' | 'ordinal' | 'numerical' {
  if (dataType === 'numeric') {
    return 'numerical';
  }
  
  if (dataType === 'boolean') {
    return 'categorical';
  }
  
  if (dataType === 'date') {
    return 'ordinal'; // Dates have natural ordering
  }
  
  // For string/mixed types, determine if it's categorical or ordinal
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  const uniqueValues = Array.from(new Set(nonNullValues));
  
  // If very few unique values relative to total, likely categorical
  if (uniqueValues.length <= 10 || uniqueValues.length / nonNullValues.length < 0.05) {
    // Check if values seem to have natural ordering (e.g., "Low", "Medium", "High")
    const ordinalPatterns = [
      /^(low|medium|high)$/i,
      /^(small|medium|large)$/i,
      /^(poor|fair|good|excellent)$/i,
      /^(never|rarely|sometimes|often|always)$/i,
      /^(strongly disagree|disagree|neutral|agree|strongly agree)$/i,
      /^\d+$/  // Numbers as strings
    ];
    
    const hasOrdinalPattern = ordinalPatterns.some(pattern => 
      uniqueValues.some(val => pattern.test(String(val)))
    );
    
    return hasOrdinalPattern ? 'ordinal' : 'categorical';
  }
  
  // Many unique values, likely categorical unless it's clearly ordinal
  return 'categorical';
}

function calculateOverallStatistics(fields: EnhancedFieldProfile[]) {
  if (fields.length === 0) {
    return {
      completeness: 0,
      uniqueness: 0,
      validity: 1,
      consistency: 1
    };
  }

  const totalFields = fields.length;

  // Use the same calculation method as Basic Profile for consistency
  
  // Completeness: Average of individual field completeness scores (already in percentage)
  const completeness = fields.reduce((sum, field) => sum + (field.completeness / 100), 0) / totalFields;
  
  // Consistency: Based on data type consistency (similar to primary type percentage in Basic Profile)
  // For Enhanced Profile, we consider uniform types as 1.0 and mixed types as lower consistency
  const consistency = fields.reduce((sum, field) => {
    // If field has mixed data types, it's less consistent
    if (field.dataType === 'mixed') return sum + 0.6; // Similar to mixed type penalty in Basic Profile
    return sum + 1.0; // Uniform data type
  }, 0) / totalFields;

  // Validity: Based on fields with good data quality (similar to Basic Profile approach)
  // Consider completeness and data type consistency as quality indicators
  const validFields = fields.filter(field => {
    const hasGoodCompleteness = field.completeness >= 80; // At least 80% complete
    const hasUniformType = field.dataType !== 'mixed'; // Uniform data type
    return hasGoodCompleteness && hasUniformType;
  }).length;
  const validity = validFields / totalFields;

  // Uniqueness: Average uniqueness across appropriate fields (exclude boolean fields like Basic Profile)
  const uniquenessFields = fields.filter(field => field.dataType !== 'boolean' && field.totalCount > 1);
  const uniqueness = uniquenessFields.length > 0 
    ? uniquenessFields.reduce((sum, field) => sum + (field.uniqueCount / field.totalCount), 0) / uniquenessFields.length
    : 1;

  return {
    completeness,
    uniqueness,
    validity,
    consistency
  };
}

function getSampleRecords(records: Record<string, unknown>[], sampleSize: number): Record<string, unknown>[] {
  if (records.length <= sampleSize) {
    return records;
  }

  // Random sampling for display purposes only 
  // (Data quality metrics are calculated on the full dataset)
  const indices = new Set<number>();
  while (indices.size < sampleSize) {
    indices.add(Math.floor(Math.random() * records.length));
  }

  return Array.from(indices).map(index => records[index]);
}

function getSampleData(values: unknown[], sampleSize: number): unknown[] {
  if (values.length <= sampleSize) {
    return values;
  }

  // Random sampling for field-level display purposes only
  // (Field statistics are calculated on all values)
  const indices = new Set<number>();
  while (indices.size < sampleSize) {
    indices.add(Math.floor(Math.random() * values.length));
  }

  return Array.from(indices).map(index => values[index]);
}