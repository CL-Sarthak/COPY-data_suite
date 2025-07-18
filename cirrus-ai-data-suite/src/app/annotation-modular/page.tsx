'use client';

import AppLayout from '@/components/AppLayout';
import { AnnotationFeature } from '@/features/annotation';

export default function AnnotationModularPage() {
  return (
    <AppLayout>
      <AnnotationFeature />
    </AppLayout>
  );
}