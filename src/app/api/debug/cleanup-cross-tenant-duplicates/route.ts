import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';

export async function POST() {
  console.log('🟡 [CLEANUP-CROSS-TENANT] Starting cross-tenant duplicate cleanup');

  try {
    const supabase = await createClient();

    // 获取所有订阅记录（绕过RLS）
    const { data: allSubscriptions, error: subscriptionsError } = await supabase
      .from('test_subscriptions')
      .select('*')
      .order('created_at', { ascending: true });

    if (subscriptionsError) {
      console.error('🟡 [CLEANUP-CROSS-TENANT] Error fetching subscriptions:', subscriptionsError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch subscriptions',
          details: subscriptionsError.message,
        },
        { status: 500 },
      );
    }

    console.log('🟡 [CLEANUP-CROSS-TENANT] Found subscriptions:', allSubscriptions?.length || 0);

    if (!allSubscriptions || allSubscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No subscriptions found to cleanup',
        deletedCount: 0,
      });
    }

    // 按subscription_id分组，找出重复的订阅
    const subscriptionGroups = new Map();

    allSubscriptions.forEach((sub) => {
      const key = sub.subscription_id;
      if (!subscriptionGroups.has(key)) {
        subscriptionGroups.set(key, []);
      }
      subscriptionGroups.get(key).push(sub);
    });

    let deletedCount = 0;
    const actions = [];

    // 处理每个订阅组
    for (const [subscriptionId, subs] of subscriptionGroups) {
      if (subs.length > 1) {
        console.log('🟡 [CLEANUP-CROSS-TENANT] Found duplicate subscription:', subscriptionId, 'count:', subs.length);

        // 按创建时间排序，保留最早的
        subs.sort(
          (a: { created_at: string }, b: { created_at: string }) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );

        const toKeep = subs[0];
        const toDelete = subs.slice(1);

        actions.push({
          subscriptionId,
          keep: {
            tenantId: toKeep.tenant_id,
            customerId: toKeep.customer_id,
            createdAt: toKeep.created_at,
          },
          delete: toDelete.map((sub: any) => ({
            tenantId: sub.tenant_id,
            customerId: sub.customer_id,
            createdAt: sub.created_at,
          })),
          reason: 'Cross-tenant duplicate - keeping earliest created',
        });

        // 删除重复记录
        for (const sub of toDelete) {
          const { error: deleteError } = await supabase
            .from('test_subscriptions')
            .delete()
            .eq('subscription_id', sub.subscription_id)
            .eq('tenant_id', sub.tenant_id);

          if (deleteError) {
            console.error('🟡 [CLEANUP-CROSS-TENANT] Error deleting subscription:', deleteError);
          } else {
            deletedCount++;
            console.log(
              '🟡 [CLEANUP-CROSS-TENANT] Deleted duplicate subscription:',
              sub.subscription_id,
              'from tenant:',
              sub.tenant_id,
            );
          }
        }
      }
    }

    // 获取所有客户记录（绕过RLS）
    const { data: allCustomers, error: customersError } = await supabase
      .from('test_customers')
      .select('*')
      .order('created_at', { ascending: true });

    if (customersError) {
      console.error('🟡 [CLEANUP-CROSS-TENANT] Error fetching customers:', customersError);
    } else {
      // 按email分组，找出跨租户的重复客户
      const emailGroups = new Map();

      allCustomers.forEach((customer) => {
        const email = customer.email;
        if (!emailGroups.has(email)) {
          emailGroups.set(email, []);
        }
        emailGroups.get(email).push(customer);
      });

      // 处理每个email组
      for (const [email, customers] of emailGroups) {
        if (customers.length > 1) {
          console.log('🟡 [CLEANUP-CROSS-TENANT] Found duplicate email:', email, 'count:', customers.length);

          // 按创建时间排序，保留最早的
          customers.sort(
            (a: { created_at: string }, b: { created_at: string }) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          );

          const toKeep = customers[0];
          const toDelete = customers.slice(1);

          actions.push({
            email,
            keep: {
              customerId: toKeep.customer_id,
              tenantId: toKeep.tenant_id,
              createdAt: toKeep.created_at,
            },
            delete: toDelete.map((customer: any) => ({
              customerId: customer.customer_id,
              tenantId: customer.tenant_id,
              createdAt: customer.created_at,
            })),
            reason: 'Cross-tenant duplicate email - keeping earliest created',
          });

          // 删除重复记录
          for (const customer of toDelete) {
            const { error: deleteError } = await supabase
              .from('test_customers')
              .delete()
              .eq('customer_id', customer.customer_id)
              .eq('tenant_id', customer.tenant_id);

            if (deleteError) {
              console.error('🟡 [CLEANUP-CROSS-TENANT] Error deleting customer:', deleteError);
            } else {
              deletedCount++;
              console.log(
                '🟡 [CLEANUP-CROSS-TENANT] Deleted duplicate customer:',
                customer.customer_id,
                'from tenant:',
                customer.tenant_id,
              );
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cross-tenant duplicate cleanup completed',
      deletedCount,
      actions,
    });
  } catch (error) {
    console.error('🟡 [CLEANUP-CROSS-TENANT] Unexpected error:', error);
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
