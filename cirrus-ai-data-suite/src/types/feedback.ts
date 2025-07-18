// Client-safe feedback types

export type FeedbackType = 'positive' | 'negative';
export type FeedbackContext = 'annotation' | 'review' | 'export';

export interface FeedbackData {
  patternId: string;
  feedbackType: FeedbackType;
  context: FeedbackContext;
  matchedText: string;
  originalConfidence?: number;
  dataSourceId?: string;
}