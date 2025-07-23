import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function GET(request: NextRequest) {
  console.log('Tenant test route', request);
  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

    // 获取当前用户
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 测试租户隔离 - 获取所有customers（应该只返回当前租户的）
    const { data: customers, error: customersError } = await supabase
      .from('test_customers')
      .select('*')
      .eq('tenant_id', siteId);

    // 测试租户隔离 - 获取所有subscriptions（应该只返回当前租户的）
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('test_subscriptions')
      .select('*')
      .eq('tenant_id', siteId);

    // 获取当前用户的customer_id
    let customerId = '';
    if (user?.email) {
      const { data: customerData } = await supabase
        .from('test_customers')
        .select('customer_id')
        .eq('email', user.email)
        .eq('tenant_id', siteId)
        .single();

      customerId = customerData?.customer_id || '';
    }

    // 获取当前用户的订阅
    const { data: userSubscriptions, error: userSubsError } = await supabase
      .from('test_subscriptions')
      .select('*')
      .eq('tenant_id', siteId)
      .eq('customer_id', customerId);

    return NextResponse.json({
      success: true,
      siteId,
      user: {
        email: user?.email,
        customerId,
      },
      tenantIsolation: {
        allCustomers: customers?.length || 0,
        allSubscriptions: subscriptions?.length || 0,
        userSubscriptions: userSubscriptions?.length || 0,
      },
      data: {
        customers: customers || [],
        subscriptions: subscriptions || [],
        userSubscriptions: userSubscriptions || [],
      },
      errors: {
        customers: customersError?.message,
        subscriptions: subscriptionsError?.message,
        userSubscriptions: userSubsError?.message,
      },
    });
  } catch (error) {
    console.error('Tenant test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
