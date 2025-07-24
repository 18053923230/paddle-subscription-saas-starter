import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function POST() {
  console.log('🟡 [CLEANUP-DUPLICATES] Starting duplicate customer cleanup');

  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

    console.log('🟡 [CLEANUP-DUPLICATES] Current site ID:', siteId);

    // 设置当前租户ID
    const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

    if (tenantError) {
      console.error('🟡 [CLEANUP-DUPLICATES] Failed to set tenant:', tenantError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to set tenant',
          details: tenantError.message,
        },
        { status: 500 },
      );
    }

    // 调用数据库函数清理重复记录
    const { data: cleanupResult, error: cleanupError } = await supabase.rpc('cleanup_duplicate_customers', {
      tenant_id_param: siteId,
    });

    if (cleanupError) {
      console.error('🟡 [CLEANUP-DUPLICATES] Error calling cleanup function:', cleanupError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to cleanup duplicates',
          details: cleanupError.message,
        },
        { status: 500 },
      );
    }

    console.log('🟡 [CLEANUP-DUPLICATES] Cleanup completed:', cleanupResult);

    // 获取清理后的客户记录
    const { data: customers, error: customersError } = await supabase
      .from('test_customers')
      .select('*')
      .eq('tenant_id', siteId)
      .order('created_at', { ascending: true });

    if (customersError) {
      console.error('🟡 [CLEANUP-DUPLICATES] Error fetching customers after cleanup:', customersError);
    }

    return NextResponse.json({
      success: true,
      message: 'Duplicate customer cleanup completed',
      siteId,
      cleanupResult,
      remainingCustomers: customers || [],
      totalCustomers: customers?.length || 0,
    });
  } catch (error) {
    console.error('🟡 [CLEANUP-DUPLICATES] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error during cleanup',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
