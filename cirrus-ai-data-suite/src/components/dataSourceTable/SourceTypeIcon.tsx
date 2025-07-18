import React from 'react';
import { DataSource } from '@/types/discovery';
import {
  ServerIcon,
  CloudIcon,
  CircleStackIcon,
  GlobeAltIcon,
  FolderIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';

interface SourceTypeIconProps {
  type: DataSource['type'];
  className?: string;
}

export function SourceTypeIcon({ type, className = "h-4 w-4" }: SourceTypeIconProps) {
  switch (type) {
    case 'database': 
      return <CircleStackIcon className={className} />;
    case 's3':
    case 'azure':
    case 'gcp': 
      return <CloudIcon className={className} />;
    case 'api': 
      return <GlobeAltIcon className={className} />;
    case 'filesystem': 
      return <FolderIcon className={className} />;
    case 'json_transformed': 
      return <ArrowsRightLeftIcon className={className} />;
    default: 
      return <ServerIcon className={className} />;
  }
}