// Import and re-export types
import type { Pattern } from '@/services/patternService';
import type { FileData, SensitivePattern } from '@/types';
import type { TestResult as ImportedTestResult, RedactionStyle as ImportedRedactionStyle } from '@/services/patternTestingService';

export type { Pattern };
export type { FileData, SensitivePattern };
export type TestResult = ImportedTestResult;
export type RedactionStyle = ImportedRedactionStyle;

// Component-specific types
export interface PatternFilterTab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface PatternTestState {
  testText: string;
  testResult: TestResult | null;
  testing: boolean;
  currentRedactionStyle: RedactionStyle;
  showRedactedOnly: boolean;
}

export interface AnnotationWrapperProps {
  dataSource: import('@/types/discovery').DataSource;
  patterns: Pattern[];
  onPatternsIdentified: (patterns: SensitivePattern[]) => Promise<void>;
  onBack: () => void;
}