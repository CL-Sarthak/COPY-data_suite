import { NextResponse } from 'next/server';
import { SyntheticDataService } from '@/services/syntheticDataService';

// GET /api/synthetic/templates - Get predefined schema templates
export async function GET() {
  try {
    const templates = SyntheticDataService.getSchemaTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching schema templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schema templates' },
      { status: 500 }
    );
  }
}