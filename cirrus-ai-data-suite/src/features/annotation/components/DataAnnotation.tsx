import React from 'react';
import { Pattern } from '@/services/patternService';
import { AnnotationData, HighlightedText } from '../types';

interface DataAnnotationProps {
  data: AnnotationData;
  patterns: Pattern[];
}

export function DataAnnotation({ data, patterns }: DataAnnotationProps) {
  const highlightText = (text: string): HighlightedText[] => {
    if (!text || typeof text !== 'string') {
      return [{ text: String(text || ''), isHighlighted: false, startIndex: 0, endIndex: String(text || '').length }];
    }

    const highlights: HighlightedText[] = [];
    let lastIndex = 0;

    // Check each pattern
    patterns.forEach(pattern => {
      const regexStrings: string[] = [];
      
      // Handle single regex string
      if (pattern.regex && pattern.regex.length > 0) {
        regexStrings.push(pattern.regex);
      }
      
      // Handle array of regex patterns
      if (pattern.regexPatterns && pattern.regexPatterns.length > 0) {
        regexStrings.push(...pattern.regexPatterns);
      }
      
      regexStrings.forEach(regexStr => {
        try {
          const regex = new RegExp(regexStr, 'gi');
          let match;
          
          while ((match = regex.exec(text)) !== null) {
            // Add non-highlighted text before match
            if (match.index > lastIndex) {
              highlights.push({
                text: text.substring(lastIndex, match.index),
                isHighlighted: false,
                startIndex: lastIndex,
                endIndex: match.index
              });
            }
            
            // Add highlighted match
            highlights.push({
              text: match[0],
              isHighlighted: true,
              pattern,
              startIndex: match.index,
              endIndex: match.index + match[0].length
            });
            
            lastIndex = match.index + match[0].length;
          }
        } catch (e) {
          console.error('Invalid regex:', regexStr, e);
        }
      });
    });

    // Add remaining text
    if (lastIndex < text.length) {
      highlights.push({
        text: text.substring(lastIndex),
        isHighlighted: false,
        startIndex: lastIndex,
        endIndex: text.length
      });
    }

    // If no highlights, return original text
    if (highlights.length === 0) {
      return [{ text, isHighlighted: false, startIndex: 0, endIndex: text.length }];
    }

    // Sort and merge overlapping highlights
    return highlights.sort((a, b) => a.startIndex - b.startIndex);
  };

  const renderCell = (value: unknown) => {
    const textValue = String(value || '');
    const highlights = highlightText(textValue);

    return (
      <span>
        {highlights.map((segment, idx) => (
          <span
            key={idx}
            className={segment.isHighlighted ? `bg-yellow-200 px-0.5 rounded` : ''}
            title={segment.isHighlighted && segment.pattern ? 
              `${segment.pattern.name} (${segment.pattern.type})` : undefined}
          >
            {segment.text}
          </span>
        ))}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {data.fields.map((field) => (
              <th
                key={field}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {field}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.records.map((record, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              {data.fields.map((field) => (
                <td key={field} className="px-6 py-4 text-sm text-gray-900">
                  {renderCell(record[field])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}