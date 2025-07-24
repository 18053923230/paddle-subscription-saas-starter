import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function POST(request: Request) {
  console.log('🟡 [TEST-WEBHOOK] Testing webhook processing');

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

    // 获取用户的客户记录
    const { data: customerData } = await supabase
      .from('test_customers')
      .select('customer_id')
      .eq('email', user.email)
      .eq('tenant_id', siteId)
      .single();

    if (!customerData) {
      return NextResponse.json(
        {
          success: false,
          error: 'No customer record found for user',
        },
        { status: 404 },
      );
    }

    // 设置租户ID
    const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

    if (tenantError) {
      console.error('🟡 [TEST-WEBHOOK] Failed to set tenant:', tenantError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to set tenant',
          details: tenantError.message,
        },
        { status: 500 },
      );
    }

    // 创建测试订阅记录
    const testSubscriptionId = `sub_test_webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('🟡 [TEST-WEBHOOK] Creating test subscription:', {
      subscriptionId: testSubscriptionId,
      customerId: customerData.customer_id,
      tenantId: siteId,
    });

    const { data: newSubscription, error: insertError } = await supabase
      .from('test_subscriptions')
      .insert({
        subscription_id: testSubscriptionId,
        subscription_status: 'active',
        price_id: 'test_webhook_price_id',
        product_id: 'test_webhook_product_id',
        customer_id: customerData.customer_id,
        tenant_id: siteId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('🟡 [TEST-WEBHOOK] Failed to create subscription:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create subscription',
          details: insertError.message,
        },
        { status: 500 },
      );
    }

    console.log('🟡 [TEST-WEBHOOK] Test subscription created successfully:', newSubscription);

    // 获取用户的所有订阅
    const { data: userSubscriptions } = await supabase
      .from('test_subscriptions')
      .select('*')
      .eq('customer_id', customerData.customer_id)
      .eq('tenant_id', siteId)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      message: 'Test webhook subscription created successfully',
      siteId,
      user: {
        email: user.email,
        customerId: customerData.customer_id,
      },
      newSubscription: newSubscription,
      totalUserSubscriptions: userSubscriptions?.length || 0,
      allUserSubscriptions: userSubscriptions || [],
    });
  } catch (error) {
    console.error('🟡 [TEST-WEBHOOK] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error during webhook test',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
