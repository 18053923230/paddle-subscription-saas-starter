import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function GET() {
  console.log('🟡 [FORCE-INITIALIZE-SUBSCRIPTION] GET request received');
  return await forceInitializeSubscription();
}

export async function POST() {
  console.log('🟡 [FORCE-INITIALIZE-SUBSCRIPTION] POST request received');
  return await forceInitializeSubscription();
}

async function forceInitializeSubscription() {
  console.log('🟡 [FORCE-INITIALIZE-SUBSCRIPTION] Starting forced subscription initialization');

  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

    console.log('🟡 [FORCE-INITIALIZE-SUBSCRIPTION] Current site ID:', siteId);

    // 设置当前租户ID
    const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

    if (tenantError) {
      console.error('🟡 [FORCE-INITIALIZE-SUBSCRIPTION] Failed to set tenant:', tenantError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to set tenant',
          details: tenantError.message,
        },
        { status: 500 },
      );
    }

    console.log('🟡 [FORCE-INITIALIZE-SUBSCRIPTION] Successfully set tenant_id:', siteId);

    // 检查是否有客户记录
    const { data: customers, error: customerError } = await supabase
      .from('test_customers')
      .select('customer_id, email')
      .eq('tenant_id', siteId);

    console.log('🟡 [FORCE-INITIALIZE-SUBSCRIPTION] Customer records check:', {
      count: customers?.length || 0,
      error: customerError?.message,
    });

    if (customerError) {
      console.error('🟡 [FORCE-INITIALIZE-SUBSCRIPTION] Error checking customers:', customerError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to check customers',
          details: customerError.message,
        },
        { status: 500 },
      );
    }

    if (!customers || customers.length === 0) {
      console.log('🟡 [FORCE-INITIALIZE-SUBSCRIPTION] No customer records found, creating test customer first');

      // 如果没有客户记录，先创建一个测试客户
      const testCustomerId = `ctm_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const testEmail = `test_${Date.now()}@example.com`;

      const { data: newCustomer, error: customerInsertError } = await supabase
        .from('test_customers')
        .insert({
          customer_id: testCustomerId,
          email: testEmail,
          tenant_id: siteId,
        })
        .select()
        .single();

      if (customerInsertError) {
        console.error('🟡 [FORCE-INITIALIZE-SUBSCRIPTION] Failed to create test customer:', customerInsertError);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to create test customer',
            details: customerInsertError.message,
          },
          { status: 500 },
        );
      }

      console.log('🟡 [FORCE-INITIALIZE-SUBSCRIPTION] Test customer created:', newCustomer);
    } else {
      console.log('🟡 [FORCE-INITIALIZE-SUBSCRIPTION] Using existing customer:', customers[0].customer_id);
    }

    // 创建测试订阅记录
    const testSubscriptionId = `sub_force_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const testCustomerId =
      customers && customers.length > 0
        ? customers[0].customer_id
        : `ctm_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('🟡 [FORCE-INITIALIZE-SUBSCRIPTION] Creating test subscription record:', {
      subscriptionId: testSubscriptionId,
      customerId: testCustomerId,
      tenantId: siteId,
    });

    const { data: newSubscription, error: insertError } = await supabase
      .from('test_subscriptions')
      .insert({
        subscription_id: testSubscriptionId,
        subscription_status: 'active',
        price_id: 'force_test_price_id',
        product_id: 'force_test_product_id',
        customer_id: testCustomerId,
        tenant_id: siteId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('🟡 [FORCE-INITIALIZE-SUBSCRIPTION] Failed to create subscription record:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create subscription record',
          details: insertError.message,
        },
        { status: 500 },
      );
    }

    console.log('🟡 [FORCE-INITIALIZE-SUBSCRIPTION] Subscription record created successfully:', newSubscription);

    // 检查当前租户的所有订阅记录
    const { data: allSubscriptions } = await supabase.from('test_subscriptions').select('*').eq('tenant_id', siteId);

    return NextResponse.json({
      success: true,
      message: 'Forced subscription initialization completed successfully',
      siteId,
      newSubscription: newSubscription,
      customerUsed: testCustomerId,
      totalSubscriptionsInTenant: allSubscriptions?.length || 0,
      allSubscriptions: allSubscriptions || [],
    });
  } catch (error) {
    console.error('🟡 [FORCE-INITIALIZE-SUBSCRIPTION] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error during forced subscription initialization',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
