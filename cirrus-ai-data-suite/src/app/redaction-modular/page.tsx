'use client';

import AppLayout from '@/components/AppLayout';
import { RedactionFeature } from '@/features/redaction/RedactionFeature';

export default function RedactionModularPage() {
  return (
    <AppLayout>
      <RedactionFeature />
    </AppLayout>
  );
}