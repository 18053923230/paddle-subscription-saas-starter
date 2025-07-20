import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionsFromDB } from '@/utils/paddle/get-subscriptions-from-db';

export async function GET(request: NextRequest) {
  console.log('🟡 [DEBUG API] request:', request);
  console.log('🟡 [DEBUG API] /api/debug/subscriptions called');

  try {
    const result = await getSubscriptionsFromDB();

    console.log('🟡 [DEBUG API] getSubscriptionsFromDB result:', {
      hasData: !!result.data,
      dataLength: result.data?.length || 0,
      hasError: !!result.error,
      error: result.error,
      result: result,
    });

    return NextResponse.json({
      success: true,
      subscriptions: result.data || [],
      error: result.error || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('🟡 [DEBUG API] Error in debug endpoint:', error);
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
