'use client';

import { useState } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import { FeedbackType } from '@/types/feedback';

interface EnhancedFeedbackProps {
  patternId: string;
  patternLabel: string;
  matchedText: string;
  position: { x: number; y: number };
  onClose: () => void;
  onFeedback: (type: FeedbackType, reason?: string) => Promise<void>;
}

export function EnhancedPatternFeedback({
  patternLabel,
  matchedText,
  position,
  onClose,
  onFeedback
}: EnhancedFeedbackProps) {
  const [showReasonForm, setShowReasonForm] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const negativeReasons = {
    wrong_format: 'Wrong format (e.g., missing dashes)',
    missing_context: 'No context indicating sensitive data',
    invalid_data: 'Invalid/test data (e.g., 123456789)',
    not_sensitive: 'Not actually sensitive information',
    too_broad: 'Pattern matching too broadly'
  };

  const handlePositiveFeedback = async () => {
    setIsSubmitting(true);
    await onFeedback('positive');
    setIsSubmitting(false);
    onClose();
  };

  const handleNegativeFeedback = async () => {
    if (!showReasonForm) {
      setShowReasonForm(true);
      return;
    }

    if (!selectedReason) {
      alert('Please select a reason for the negative feedback');
      return;
    }

    setIsSubmitting(true);
    await onFeedback('negative', selectedReason);
    setIsSubmitting(false);
    onClose();
  };

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y - 60}px`,
    zIndex: 1000,
  };

  return (
    <div
      style={style}
      className="bg-white rounded-lg shadow-xl border-2 border-gray-300 p-4 min-w-[300px]"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{patternLabel}</h4>
          <p className="text-sm text-gray-600 mt-1">&ldquo;{matchedText}&rdquo;</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!showReasonForm ? (
        <div>
          <p className="text-sm text-gray-700 mb-3">Is this correctly identified?</p>
          <div className="flex gap-2">
            <button
              onClick={handlePositiveFeedback}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              Yes
            </button>
            <button
              onClick={handleNegativeFeedback}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              <AlertCircle className="w-4 h-4" />
              No
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Why is this incorrect?</p>
          <div className="space-y-2 mb-3">
            {Object.entries(negativeReasons).map(([key, label]) => (
              <label key={key} className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value={key}
                  checked={selectedReason === key}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="mt-1"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowReasonForm(false)}
              className="flex-1 px-3 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleNegativeFeedback}
              disabled={isSubmitting || !selectedReason}
              className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {patternLabel === 'Social Security Number' && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            Valid SSN format: XXX-XX-XXXX with dashes
          </p>
        </div>
      )}
    </div>
  );
}