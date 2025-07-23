import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function GET(request: NextRequest) {
  console.log('🟡 [TENANT-TEST] Testing tenant isolation', request);
  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

    console.log('🟡 [TENANT-TEST] Current site ID:', siteId);

    // 设置当前租户ID到数据库会话
    const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

    if (tenantError) {
      console.error('🟡 [TENANT-TEST] Failed to set tenant:', tenantError);
      return NextResponse.json({ error: 'Failed to set tenant' }, { status: 500 });
    }

    // 测试创建客户记录
    const testCustomerId = `test_${Date.now()}`;
    const testEmail = `test_${Date.now()}@example.com`;

    console.log('🟡 [TENANT-TEST] Creating test customer:', {
      customerId: testCustomerId,
      email: testEmail,
      tenantId: siteId,
    });

    const { data: newCustomer, error: insertError } = await supabase
      .from('test_customers')
      .insert({
        customer_id: testCustomerId,
        email: testEmail,
        tenant_id: siteId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('🟡 [TENANT-TEST] Failed to create test customer:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log('🟡 [TENANT-TEST] Test customer created:', newCustomer);

    // 测试查询当前租户的记录
    const { data: tenantCustomers, error: queryError } = await supabase
      .from('test_customers')
      .select('*')
      .eq('tenant_id', siteId);

    if (queryError) {
      console.error('🟡 [TENANT-TEST] Failed to query tenant customers:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    console.log('🟡 [TENANT-TEST] Tenant customers found:', tenantCustomers?.length);

    // 测试查询所有记录（应该被RLS过滤）
    const { data: allCustomers, error: allQueryError } = await supabase.from('test_customers').select('*');

    console.log('🟡 [TENANT-TEST] All customers (filtered by RLS):', allCustomers?.length, allQueryError);

    // 清理测试数据
    const { error: deleteError } = await supabase
      .from('test_customers')
      .delete()
      .eq('customer_id', testCustomerId)
      .eq('tenant_id', siteId);

    if (deleteError) {
      console.error('🟡 [TENANT-TEST] Failed to delete test customer:', deleteError);
    } else {
      console.log('🟡 [TENANT-TEST] Test customer cleaned up');
    }

    return NextResponse.json({
      success: true,
      siteId,
      testCustomer: newCustomer,
      tenantCustomersCount: tenantCustomers?.length || 0,
      allCustomersCount: allCustomers?.length || 0,
      rlsWorking: allCustomers?.length === tenantCustomers?.length,
      message: 'Tenant isolation test completed successfully',
    });
  } catch (error) {
    console.error('🟡 [TENANT-TEST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
