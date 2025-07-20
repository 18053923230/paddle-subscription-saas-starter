'use server';

import { createClient } from '@/utils/supabase/server';
import { SubscriptionResponse } from '@/lib/api.types';
import { Subscription as PaddleSubscription } from '@paddle/paddle-node-sdk';
export async function getSubscriptionsFromDB(): Promise<SubscriptionResponse> {
  try {
    const supabase = await createClient();
    const user = await supabase.auth.getUser();

    if (!user.data.user?.email) {
      return { data: [], hasMore: false, totalRecords: 0 };
    }

    // 先获取用户的 customer_id
    const { data: customerData } = await supabase
      .from('test_customers')
      .select('customer_id')
      .eq('email', user.data.user.email)
      .single();

    if (!customerData?.customer_id) {
      return { data: [], hasMore: false, totalRecords: 0 };
    }

    // 获取该用户的订阅数据
    const { data: subscriptions, error } = await supabase
      .from('test_subscriptions')
      .select('*')
      .eq('customer_id', customerData.customer_id);

    if (error) {
      console.error('Error fetching subscriptions from DB:', error);
      return { data: [], hasMore: false, totalRecords: 0, error: error.message };
    }

    // 转换为 Paddle Subscription 格式
    const formattedSubscriptions =
      subscriptions?.map(
        (sub) =>
          ({
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
          }) as unknown as PaddleSubscription,
      ) || [];

    return {
      data: formattedSubscriptions,
      hasMore: false,
      totalRecords: formattedSubscriptions.length,
    };
  } catch (error) {
    console.error('Error in getSubscriptionsFromDB:', error);
    return { data: [], hasMore: false, totalRecords: 0, error: 'Failed to fetch subscriptions' };
  }
}
