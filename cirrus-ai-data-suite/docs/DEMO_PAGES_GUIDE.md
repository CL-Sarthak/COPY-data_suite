# Demo Pages Guide

This guide explains how to create demo pages in the Cirrus Data Suite application. Demo pages are useful for showcasing new features, creating sales demonstrations, or testing UI concepts with realistic but non-production data.

## Quick Start

To create a demo page with watermark and badge:

```tsx
'use client';

import AppLayout from '@/components/AppLayout';
import { DemoWatermark, DemoBadge, useDemoPage } from '@/components/DemoWatermark';

export default function YourDemoPage() {
  const demoPageProps = useDemoPage();

  return (
    <AppLayout>
      <DemoWatermark />
      
      <div className="p-8" {...demoPageProps}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Your Feature Name</h1>
            <DemoBadge />
          </div>
          {/* Your demo content here */}
        </div>
      </div>
    </AppLayout>
  );
}
```

## Components

### DemoWatermark

Adds a diagonal "DEMO" text pattern across the entire viewport as a watermark.

```tsx
<DemoWatermark 
  text="DEMO"        // Text to display (default: "DEMO")
  opacity={0.03}     // Opacity of watermark (default: 0.03)
  patternSize={200}  // Size of pattern tile in pixels (default: 200)
  fontSize={40}      // Font size of watermark text (default: 40)
/>
```

The watermark:
- Covers the full viewport (including behind navigation)
- Stays fixed in place during scrolling
- Uses very low opacity to not interfere with content
- Cannot be interacted with (pointer-events: none)

### DemoBadge

An orange badge component to place next to page titles or sections.

```tsx
<DemoBadge 
  text="DEMO"                                              // Badge text (default: "DEMO")
  colorClasses="bg-orange-100 text-orange-800 border-orange-300"  // Tailwind classes for colors
/>
```

### useDemoPage Hook

Returns props to apply to your main content container to ensure proper z-index layering.

```tsx
const demoPageProps = useDemoPage();
// Returns: { className: 'relative z-10', style: { position: 'relative', zIndex: 10 } }
```

## Best Practices

1. **Consistent Placement**: Always place `<DemoWatermark />` as the first child after `<AppLayout>`

2. **Content Container**: Apply `{...demoPageProps}` to your main content div to ensure it appears above the watermark

3. **Visual Indicators**: Add `<DemoBadge />` next to your page title for clear identification

4. **Realistic Data**: Use realistic but clearly fictional data (e.g., "Acme Corporation", "John Demo")

5. **Clear Labeling**: Make it obvious this is demonstration content, not production data

## Example: Full Demo Page

Here's a complete example showing a feature demo:

```tsx
'use client';

import AppLayout from '@/components/AppLayout';
import { DemoWatermark, DemoBadge, useDemoPage } from '@/components/DemoWatermark';
import { useState } from 'react';

export default function AdvancedAnalyticsDemoPage() {
  const demoPageProps = useDemoPage();
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  return (
    <AppLayout>
      <DemoWatermark />
      
      <div className="p-8" {...demoPageProps}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                Advanced Analytics Dashboard
              </h1>
              <DemoBadge />
            </div>
            <p className="text-gray-600 mt-2">
              AI-powered insights for your business metrics
            </p>
          </div>

          {/* Demo Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Revenue Trends</h3>
              <p className="text-3xl font-bold text-green-600">$1.2M</p>
              <p className="text-sm text-gray-500">+15% from last month</p>
            </div>
            {/* More demo widgets... */}
          </div>

          {/* Demo Notice */}
          <div className="mt-8 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              <strong>Demo Mode:</strong> This page shows sample data for demonstration purposes.
              All metrics and insights are simulated.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
```

## Customization Options

### Different Watermark Text

For specific demos, you might want different watermark text:

```tsx
<DemoWatermark text="PREVIEW" opacity={0.05} />
<DemoWatermark text="SAMPLE" fontSize={50} />
<DemoWatermark text="TEST" patternSize={150} />
```

### Custom Badge Colors

Match your brand or indicate different demo types:

```tsx
<DemoBadge text="BETA" colorClasses="bg-blue-100 text-blue-800 border-blue-300" />
<DemoBadge text="PREVIEW" colorClasses="bg-purple-100 text-purple-800 border-purple-300" />
<DemoBadge text="SAMPLE" colorClasses="bg-green-100 text-green-800 border-green-300" />
```

## Current Demo Pages

- `/compliance` - LockThreat GRC integration demo showing compliance management

## Tips for Creating Effective Demos

1. **Tell a Story**: Create demo data that tells a compelling story about your feature
2. **Show Best Case**: Demonstrate the ideal scenario and full capabilities
3. **Include Variety**: Show different states, types, and edge cases
4. **Keep it Professional**: Use professional language and realistic business scenarios
5. **Document Assumptions**: Note any assumptions or prerequisites for the demo

## Troubleshooting

**Watermark not visible**: Ensure you're using `<DemoWatermark />` as a direct child of `<AppLayout>`

**Content appears behind watermark**: Make sure to spread `{...demoPageProps}` on your content container

**Watermark too prominent**: Adjust the `opacity` prop (try 0.02 or 0.01 for subtler effect)

**Badge styling issues**: Check that Tailwind classes are being properly applied and not overridden