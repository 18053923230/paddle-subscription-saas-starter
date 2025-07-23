import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';

export async function POST(request: NextRequest) {
  console.log('Disable RLS route', request);
  try {
    const supabase = await createClient();

    // 临时禁用RLS进行测试
    const { error: customersError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.test_customers DISABLE ROW LEVEL SECURITY;',
    });

    const { error: subscriptionsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.test_subscriptions DISABLE ROW LEVEL SECURITY;',
    });

    if (customersError || subscriptionsError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to disable RLS',
          customersError: customersError?.message,
          subscriptionsError: subscriptionsError?.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'RLS temporarily disabled for testing',
    });
  } catch (error) {
    console.error('Disable RLS error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
