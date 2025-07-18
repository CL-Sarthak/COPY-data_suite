/**
 * Statistical utility functions for data profiling
 */

export function calculateMean(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

export function calculateMedian(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function calculateMode<T>(values: T[]): T | undefined {
  if (values.length === 0) return undefined;
  
  const frequency: Map<T, number> = new Map();
  let maxFreq = 0;
  let mode = values[0];
  
  for (const value of values) {
    const freq = (frequency.get(value) || 0) + 1;
    frequency.set(value, freq);
    
    if (freq > maxFreq) {
      maxFreq = freq;
      mode = value;
    }
  }
  
  return mode;
}

export function calculateStandardDeviation(values: number[], mean?: number): number | undefined {
  if (values.length < 2) return undefined;
  
  const avg = mean ?? calculateMean(values);
  if (avg === undefined) return undefined;
  
  const squaredDifferences = values.map(val => Math.pow(val - avg, 2));
  const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / (values.length - 1);
  
  return Math.sqrt(variance);
}

export function calculateVariance(values: number[], mean?: number): number | undefined {
  if (values.length < 2) return undefined;
  
  const avg = mean ?? calculateMean(values);
  if (avg === undefined) return undefined;
  
  const squaredDifferences = values.map(val => Math.pow(val - avg, 2));
  return squaredDifferences.reduce((sum, val) => sum + val, 0) / (values.length - 1);
}

export function calculateQuartiles(values: number[]): { q1: number; q2: number; q3: number } | undefined {
  if (values.length < 4) return undefined;
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  const q2 = calculateMedian(sorted) as number;
  const lowerHalf = sorted.slice(0, Math.floor(n / 2));
  const upperHalf = sorted.slice(Math.ceil(n / 2));
  
  const q1 = calculateMedian(lowerHalf) as number;
  const q3 = calculateMedian(upperHalf) as number;
  
  return { q1, q2, q3 };
}

export function calculateSkewness(values: number[], mean?: number, stdDev?: number): number | undefined {
  if (values.length < 3) return undefined;
  
  const avg = mean ?? calculateMean(values);
  const sd = stdDev ?? calculateStandardDeviation(values, avg);
  
  if (!avg || !sd || sd === 0) return undefined;
  
  const n = values.length;
  const cubedDifferences = values.map(val => Math.pow((val - avg) / sd, 3));
  const sum = cubedDifferences.reduce((acc, val) => acc + val, 0);
  
  return (n / ((n - 1) * (n - 2))) * sum;
}

export function calculateKurtosis(values: number[], mean?: number, stdDev?: number): number | undefined {
  if (values.length < 4) return undefined;
  
  const avg = mean ?? calculateMean(values);
  const sd = stdDev ?? calculateStandardDeviation(values, avg);
  
  if (!avg || !sd || sd === 0) return undefined;
  
  const n = values.length;
  const fourthPowers = values.map(val => Math.pow((val - avg) / sd, 4));
  const sum = fourthPowers.reduce((acc, val) => acc + val, 0);
  
  const numerator = n * (n + 1) * sum;
  const denominator = (n - 1) * (n - 2) * (n - 3);
  const correction = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  
  return (numerator / denominator) - correction;
}

/**
 * Detect outliers using Interquartile Range (IQR) method
 */
export function detectOutliersIQR(values: number[], multiplier: number = 1.5): {
  outliers: number[];
  indices: number[];
  bounds: { lower: number; upper: number };
} {
  if (values.length < 4) {
    return { outliers: [], indices: [], bounds: { lower: -Infinity, upper: Infinity } };
  }
  
  const quartiles = calculateQuartiles(values);
  if (!quartiles) {
    return { outliers: [], indices: [], bounds: { lower: -Infinity, upper: Infinity } };
  }
  
  const iqr = quartiles.q3 - quartiles.q1;
  const lowerBound = quartiles.q1 - multiplier * iqr;
  const upperBound = quartiles.q3 + multiplier * iqr;
  
  const outliers: number[] = [];
  const indices: number[] = [];
  
  values.forEach((value, index) => {
    if (value < lowerBound || value > upperBound) {
      outliers.push(value);
      indices.push(index);
    }
  });
  
  return {
    outliers,
    indices,
    bounds: { lower: lowerBound, upper: upperBound }
  };
}

/**
 * Detect outliers using Z-Score method
 */
export function detectOutliersZScore(values: number[], threshold: number = 3): {
  outliers: number[];
  indices: number[];
  zScores: number[];
} {
  if (values.length < 2) {
    return { outliers: [], indices: [], zScores: [] };
  }
  
  const mean = calculateMean(values);
  const stdDev = calculateStandardDeviation(values, mean);
  
  if (!mean || !stdDev || stdDev === 0) {
    return { outliers: [], indices: [], zScores: [] };
  }
  
  const outliers: number[] = [];
  const indices: number[] = [];
  const zScores: number[] = [];
  
  values.forEach((value, index) => {
    const zScore = Math.abs((value - mean) / stdDev);
    zScores.push(zScore);
    
    if (zScore > threshold) {
      outliers.push(value);
      indices.push(index);
    }
  });
  
  return { outliers, indices, zScores };
}

/**
 * Detect outliers using Modified Z-Score method (more robust to outliers)
 */
export function detectOutliersModifiedZScore(values: number[], threshold: number = 3.5): {
  outliers: number[];
  indices: number[];
  modifiedZScores: number[];
} {
  if (values.length < 2) {
    return { outliers: [], indices: [], modifiedZScores: [] };
  }
  
  const median = calculateMedian(values);
  if (!median) {
    return { outliers: [], indices: [], modifiedZScores: [] };
  }
  
  // Calculate Median Absolute Deviation (MAD)
  const deviations = values.map(val => Math.abs(val - median));
  const mad = calculateMedian(deviations);
  
  if (!mad || mad === 0) {
    return { outliers: [], indices: [], modifiedZScores: [] };
  }
  
  const outliers: number[] = [];
  const indices: number[] = [];
  const modifiedZScores: number[] = [];
  
  values.forEach((value, index) => {
    const modifiedZScore = 0.6745 * Math.abs(value - median) / mad;
    modifiedZScores.push(modifiedZScore);
    
    if (modifiedZScore > threshold) {
      outliers.push(value);
      indices.push(index);
    }
  });
  
  return { outliers, indices, modifiedZScores };
}

/**
 * Generate histogram bins for distribution visualization
 */
export function generateHistogramBins(values: number[], binCount: number = 10): {
  bins: Array<{ min: number; max: number; count: number; range: string }>;
  histogram: number[];
  binEdges: number[];
} {
  if (values.length === 0 || binCount <= 0) {
    return { bins: [], histogram: [], binEdges: [] };
  }
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  if (min === max) {
    return {
      bins: [{ min, max, count: values.length, range: `${min}` }],
      histogram: [values.length],
      binEdges: [min, max]
    };
  }
  
  const binWidth = (max - min) / binCount;
  const bins: Array<{ min: number; max: number; count: number; range: string }> = [];
  const histogram: number[] = new Array(binCount).fill(0);
  const binEdges: number[] = [];
  
  // Create bin edges
  for (let i = 0; i <= binCount; i++) {
    binEdges.push(min + i * binWidth);
  }
  
  // Count values in each bin
  values.forEach(value => {
    let binIndex = Math.floor((value - min) / binWidth);
    if (binIndex === binCount) binIndex = binCount - 1; // Handle max value
    histogram[binIndex]++;
  });
  
  // Create bin objects
  for (let i = 0; i < binCount; i++) {
    const binMin = binEdges[i];
    const binMax = binEdges[i + 1];
    bins.push({
      min: binMin,
      max: binMax,
      count: histogram[i],
      range: `${binMin.toFixed(2)} - ${binMax.toFixed(2)}`
    });
  }
  
  return { bins, histogram, binEdges };
}

/**
 * Detect distribution type based on statistical measures
 */
export function detectDistributionType(values: number[], skewness?: number, kurtosis?: number): 
  'normal' | 'skewed-left' | 'skewed-right' | 'bimodal' | 'uniform' | 'unknown' {
  if (values.length < 10) return 'unknown';
  
  const skew = skewness ?? calculateSkewness(values);
  const kurt = kurtosis ?? calculateKurtosis(values);
  
  if (skew === undefined || kurt === undefined) return 'unknown';
  
  // Normal distribution: skewness near 0, kurtosis near 0
  if (Math.abs(skew) < 0.5 && Math.abs(kurt) < 0.5) {
    return 'normal';
  }
  
  // Skewed distributions
  if (skew < -1) return 'skewed-left';
  if (skew > 1) return 'skewed-right';
  
  // Uniform distribution: negative kurtosis
  if (kurt < -1) return 'uniform';
  
  // Simple bimodal detection would require more sophisticated analysis
  // For now, return unknown for complex distributions
  return 'unknown';
}

/**
 * Calculate all statistics for a numeric field
 */
export function calculateFullStatistics(values: number[]): {
  mean?: number;
  median?: number;
  mode?: number;
  standardDeviation?: number;
  variance?: number;
  skewness?: number;
  kurtosis?: number;
  min?: number;
  max?: number;
  quartiles?: { q1: number; q2: number; q3: number };
} {
  if (values.length === 0) {
    return {};
  }
  
  const mean = calculateMean(values);
  const median = calculateMedian(values);
  const mode = calculateMode(values);
  const standardDeviation = calculateStandardDeviation(values, mean);
  const variance = calculateVariance(values, mean);
  const skewness = calculateSkewness(values, mean, standardDeviation);
  const kurtosis = calculateKurtosis(values, mean, standardDeviation);
  const quartiles = calculateQuartiles(values);
  
  return {
    mean,
    median,
    mode,
    standardDeviation,
    variance,
    skewness,
    kurtosis,
    min: Math.min(...values),
    max: Math.max(...values),
    quartiles
  };
}