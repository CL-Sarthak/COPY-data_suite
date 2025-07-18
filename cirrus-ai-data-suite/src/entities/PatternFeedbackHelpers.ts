// Helper types and functions for PatternFeedback entity

export interface PatternFeedbackMetadata {
  fieldName?: string;
  recordIndex?: number;
  detectionMethod?: string;
  appliedRefinements?: string[];
}

export function serializeMetadata(metadata: PatternFeedbackMetadata | null | undefined): string {
  return metadata ? JSON.stringify(metadata) : '';
}

export function deserializeMetadata(metadataString: string | null | undefined): PatternFeedbackMetadata | null {
  if (!metadataString) return null;
  try {
    return JSON.parse(metadataString) as PatternFeedbackMetadata;
  } catch {
    return null;
  }
}