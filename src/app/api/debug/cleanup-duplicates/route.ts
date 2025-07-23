import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function POST(request: NextRequest) {
  console.log('🟡 [CLEANUP-DUPLICATES] Starting duplicate cleanup', request.body);
  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

    console.log('🟡 [CLEANUP-DUPLICATES] Cleaning up duplicates for tenant:', siteId);

    // 设置当前租户ID到数据库会话
    const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

    if (tenantError) {
      console.error('🟡 [CLEANUP-DUPLICATES] Failed to set tenant:', tenantError);
      return NextResponse.json({ error: 'Failed to set tenant' }, { status: 500 });
    }

    // 获取清理前的统计信息
    const { data: beforeStats, error: beforeStatsError } = await supabase.rpc('get_tenant_stats', {
      tenant_id_param: siteId,
    });

    if (beforeStatsError) {
      console.error('🟡 [CLEANUP-DUPLICATES] Failed to get before stats:', beforeStatsError);
    }

    // 检查重复记录
    const { data: duplicateEmails, error: duplicateError } = await supabase.rpc('check_duplicate_emails', {
      tenant_id_param: siteId,
    });

    if (duplicateError) {
      console.error('🟡 [CLEANUP-DUPLICATES] Failed to check duplicates:', duplicateError);
      return NextResponse.json({ error: duplicateError.message }, { status: 500 });
    }

    if (!duplicateEmails || duplicateEmails.length === 0) {
      console.log('🟡 [CLEANUP-DUPLICATES] No duplicates found');
      return NextResponse.json({
        success: true,
        message: 'No duplicate records found',
        beforeStats: beforeStats?.[0],
        afterStats: beforeStats?.[0],
        duplicatesFound: 0,
      });
    }

    console.log('🟡 [CLEANUP-DUPLICATES] Found duplicates:', duplicateEmails);

    // 清理重复记录
    const { data: cleanupResult, error: cleanupError } = await supabase.rpc('cleanup_duplicate_customers', {
      tenant_id_param: siteId,
    });

    if (cleanupError) {
      console.error('🟡 [CLEANUP-DUPLICATES] Failed to cleanup duplicates:', cleanupError);
      return NextResponse.json({ error: cleanupError.message }, { status: 500 });
    }

    // 获取清理后的统计信息
    const { data: afterStats, error: afterStatsError } = await supabase.rpc('get_tenant_stats', {
      tenant_id_param: siteId,
    });

    if (afterStatsError) {
      console.error('🟡 [CLEANUP-DUPLICATES] Failed to get after stats:', afterStatsError);
    }

    console.log('🟡 [CLEANUP-DUPLICATES] Cleanup completed:', cleanupResult);

    return NextResponse.json({
      success: true,
      message: 'Duplicate cleanup completed successfully',
      beforeStats: beforeStats?.[0],
      afterStats: afterStats?.[0],
      duplicatesFound: duplicateEmails.length,
      cleanupResult: cleanupResult?.[0],
      duplicateEmails: duplicateEmails,
    });
  } catch (error) {
    console.error('🟡 [CLEANUP-DUPLICATES] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
