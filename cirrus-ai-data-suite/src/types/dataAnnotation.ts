import { FileData, SensitivePattern } from '@/types';
import { RefinedPattern } from '@/services/refinedPatternClient';

export interface DataAnnotationProps {
  data: FileData[];
  onPatternsIdentified: (patterns: SensitivePattern[]) => void;
  onBack: () => void;
  initialPatterns?: SensitivePattern[];
  continueButtonText?: string;
}

export interface FeedbackUIState {
  patternId: string;
  patternLabel: string;
  matchedText: string;
  confidence?: number;
  position: { x: number; y: number };
}

export interface PatternMatch {
  patternId: string;
  patternLabel: string;
  startIndex: number;
  endIndex: number;
  matchedText: string;
  confidence?: number;
  color: string;
  isContextClue?: boolean;
}

export interface PredefinedPattern {
  label: string;
  color: string;
  type: string;
}

export interface AnnotationState {
  selectedText: string;
  selectedPatternId: string;
  patterns: SensitivePattern[];
  customLabel: string;
  showCustomForm: boolean;
  currentDocumentIndex: number;
  highlightedContent: Record<number, string>;
  showFullText: boolean;
  isRunningML: boolean;
  mlHighlightedContent: Record<number, string>;
  showMLHighlights: boolean;
  feedbackUI: FeedbackUIState | null;
  refinedPatterns: RefinedPattern[];
}

export const PREDEFINED_PATTERNS: PredefinedPattern[] = [
  // PII Patterns
  { label: 'Social Security Number', color: 'bg-red-100 text-red-800', type: 'PII' },
  { label: 'Email Address', color: 'bg-blue-100 text-blue-800', type: 'PII' },
  { label: 'Phone Number', color: 'bg-green-100 text-green-800', type: 'PII' },
  { label: 'Address', color: 'bg-emerald-100 text-emerald-800', type: 'PII' },
  { label: 'Driver License', color: 'bg-amber-100 text-amber-800', type: 'PII' },
  { label: 'Passport Number', color: 'bg-teal-100 text-teal-800', type: 'PII' },
  { label: 'Date of Birth', color: 'bg-cyan-100 text-cyan-800', type: 'PII' },
  
  // Financial Patterns
  { label: 'Credit Card Number', color: 'bg-yellow-100 text-yellow-800', type: 'FINANCIAL' },
  { label: 'Bank Account Number', color: 'bg-purple-100 text-purple-800', type: 'FINANCIAL' },
  { label: 'IBAN', color: 'bg-indigo-100 text-indigo-800', type: 'FINANCIAL' },
  { label: 'SWIFT Code', color: 'bg-violet-100 text-violet-800', type: 'FINANCIAL' },
  
  // Healthcare/HIPAA Patterns
  { label: 'Medical Record Number', color: 'bg-pink-100 text-pink-800', type: 'MEDICAL' },
  { label: 'Health Insurance ID', color: 'bg-rose-100 text-rose-800', type: 'MEDICAL' },
  { label: 'Medicare/Medicaid ID', color: 'bg-fuchsia-100 text-fuchsia-800', type: 'MEDICAL' },
  { label: 'Provider NPI', color: 'bg-pink-200 text-pink-900', type: 'MEDICAL' },
  { label: 'Diagnosis Code (ICD)', color: 'bg-rose-200 text-rose-900', type: 'MEDICAL' },
  { label: 'Procedure Code (CPT)', color: 'bg-fuchsia-200 text-fuchsia-900', type: 'MEDICAL' },
  { label: 'Drug NDC', color: 'bg-purple-200 text-purple-900', type: 'MEDICAL' },
  { label: 'Clinical Trial ID', color: 'bg-violet-200 text-violet-900', type: 'MEDICAL' },
  
  // Government/Intelligence Classification
  { label: 'Top Secret', color: 'bg-red-100 text-red-900', type: 'CLASSIFICATION' },
  { label: 'Secret', color: 'bg-red-100 text-red-800', type: 'CLASSIFICATION' },
  { label: 'Confidential', color: 'bg-orange-100 text-orange-800', type: 'CLASSIFICATION' },
  { label: 'NOFORN', color: 'bg-purple-100 text-purple-900', type: 'CLASSIFICATION' },
  { label: 'FOUO', color: 'bg-yellow-100 text-yellow-900', type: 'CLASSIFICATION' },
  { label: 'SCI', color: 'bg-red-200 text-red-900', type: 'CLASSIFICATION' },
  { label: 'SAP', color: 'bg-purple-200 text-purple-900', type: 'CLASSIFICATION' },
  { label: 'Codeword', color: 'bg-indigo-100 text-indigo-900', type: 'CLASSIFICATION' },
  { label: 'ITAR', color: 'bg-orange-200 text-orange-900', type: 'CLASSIFICATION' },
  { label: 'CUI', color: 'bg-amber-200 text-amber-900', type: 'CLASSIFICATION' },
  
  // Business/Corporate
  { label: 'Company Confidential', color: 'bg-orange-100 text-orange-900', type: 'CLASSIFICATION' },
  { label: 'Trade Secret', color: 'bg-violet-100 text-violet-900', type: 'CLASSIFICATION' },
  { label: 'Proprietary', color: 'bg-blue-200 text-blue-900', type: 'CLASSIFICATION' },
];

export const MAX_DISPLAY_LENGTH = 10000;
export const FEEDBACK_STORAGE_KEY = 'patternFeedback';