import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function POST(request: NextRequest) {
  console.log('Test write route', request);
  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

    console.log('Testing write for site:', siteId);

    // 获取当前用户
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not authenticated',
        },
        { status: 401 },
      );
    }

    // 测试创建客户记录
    const testCustomerId = `test_ctm_${Date.now()}`;

    const { data: customer, error: customerError } = await supabase
      .from('test_customers')
      .insert({
        customer_id: testCustomerId,
        email: user.email,
        tenant_id: siteId,
      })
      .select()
      .single();

    if (customerError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create customer',
          details: customerError.message,
        },
        { status: 500 },
      );
    }

    // 测试创建订阅记录
    const testSubscriptionId = `test_sub_${Date.now()}`;

    const { data: subscription, error: subscriptionError } = await supabase
      .from('test_subscriptions')
      .insert({
        subscription_id: testSubscriptionId,
        subscription_status: 'active',
        price_id: 'test_price',
        product_id: 'test_product',
        customer_id: testCustomerId,
        tenant_id: siteId,
      })
      .select()
      .single();

    if (subscriptionError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create subscription',
          details: subscriptionError.message,
        },
        { status: 500 },
      );
    }

    // 清理测试数据
    await supabase.from('test_subscriptions').delete().eq('subscription_id', testSubscriptionId);
    await supabase.from('test_customers').delete().eq('customer_id', testCustomerId);

    return NextResponse.json({
      success: true,
      message: 'Write test successful',
      customer: customer,
      subscription: subscription,
    });
  } catch (error) {
    console.error('Test write error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
