'use client';

import React from 'react';

interface DemoWatermarkProps {
  /** Optional text to display in the watermark (default: "DEMO") */
  text?: string;
  /** Optional opacity for the watermark (default: 0.03) */
  opacity?: number;
  /** Optional size of the watermark pattern (default: 200) */
  patternSize?: number;
  /** Optional font size for the watermark text (default: 40) */
  fontSize?: number;
}

/**
 * DemoWatermark component adds a diagonal repeating text watermark pattern
 * to indicate demo/preview content. Place this as the first child of AppLayout.
 */
export function DemoWatermark({
  text = 'DEMO',
  opacity = 0.03,
  patternSize = 200,
  fontSize = 40
}: DemoWatermarkProps) {
  const svgUrl = `data:image/svg+xml,%3Csvg width='${patternSize}' height='${patternSize}' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-family='Arial, sans-serif' font-size='${fontSize}' font-weight='bold' fill='%23000000' fill-opacity='${opacity}' transform='rotate(-45 ${patternSize/2} ${patternSize/2})'%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`;

  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      style={{
        backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent ${patternSize}px,
          rgba(0, 0, 0, ${opacity}) ${patternSize}px,
          rgba(0, 0, 0, ${opacity}) ${patternSize * 2}px
        )`
      }}
    >
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `url("${svgUrl}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: `${patternSize}px ${patternSize}px`
        }}
      />
    </div>
  );
}

/**
 * DemoBadge component for adding a badge next to page titles
 */
export function DemoBadge({
  text = 'DEMO',
  colorClasses = 'bg-orange-100 text-orange-800 border-orange-300'
}: {
  text?: string;
  colorClasses?: string;
}) {
  return (
    <span className={`px-3 py-1 ${colorClasses} text-sm font-bold rounded-full border`}>
      {text}
    </span>
  );
}

/**
 * Hook to easily add demo watermark to any page
 * Returns props to spread on your main content div
 */
export function useDemoPage() {
  return {
    className: 'relative z-10',
    style: { position: 'relative' as const, zIndex: 10 }
  };
}