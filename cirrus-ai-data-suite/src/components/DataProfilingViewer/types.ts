import { DataProfile, FieldProfile } from '@/services/dataProfilingService';

export interface DataProfilingViewerProps {
  sourceId: string;
  onClose: () => void;
}

export interface ProfileViewerState {
  profile: DataProfile | null;
  loading: boolean;
  error: string | null;
  selectedField: string | null;
  searchTerm: string;
  qualityFilter: 'all' | 'excellent' | 'good' | 'fair' | 'poor';
  expandedSections: Set<string>;
}

export interface FieldDetailSidebarProps {
  field: FieldProfile;
  onClose: () => void;
}

export interface QualitySummaryProps {
  profile: DataProfile;
  expanded: boolean;
  onToggle: () => void;
}

export interface QualityIssuesProps {
  profile: DataProfile;
  expanded: boolean;
  onToggle: () => void;
}

export interface FieldAnalysisProps {
  profile: DataProfile;
  expanded: boolean;
  onToggle: () => void;
  selectedField: string | null;
  searchTerm: string;
  qualityFilter: ProfileViewerState['qualityFilter'];
  onFieldSelect: (fieldName: string) => void;
  onSearchChange: (term: string) => void;
  onQualityFilterChange: (filter: ProfileViewerState['qualityFilter']) => void;
}

export interface RecommendationsProps {
  recommendations: string[];
}

export interface LoadingStateProps {
  message?: string;
}

export interface ErrorStateProps {
  error: string;
  onRetry: () => void;
  onClose: () => void;
}

export interface ProfileHeaderProps {
  profile: DataProfile;
  onRefresh: () => void;
  onClose: () => void;
}