'use client';

import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, X, Info } from 'lucide-react';
import { FeedbackType } from '@/types/feedback';

interface FeedbackButtonsProps {
  patternId: string;
  patternLabel: string;
  matchedText: string;
  confidence?: number;
  position: { x: number; y: number };
  onClose: () => void;
  onFeedback: (type: FeedbackType) => void;
}

export function FeedbackButtons({ 
  patternLabel, 
  matchedText, 
  confidence, 
  position, 
  onClose, 
  onFeedback 
}: FeedbackButtonsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Position the feedback UI near the clicked highlight
  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y - 60}px`, // Position above the highlight
    zIndex: 1000,
  };

  const handleFeedback = async (type: FeedbackType) => {
    setIsSubmitting(true);
    await onFeedback(type);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div 
      style={style} 
      className="bg-white rounded-lg shadow-lg border-2 border-gray-600 p-3 min-w-[200px] animate-fadeIn"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">Is this correct?</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      <div className="text-xs text-gray-600 mb-2">
        <div className="font-medium">{patternLabel}</div>
        <div className="truncate" title={matchedText}>&ldquo;{matchedText}&rdquo;</div>
        {confidence && (
          <div className="text-gray-500">Confidence: {Math.round(confidence * 100)}%</div>
        )}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => handleFeedback('positive')}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ThumbsUp className="h-4 w-4" />
          <span className="text-sm font-medium">Yes</span>
        </button>
        <button
          onClick={() => handleFeedback('negative')}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ThumbsDown className="h-4 w-4" />
          <span className="text-sm font-medium">No</span>
        </button>
      </div>
    </div>
  );
}

interface PatternAccuracyBadgeProps {
  patternId: string;
  patternLabel: string;
}

export function PatternAccuracyBadge({ patternId }: PatternAccuracyBadgeProps) {
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccuracy = async () => {
      try {
        const response = await fetch(`/api/patterns/feedback/accuracy?patternId=${patternId}`);
        if (response.ok) {
          const data = await response.json();
          setAccuracy(data.precision);
        }
      } catch (error) {
        console.error('Error fetching pattern accuracy:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccuracy();
  }, [patternId]);

  if (loading || accuracy === null) return null;

  const getAccuracyColor = (acc: number) => {
    if (acc >= 0.9) return 'text-green-600 bg-green-50';
    if (acc >= 0.7) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getAccuracyColor(accuracy)}`}>
      <Info className="h-3 w-3 mr-1" />
      <span>{Math.round(accuracy * 100)}% accurate</span>
    </div>
  );
}

interface FeedbackStatsProps {
  patternId: string;
}

export function FeedbackStats({ patternId }: FeedbackStatsProps) {
  const [stats, setStats] = useState<{
    totalFeedback: number;
    positiveFeedback: number;
    negativeFeedback: number;
  } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/patterns/feedback?patternId=${patternId}`);
        if (response.ok) {
          const data = await response.json();
          setStats({
            totalFeedback: data.total,
            positiveFeedback: data.feedback.filter((f: { feedbackType: string }) => f.feedbackType === 'positive').length,
            negativeFeedback: data.feedback.filter((f: { feedbackType: string }) => f.feedbackType === 'negative').length,
          });
        }
      } catch (error) {
        console.error('Error fetching feedback stats:', error);
      }
    };

    fetchStats();
  }, [patternId]);

  if (!stats || stats.totalFeedback === 0) return null;

  return (
    <div className="text-xs text-gray-500 mt-1">
      <span className="text-green-600">👍 {stats.positiveFeedback}</span>
      {' • '}
      <span className="text-red-600">👎 {stats.negativeFeedback}</span>
    </div>
  );
}