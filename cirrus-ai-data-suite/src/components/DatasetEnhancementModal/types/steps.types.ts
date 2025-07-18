// Workflow steps
export type EnhancementStep = 'analyze' | 'select' | 'enhance' | 'complete';

// Step component props
export interface StepProps {
  onNext: () => void;
  onBack?: () => void;
}

// Analyze step props
export interface AnalyzeStepProps extends StepProps {
  dataSourceName: string;
  onAnalyze: () => Promise<void>;
  analyzing: boolean;
}

// Select fields step props
export interface SelectFieldsStepProps extends StepProps {
  analysis: import('./enhancement.types').DatasetAnalysis;
  selectedFields: Set<string>;
  onToggleField: (fieldName: string) => void;
  onEnhance: () => Promise<void>;
  enhancing: boolean;
}

// Complete step props
export interface CompleteStepProps {
  enhancementResult: import('./enhancement.types').EnhancementResult;
  selectedFieldsCount: number;
  onComplete: () => void;
}