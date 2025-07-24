import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function POST() {
  console.log('🟡 [CLEANUP-WRONG-SUBSCRIPTIONS] Starting cleanup of wrong subscriptions');

  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

    console.log('🟡 [CLEANUP-WRONG-SUBSCRIPTIONS] Current site ID:', siteId);

    // 设置当前租户ID
    const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

    if (tenantError) {
      console.error('🟡 [CLEANUP-WRONG-SUBSCRIPTIONS] Failed to set tenant:', tenantError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to set tenant',
          details: tenantError.message,
        },
        { status: 500 },
      );
    }

    // 获取当前租户的所有订阅记录
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('test_subscriptions')
      .select('*')
      .eq('tenant_id', siteId);

    if (subscriptionsError) {
      console.error('🟡 [CLEANUP-WRONG-SUBSCRIPTIONS] Error fetching subscriptions:', subscriptionsError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch subscriptions',
          details: subscriptionsError.message,
        },
        { status: 500 },
      );
    }

    console.log('🟡 [CLEANUP-WRONG-SUBSCRIPTIONS] Found subscriptions:', subscriptions?.length || 0);

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No subscriptions found to cleanup',
        siteId,
        deletedCount: 0,
      });
    }

    // 分析订阅记录，找出重复的订阅
    const subscriptionGroups = new Map();

    subscriptions.forEach((sub) => {
      const key = sub.subscription_id;
      if (!subscriptionGroups.has(key)) {
        subscriptionGroups.set(key, []);
      }
      subscriptionGroups.get(key).push(sub);
    });

    // 找出有重复的订阅ID
    const duplicateSubscriptions = [];
    subscriptionGroups.forEach((subs, subscriptionId) => {
      if (subs.length > 1) {
        console.log(
          '🟡 [CLEANUP-WRONG-SUBSCRIPTIONS] Found duplicate subscription:',
          subscriptionId,
          'count:',
          subs.length,
        );
        duplicateSubscriptions.push(...subs);
      }
    });

    console.log(
      '🟡 [CLEANUP-WRONG-SUBSCRIPTIONS] Total duplicate subscriptions to delete:',
      duplicateSubscriptions.length,
    );

    // 删除重复的订阅记录（保留最早创建的）
    let deletedCount = 0;
    for (const [, subs] of subscriptionGroups) {
      if (subs.length > 1) {
        // 按创建时间排序，保留最早的
        subs.sort(
          (a: { created_at: string }, b: { created_at: string }) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );

        // 删除除了第一个之外的所有记录
        const toDelete = subs.slice(1);

        for (const sub of toDelete) {
          const { error: deleteError } = await supabase
            .from('test_subscriptions')
            .delete()
            .eq('subscription_id', sub.subscription_id)
            .eq('tenant_id', sub.tenant_id);

          if (deleteError) {
            console.error('🟡 [CLEANUP-WRONG-SUBSCRIPTIONS] Error deleting subscription:', deleteError);
          } else {
            deletedCount++;
            console.log('🟡 [CLEANUP-WRONG-SUBSCRIPTIONS] Deleted duplicate subscription:', sub.subscription_id);
          }
        }
      }
    }

    // 获取清理后的订阅记录
    const { data: remainingSubscriptions } = await supabase
      .from('test_subscriptions')
      .select('*')
      .eq('tenant_id', siteId);

    return NextResponse.json({
      success: true,
      message: 'Wrong subscriptions cleanup completed',
      siteId,
      originalCount: subscriptions.length,
      deletedCount,
      remainingCount: remainingSubscriptions?.length || 0,
      duplicateGroups: Array.from(subscriptionGroups.entries())
        .filter(([, subs]) => subs.length > 1)
        .map(([id, subs]) => ({ subscriptionId: id, count: subs.length })),
    });
  } catch (error) {
    console.error('🟡 [CLEANUP-WRONG-SUBSCRIPTIONS] Unexpected error:', error);
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
