'use client';

import { useEffect, useState } from 'react';

export type ClassificationLevel = 
  | 'UNCLASSIFIED'
  | 'CUI'
  | 'CONFIDENTIAL'
  | 'SECRET'
  | 'TOP SECRET'
  | 'TOP SECRET//SCI';

// Dissemination Control Markings per DoDM 5200.01
export type DisseminationControl = 
  | 'NOFORN'           // Not Releasable to Foreign Nationals
  | 'REL TO USA'       // Releasable to USA only
  | 'REL TO USA, FVEY' // Five Eyes
  | 'REL TO USA, NATO' // NATO
  | 'FOUO'             // For Official Use Only
  | 'LES'              // Law Enforcement Sensitive
  | 'ORCON'            // Originator Controlled
  | 'PROPIN'           // Proprietary Information
  | 'RELIDO'           // Releasable by Information Disclosure Official
  | 'EXDIS'            // Exclusive Distribution
  | 'NODIS'            // No Distribution
  | 'CLOSE HOLD'       // Close Hold
  | 'TK'               // Talent Keyhole
  | 'HCS'              // HUMINT Control System
  | 'SI'               // Special Intelligence
  | 'GAMMA'            // GAMMA
  | 'CNWDI';           // Critical Nuclear Weapon Design Information

interface ClassificationConfig {
  level: ClassificationLevel;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

const classificationConfigs: Record<ClassificationLevel, ClassificationConfig> = {
  'UNCLASSIFIED': {
    level: 'UNCLASSIFIED',
    backgroundColor: 'bg-green-800', // Darker green for UNCLASSIFIED
    textColor: 'text-white',
    borderColor: 'border-green-900'
  },
  'CUI': {
    level: 'CUI',
    backgroundColor: 'bg-purple-700', // Purple for CUI
    textColor: 'text-white',
    borderColor: 'border-purple-800'
  },
  'CONFIDENTIAL': {
    level: 'CONFIDENTIAL',
    backgroundColor: 'bg-blue-700', // Blue for CONFIDENTIAL
    textColor: 'text-white',
    borderColor: 'border-blue-800'
  },
  'SECRET': {
    level: 'SECRET',
    backgroundColor: 'bg-red-800', // Darker red for SECRET
    textColor: 'text-white',
    borderColor: 'border-red-900'
  },
  'TOP SECRET': {
    level: 'TOP SECRET',
    backgroundColor: 'bg-orange-600', // Orange for TOP SECRET
    textColor: 'text-white',
    borderColor: 'border-orange-700'
  },
  'TOP SECRET//SCI': {
    level: 'TOP SECRET//SCI',
    backgroundColor: 'bg-yellow-400', // Yellow for TS//SCI
    textColor: 'text-black',
    borderColor: 'border-yellow-500'
  }
};

export default function ClassificationBanner() {
  const [classification, setClassification] = useState<ClassificationLevel | null>(null);
  const [markings, setMarkings] = useState<DisseminationControl[]>([]);
  
  useEffect(() => {
    // Get classification from environment variable
    const envClassification = process.env.NEXT_PUBLIC_CLASSIFICATION_LEVEL as ClassificationLevel;
    if (envClassification && classificationConfigs[envClassification]) {
      setClassification(envClassification);
    }
    
    // Get additional markings from environment variable
    const envMarkings = process.env.NEXT_PUBLIC_CLASSIFICATION_MARKINGS;
    if (envMarkings) {
      const markingsList = envMarkings.split(',').map(m => m.trim()) as DisseminationControl[];
      setMarkings(markingsList.filter(m => m)); // Filter out empty strings
    }
  }, []);
  
  // Don't render banner if no classification is set
  if (!classification) {
    return null;
  }
  
  const config = classificationConfigs[classification];
  
  // Build the full classification text with markings
  const fullClassificationText = [
    config.level,
    ...markings
  ].join('//');
  
  return (
    <div 
      className={`
        fixed top-0 left-0 right-0 z-50 
        ${config.backgroundColor} ${config.textColor}
        border-b-2 ${config.borderColor}
        text-center py-1 px-4
        font-bold text-sm tracking-wider
        select-none
      `}
    >
      {fullClassificationText}
    </div>
  );
}