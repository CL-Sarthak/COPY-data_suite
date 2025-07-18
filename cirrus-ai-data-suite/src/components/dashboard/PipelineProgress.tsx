import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { PipelineStage } from '@/types/dashboard';

interface PipelineProgressProps {
  stages: PipelineStage[];
}

export function PipelineProgress({ stages }: PipelineProgressProps) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Pipeline Progress</h2>
      <div className="flex items-center justify-between">
        {stages.map((stage, idx) => (
          <div key={stage.name} className="flex-1 relative">
            <div 
              className="flex flex-col items-center cursor-pointer group"
              onClick={() => stage.link && router.push(stage.link)}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${
                stage.status === 'completed' ? 'bg-green-100 text-green-600' :
                stage.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                'bg-gray-100 text-gray-400'
              }`}>
                {stage.status === 'completed' ? (
                  <CheckCircleIcon className="h-6 w-6" />
                ) : stage.status === 'in-progress' ? (
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-3 h-3 bg-gray-400 rounded-full" />
                )}
              </div>
              <p className="text-xs font-medium text-gray-900 mt-2 text-center group-hover:text-blue-600">{stage.name}</p>
              <p className="text-xs text-gray-500">{stage.count} {stage.description}</p>
            </div>
            {idx < stages.length - 1 && (
              <div className={`absolute top-6 left-12 w-full h-0.5 ${
                stage.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}