import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  console.log('🟡 [DEBUG API] /api/debug/customers called', request);
  console.log('🟡 [DEBUG API] /api/debug/customers called');

  try {
    const supabase = await createClient();

    const { data: customers, error } = await supabase
      .from('test_customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('🟡 [DEBUG API] Error fetching customers:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('🟡 [DEBUG API] Customers result:', {
      count: customers?.length || 0,
      customers: customers,
    });

    return NextResponse.json({
      success: true,
      customers: customers || [],
      count: customers?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('🟡 [DEBUG API] Error in customers endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
