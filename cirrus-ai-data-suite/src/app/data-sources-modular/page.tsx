'use client';

import AppLayout from '@/components/AppLayout';
import { DataSourcesFeature } from '@/features/data-sources';

export default function DataSourcesModularPage() {
  return (
    <AppLayout>
      <DataSourcesFeature />
    </AppLayout>
  );
}