'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentSiteId } from '@/utils/supabase/site-config';
import { SubscriptionResponse } from '@/lib/api.types';
import { Subscription as PaddleSubscription } from '@paddle/paddle-node-sdk';

export async function getSubscriptionsFromDB(): Promise<SubscriptionResponse> {
  console.log('🟡 [GET SUBSCRIPTIONS FROM DB] Starting function...');

  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

    console.log('🔵 [GET SUBSCRIPTIONS FROM DB] Getting subscriptions for site:', siteId);

    const { data: subscriptions, error } = await supabase
      .from('test_subscriptions')
      .select('*')
      .eq('tenant_id', siteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('🔵 [GET SUBSCRIPTIONS FROM DB] Error:', error);
      return { data: [], hasMore: false, totalRecords: 0, error: error.message };
    }

    console.log('🔵 [GET SUBSCRIPTIONS FROM DB] Success:', {
      count: subscriptions?.length || 0,
      siteId,
      subscriptions,
    });

    // 转换为 Paddle Subscription 格式
    const formattedSubscriptions =
      subscriptions?.map((sub) => {
        const formatted = {
          id: sub.subscription_id,
          status: sub.subscription_status,
          items: [
            {
              price: {
                id: sub.price_id,
                productId: sub.product_id,
                unitPrice: { amount: '0' }, // 需要从其他地方获取价格信息
                currencyCode: 'USD', // 默认值
              },
              product: {
                name: 'Subscription', // 需要从其他地方获取产品信息
                description: 'Subscription product',
                imageUrl: null,
              },
              quantity: 1,
            },
          ],
          billingCycle: {
            frequency: 1,
            interval: 'month',
          },
          currencyCode: 'USD',
          startedAt: sub.created_at,
          nextBilledAt: sub.scheduled_change ? new Date(sub.scheduled_change).toISOString() : null,
        } as unknown as PaddleSubscription;

        return formatted;
      }) || [];

    return {
      data: formattedSubscriptions,
      hasMore: false,
      totalRecords: formattedSubscriptions.length,
    };
  } catch (error) {
    console.error('🔵 [GET SUBSCRIPTIONS FROM DB] Exception:', error);
    return { data: [], hasMore: false, totalRecords: 0, error: 'Failed to fetch subscriptions' };
  }
}
