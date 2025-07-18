import { 
  UserIcon, 
  CreditCardIcon, 
  HeartIcon, 
  ShieldCheckIcon, 
  PuzzlePieceIcon 
} from '@heroicons/react/24/outline';
import { PatternFilterTab } from './types';

export const PATTERN_FILTER_TABS: PatternFilterTab[] = [
  { id: 'all', label: 'All Patterns' },
  { id: 'Personal Information', label: 'Personal Information', icon: UserIcon },
  { id: 'Financial Data', label: 'Financial Data', icon: CreditCardIcon },
  { id: 'Healthcare/HIPAA', label: 'Healthcare/HIPAA', icon: HeartIcon },
  { id: 'Gov Classification', label: 'Gov Classification', icon: ShieldCheckIcon },
  { id: 'Custom', label: 'Custom Pattern', icon: PuzzlePieceIcon }
];