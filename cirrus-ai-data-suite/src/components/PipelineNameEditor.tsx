'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface PipelineNameEditorProps {
  name: string;
  description?: string;
  onNameChange: (name: string, description?: string) => void;
  onCancel?: () => void;
  className?: string;
  showDescription?: boolean;
  maxNameLength?: number;
  maxDescriptionLength?: number;
  placeholder?: string;
  size?: 'small' | 'medium' | 'large';
}

export default function PipelineNameEditor({
  name,
  description = '',
  onNameChange,
  onCancel,
  className = '',
  showDescription = false,
  maxNameLength = 100,
  maxDescriptionLength = 500,
  placeholder = 'Enter pipeline name...',
  size = 'medium'
}: PipelineNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editDescription, setEditDescription] = useState(description || '');
  const [error, setError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  // Size configurations
  const sizeConfig = {
    small: {
      nameClass: 'text-sm font-medium',
      inputClass: 'text-sm px-2 py-1',
      buttonClass: 'w-6 h-6',
      iconClass: 'w-3 h-3'
    },
    medium: {
      nameClass: 'text-lg font-semibold',
      inputClass: 'text-lg px-3 py-2',
      buttonClass: 'w-8 h-8',
      iconClass: 'w-4 h-4'
    },
    large: {
      nameClass: 'text-xl font-bold',
      inputClass: 'text-xl px-4 py-3',
      buttonClass: 'w-10 h-10',
      iconClass: 'w-5 h-5'
    }
  };

  const config = sizeConfig[size];

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditing]);

  // Validate name
  const validateName = (newName: string): string | null => {
    if (!newName.trim()) {
      return 'Pipeline name cannot be empty';
    }
    if (newName.length > maxNameLength) {
      return `Pipeline name must be ${maxNameLength} characters or less`;
    }
    if (newName.trim() !== newName) {
      return 'Pipeline name cannot start or end with spaces';
    }
    // Check for invalid characters
    if (!/^[a-zA-Z0-9\s\-_().]+$/.test(newName)) {
      return 'Pipeline name can only contain letters, numbers, spaces, hyphens, underscores, and parentheses';
    }
    return null;
  };

  // Validate description
  const validateDescription = (desc: string): string | null => {
    if (desc.length > maxDescriptionLength) {
      return `Description must be ${maxDescriptionLength} characters or less`;
    }
    return null;
  };

  // Start editing
  const handleStartEdit = () => {
    setEditName(name);
    setEditDescription(description || '');
    setError(null);
    setIsEditing(true);
  };

  // Save changes
  const handleSave = () => {
    const nameError = validateName(editName);
    const descError = showDescription ? validateDescription(editDescription) : null;
    
    if (nameError) {
      setError(nameError);
      return;
    }
    
    if (descError) {
      setError(descError);
      return;
    }

    const trimmedName = editName.trim();
    const trimmedDescription = editDescription.trim();

    // Only save if something actually changed
    if (trimmedName !== name || (showDescription && trimmedDescription !== description)) {
      onNameChange(trimmedName, showDescription ? trimmedDescription : undefined);
    }
    
    setIsEditing(false);
    setError(null);
  };

  // Cancel editing
  const handleCancel = () => {
    setEditName(name);
    setEditDescription(description || '');
    setError(null);
    setIsEditing(false);
    
    if (onCancel) {
      onCancel();
    }
  };

  // Handle key presses
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Name Input */}
        <div className="flex items-center gap-2">
          <input
            ref={nameInputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyPress}
            className={`flex-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${config.inputClass}`}
            placeholder={placeholder}
            maxLength={maxNameLength}
          />
          
          {/* Action Buttons */}
          <button
            onClick={handleSave}
            className={`flex items-center justify-center bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors ${config.buttonClass}`}
            title="Save changes"
          >
            <CheckIcon className={config.iconClass} />
          </button>
          
          <button
            onClick={handleCancel}
            className={`flex items-center justify-center bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors ${config.buttonClass}`}
            title="Cancel editing"
          >
            <XMarkIcon className={config.iconClass} />
          </button>
        </div>

        {/* Description Input */}
        {showDescription && (
          <textarea
            ref={descriptionInputRef}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Enter pipeline description (optional)..."
            rows={2}
            maxLength={maxDescriptionLength}
          />
        )}

        {/* Character Count */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>{editName.length}/{maxNameLength}</span>
          {showDescription && (
            <span>{editDescription.length}/{maxDescriptionLength}</span>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {/* Keyboard Shortcuts Help */}
        <div className="text-xs text-gray-400">
          Press Enter to save, Esc to cancel
        </div>
      </div>
    );
  }

  // Display mode
  return (
    <div className={`group flex items-start gap-2 ${className}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className={`text-gray-900 truncate ${config.nameClass}`}>
            {name || 'Untitled Pipeline'}
          </h1>
          
          <button
            onClick={handleStartEdit}
            className={`opacity-0 group-hover:opacity-100 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-md transition-all ${config.buttonClass}`}
            title="Rename pipeline"
          >
            <PencilIcon className={config.iconClass} />
          </button>
        </div>
        
        {showDescription && description && (
          <p className="text-gray-600 text-sm mt-1 line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}