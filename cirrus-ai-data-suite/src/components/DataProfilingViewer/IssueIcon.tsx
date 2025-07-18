import React from 'react';
import { 
  XCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon 
} from '@heroicons/react/24/outline';

interface IssueIconProps {
  type: string;
}

export function IssueIcon({ type }: IssueIconProps) {
  switch (type) {
    case 'critical': 
      return <XCircleIcon className="h-4 w-4 text-red-500" />;
    case 'warning': 
      return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
    default: 
      return <InformationCircleIcon className="h-4 w-4 text-blue-500" />;
  }
}