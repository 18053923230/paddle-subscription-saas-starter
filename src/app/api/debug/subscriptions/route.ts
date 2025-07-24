import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function GET() {
  console.log('🟡 [DEBUG-SUBSCRIPTIONS] Getting user subscriptions');

  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

    // 获取当前用户
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not authenticated',
        },
        { status: 401 },
      );
    }

    console.log('🟡 [DEBUG-SUBSCRIPTIONS] User:', user.email, 'Site:', siteId);

    // 获取用户的客户记录
    const { data: customerData, error: customerError } = await supabase
      .from('test_customers')
      .select('customer_id')
      .eq('email', user.email)
      .eq('tenant_id', siteId)
      .single();

    if (customerError || !customerData) {
      console.log('🟡 [DEBUG-SUBSCRIPTIONS] No customer record found:', customerError?.message);
      return NextResponse.json({
        success: true,
        user: {
          email: user.email,
          customerId: null,
        },
        subscriptions: [],
        totalSubscriptions: 0,
        message: 'No customer record found for user',
      });
    }

    console.log('🟡 [DEBUG-SUBSCRIPTIONS] Customer found:', customerData.customer_id);

    // 获取用户的订阅记录
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('test_subscriptions')
      .select('*')
      .eq('customer_id', customerData.customer_id)
      .eq('tenant_id', siteId)
      .order('created_at', { ascending: false });

    if (subscriptionsError) {
      console.error('🟡 [DEBUG-SUBSCRIPTIONS] Error fetching subscriptions:', subscriptionsError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch subscriptions',
          details: subscriptionsError.message,
        },
        { status: 500 },
      );
    }

    console.log('🟡 [DEBUG-SUBSCRIPTIONS] Subscriptions found:', subscriptions?.length || 0);

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        customerId: customerData.customer_id,
      },
      subscriptions: subscriptions || [],
      totalSubscriptions: subscriptions?.length || 0,
      siteId,
    });
  } catch (error) {
    console.error('🟡 [DEBUG-SUBSCRIPTIONS] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
