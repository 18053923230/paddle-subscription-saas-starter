import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function GET() {
  console.log('🟡 [INITIALIZE-SUBSCRIPTION] GET request received');
  return await initializeSubscription();
}

export async function POST() {
  console.log('🟡 [INITIALIZE-SUBSCRIPTION] POST request received');
  return await initializeSubscription();
}

async function initializeSubscription() {
  console.log('🟡 [INITIALIZE-SUBSCRIPTION] Starting subscription initialization');

  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

    console.log('🟡 [INITIALIZE-SUBSCRIPTION] Current site ID:', siteId);

    // 设置当前租户ID
    const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

    if (tenantError) {
      console.error('🟡 [INITIALIZE-SUBSCRIPTION] Failed to set tenant:', tenantError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to set tenant',
          details: tenantError.message,
        },
        { status: 500 },
      );
    }

    console.log('🟡 [INITIALIZE-SUBSCRIPTION] Successfully set tenant_id:', siteId);

    // 检查是否已存在订阅记录
    const { data: existingRecords, error: checkError } = await supabase
      .from('test_subscriptions')
      .select('*')
      .eq('tenant_id', siteId);

    console.log('🟡 [INITIALIZE-SUBSCRIPTION] Existing records check:', {
      count: existingRecords?.length || 0,
      error: checkError?.message,
    });

    if (checkError) {
      console.error('🟡 [INITIALIZE-SUBSCRIPTION] Error checking existing records:', checkError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to check existing records',
          details: checkError.message,
        },
        { status: 500 },
      );
    }

    if (existingRecords && existingRecords.length > 0) {
      console.log('🟡 [INITIALIZE-SUBSCRIPTION] Tenant already has subscription records, no initialization needed');
      return NextResponse.json({
        success: true,
        message: 'Tenant already has subscription records, no initialization needed',
        siteId,
        existingRecords: existingRecords.length,
        records: existingRecords,
      });
    }

    // 检查是否有客户记录
    const { data: customers, error: customerError } = await supabase
      .from('test_customers')
      .select('customer_id, email')
      .eq('tenant_id', siteId);

    console.log('🟡 [INITIALIZE-SUBSCRIPTION] Customer records check:', {
      count: customers?.length || 0,
      error: customerError?.message,
    });

    if (customerError) {
      console.error('🟡 [INITIALIZE-SUBSCRIPTION] Error checking customers:', customerError);
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
      console.log('🟡 [INITIALIZE-SUBSCRIPTION] No customer records found, cannot create subscription');
      return NextResponse.json({
        success: false,
        message: 'No customer records found in tenant, cannot create subscription record',
        siteId,
        recommendations: [
          'First create a customer record using /api/debug/initialize-tenant',
          'Or wait for a user to login and create a customer record',
        ],
      });
    }

    // 创建测试订阅记录
    const testSubscriptionId = `sub_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const testCustomerId = customers[0].customer_id; // 使用第一个客户

    console.log('🟡 [INITIALIZE-SUBSCRIPTION] Creating test subscription record:', {
      subscriptionId: testSubscriptionId,
      customerId: testCustomerId,
      tenantId: siteId,
    });

    const { data: newSubscription, error: insertError } = await supabase
      .from('test_subscriptions')
      .insert({
        subscription_id: testSubscriptionId,
        subscription_status: 'active',
        price_id: 'test_price_id',
        product_id: 'test_product_id',
        customer_id: testCustomerId,
        tenant_id: siteId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('🟡 [INITIALIZE-SUBSCRIPTION] Failed to create subscription record:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create subscription record',
          details: insertError.message,
        },
        { status: 500 },
      );
    }

    console.log('🟡 [INITIALIZE-SUBSCRIPTION] Subscription record created successfully:', newSubscription);

    return NextResponse.json({
      success: true,
      message: 'Subscription initialization completed successfully',
      siteId,
      testSubscription: newSubscription,
      customerUsed: testCustomerId,
      totalCustomers: customers.length,
    });
  } catch (error) {
    console.error('🟡 [INITIALIZE-SUBSCRIPTION] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error during subscription initialization',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
