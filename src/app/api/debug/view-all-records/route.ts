import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function GET() {
  console.log('🟡 [VIEW-ALL-RECORDS] Viewing all records');
  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

    console.log('🟡 [VIEW-ALL-RECORDS] Current site ID:', siteId);

    // 使用service role key绕过RLS，查看所有记录
    const { data: allCustomers, error: allCustomersError } = await supabase
      .from('test_customers')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('🟡 [VIEW-ALL-RECORDS] All customers:', {
      count: allCustomers?.length || 0,
      error: allCustomersError?.message,
    });

    // 查看当前租户的记录
    const { data: currentTenantCustomers, error: currentTenantError } = await supabase
      .from('test_customers')
      .select('*')
      .eq('tenant_id', siteId)
      .order('created_at', { ascending: false });

    console.log('🟡 [VIEW-ALL-RECORDS] Current tenant customers:', {
      count: currentTenantCustomers?.length || 0,
      error: currentTenantError?.message,
    });

    // 查看所有订阅记录
    const { data: allSubscriptions, error: allSubscriptionsError } = await supabase
      .from('test_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('🟡 [VIEW-ALL-RECORDS] All subscriptions:', {
      count: allSubscriptions?.length || 0,
      error: allSubscriptionsError?.message,
    });

    // 查看当前租户的订阅记录
    const { data: currentTenantSubscriptions, error: currentTenantSubsError } = await supabase
      .from('test_subscriptions')
      .select('*')
      .eq('tenant_id', siteId)
      .order('created_at', { ascending: false });

    console.log('🟡 [VIEW-ALL-RECORDS] Current tenant subscriptions:', {
      count: currentTenantSubscriptions?.length || 0,
      error: currentTenantSubsError?.message,
    });

    // 按租户分组统计
    const { data: tenantStats, error: tenantStatsError } = await supabase.rpc('get_tenant_stats', {
      tenant_id_param: siteId,
    });

    console.log('🟡 [VIEW-ALL-RECORDS] Tenant stats:', {
      stats: tenantStats,
      error: tenantStatsError?.message,
    });

    return NextResponse.json({
      success: true,
      siteId,
      allRecords: {
        customers: {
          total: allCustomers?.length || 0,
          error: allCustomersError?.message,
          records: allCustomers || [],
        },
        subscriptions: {
          total: allSubscriptions?.length || 0,
          error: allSubscriptionsError?.message,
          records: allSubscriptions || [],
        },
      },
      currentTenant: {
        customers: {
          total: currentTenantCustomers?.length || 0,
          error: currentTenantError?.message,
          records: currentTenantCustomers || [],
        },
        subscriptions: {
          total: currentTenantSubscriptions?.length || 0,
          error: currentTenantSubsError?.message,
          records: currentTenantSubscriptions || [],
        },
      },
      tenantStats: {
        data: tenantStats,
        error: tenantStatsError?.message,
      },
      analysis: {
        hasRecordsInCurrentTenant: (currentTenantCustomers?.length || 0) > 0,
        hasRecordsInAllTenants: (allCustomers?.length || 0) > 0,
        rlsWorking: (currentTenantCustomers?.length || 0) <= (allCustomers?.length || 0),
      },
    });
  } catch (error) {
    console.error('🟡 [VIEW-ALL-RECORDS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
