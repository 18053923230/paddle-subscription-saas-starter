import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  console.log('🟡 [DEBUG API] /api/debug/all-subscriptions called', request);
  console.log('🟡 [DEBUG API] /api/debug/all-subscriptions called');

  try {
    const supabase = await createClient();

    const { data: subscriptions, error } = await supabase
      .from('test_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('🟡 [DEBUG API] Error fetching subscriptions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('🟡 [DEBUG API] All subscriptions result:', {
      count: subscriptions?.length || 0,
      subscriptions: subscriptions,
    });

    return NextResponse.json({
      success: true,
      subscriptions: subscriptions || [],
      count: subscriptions?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('🟡 [DEBUG API] Error in all-subscriptions endpoint:', error);
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
