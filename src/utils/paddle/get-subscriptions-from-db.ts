'use server';

import { createClient } from '@/utils/supabase/server';
import { SubscriptionResponse } from '@/lib/api.types';
import { Subscription as PaddleSubscription } from '@paddle/paddle-node-sdk';
export async function getSubscriptionsFromDB(): Promise<SubscriptionResponse> {
  console.log('🟡 [GET SUBSCRIPTIONS FROM DB] Starting function...');

  try {
    const supabase = await createClient();
    const user = await supabase.auth.getUser();

    console.log('🟡 [GET SUBSCRIPTIONS FROM DB] User info:', {
      hasUser: !!user.data.user,
      userEmail: user.data.user?.email,
      userId: user.data.user?.id,
      timestamp: new Date().toISOString(),
    });

    if (!user.data.user?.email) {
      console.log('🟡 [GET SUBSCRIPTIONS FROM DB] No user email found, returning empty data');
      return { data: [], hasMore: false, totalRecords: 0 };
    }

    // 先获取用户的 customer_id
    console.log('🟡 [GET SUBSCRIPTIONS FROM DB] Looking up customer_id for email:', user.data.user.email);

    // 先查看所有客户数据，看看有什么邮箱
    const { data: allCustomers } = await supabase.from('test_customers').select('customer_id, email');

    console.log('🟡 [GET SUBSCRIPTIONS FROM DB] All customers in DB:', {
      allCustomers: allCustomers,
      count: allCustomers?.length || 0,
      timestamp: new Date().toISOString(),
    });

    // 获取所有匹配的客户记录
    const { data: allCustomerData, error: customerError } = await supabase
      .from('test_customers')
      .select('customer_id, created_at')
      .eq('email', user.data.user.email)
      .order('created_at', { ascending: false }); // 按创建时间倒序，最新的在前

    console.log('🟡 [GET SUBSCRIPTIONS FROM DB] All customer lookup result:', {
      hasCustomerData: !!allCustomerData,
      customerCount: allCustomerData?.length || 0,
      allCustomerData: allCustomerData,
      customerError: customerError,
      searchedEmail: user.data.user.email,
      timestamp: new Date().toISOString(),
    });

    if (!allCustomerData || allCustomerData.length === 0) {
      console.log('🟡 [GET SUBSCRIPTIONS FROM DB] No customer_id found, returning empty data');
      return { data: [], hasMore: false, totalRecords: 0 };
    }

    // 选择有订阅的客户记录，如果没有则选择最新的
    let customerData = allCustomerData[0]; // 默认选择最新的

    // 检查哪个客户记录有订阅
    for (const customer of allCustomerData) {
      const { data: subscriptionCheck } = await supabase
        .from('test_subscriptions')
        .select('subscription_id')
        .eq('customer_id', customer.customer_id)
        .limit(1);

      if (subscriptionCheck && subscriptionCheck.length > 0) {
        customerData = customer;
        console.log('🟡 [GET SUBSCRIPTIONS FROM DB] Found customer with subscriptions:', customer);
        break;
      }
    }

    console.log('🟡 [GET SUBSCRIPTIONS FROM DB] Final selected customer:', customerData);

    // 获取该用户的订阅数据
    console.log('🟡 [GET SUBSCRIPTIONS FROM DB] Fetching subscriptions for customer_id:', customerData.customer_id);

    const { data: subscriptions, error } = await supabase
      .from('test_subscriptions')
      .select('*')
      .eq('customer_id', customerData.customer_id);

    console.log('🟡 [GET SUBSCRIPTIONS FROM DB] Raw subscriptions from DB:', {
      hasError: !!error,
      error: error,
      hasSubscriptions: !!subscriptions,
      subscriptionCount: subscriptions?.length || 0,
      subscriptions: subscriptions,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error('🟡 [GET SUBSCRIPTIONS FROM DB] Error fetching subscriptions from DB:', error);
      return { data: [], hasMore: false, totalRecords: 0, error: error.message };
    }

    // 转换为 Paddle Subscription 格式
    console.log('🟡 [GET SUBSCRIPTIONS FROM DB] Converting to Paddle format...');

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

        console.log('🟡 [GET SUBSCRIPTIONS FROM DB] Formatted subscription:', {
          original: sub,
          formatted: formatted,
        });

        return formatted;
      }) || [];

    console.log('🟡 [GET SUBSCRIPTIONS FROM DB] Final result:', {
      formattedCount: formattedSubscriptions.length,
      formattedSubscriptions: formattedSubscriptions,
      timestamp: new Date().toISOString(),
    });

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
