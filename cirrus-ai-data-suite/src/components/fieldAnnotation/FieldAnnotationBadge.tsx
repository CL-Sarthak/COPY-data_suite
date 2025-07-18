import React from 'react';
import { ShieldExclamationIcon, KeyIcon, ChartBarIcon, TagIcon, ClockIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

interface FieldAnnotationBadgeProps {
  semanticType?: string;
  isPII?: boolean;
  piiType?: string;
  sensitivityLevel?: string;
  compact?: boolean;
}

const SEMANTIC_TYPE_CONFIG: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  identifier: { color: 'purple', icon: KeyIcon },
  pii: { color: 'red', icon: ShieldExclamationIcon },
  metric: { color: 'blue', icon: ChartBarIcon },
  dimension: { color: 'green', icon: TagIcon },
  timestamp: { color: 'orange', icon: ClockIcon },
  category: { color: 'indigo', icon: TagIcon },
  text: { color: 'gray', icon: InformationCircleIcon },
  other: { color: 'gray', icon: InformationCircleIcon }
};


export function FieldAnnotationBadge({ 
  semanticType, 
  isPII, 
  piiType, 
  sensitivityLevel,
  compact = true 
}: FieldAnnotationBadgeProps) {
  const badges = [];
  
  // PII Badge (only show if explicitly set)
  if (isPII && piiType) {
    badges.push(
      <span
        key="pii"
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ${
          compact ? '' : 'px-2 py-1'
        }`}
        title={piiType ? `PII: ${piiType}` : 'Contains PII'}
      >
        <ShieldExclamationIcon className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
        {!compact && (piiType || 'PII')}
      </span>
    );
  }
  
  // Semantic Type Badge
  if (semanticType) {
    const config = SEMANTIC_TYPE_CONFIG[semanticType] || SEMANTIC_TYPE_CONFIG.other;
    const Icon = config.icon;
    
    // Map colors to actual Tailwind classes
    const colorClasses: Record<string, string> = {
      purple: 'bg-purple-100 text-purple-800',
      red: 'bg-red-100 text-red-800',
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      orange: 'bg-orange-100 text-orange-800',
      indigo: 'bg-indigo-100 text-indigo-800',
      gray: 'bg-gray-100 text-gray-800'
    };
    
    badges.push(
      <span
        key="semantic"
        className={`inline-flex items-center gap-1 rounded-full text-xs font-medium ${
          colorClasses[config.color] || colorClasses.gray
        } ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}
        title={`Type: ${semanticType}`}
      >
        <Icon className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
        {!compact && semanticType}
      </span>
    );
  }
  
  // Sensitivity Level Badge
  if (sensitivityLevel && sensitivityLevel !== 'internal') {
    // Map sensitivity colors to actual Tailwind classes
    const sensitivityClasses: Record<string, string> = {
      public: 'bg-green-100 text-green-800',
      internal: 'bg-yellow-100 text-yellow-800',
      confidential: 'bg-orange-100 text-orange-800',
      restricted: 'bg-red-100 text-red-800'
    };
    
    badges.push(
      <span
        key="sensitivity"
        className={`inline-flex items-center gap-1 rounded-full text-xs font-medium ${
          sensitivityClasses[sensitivityLevel] || sensitivityClasses.internal
        } ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}
        title={`Sensitivity: ${sensitivityLevel}`}
      >
        {compact ? sensitivityLevel.charAt(0).toUpperCase() : sensitivityLevel}
      </span>
    );
  }

  if (badges.length === 0) return null;
  
  return (
    <div className="inline-flex items-center gap-1">
      {badges}
    </div>
  );
}