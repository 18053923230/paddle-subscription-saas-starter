// import { SubscriptionDetail } from '@/components/dashboard/subscriptions/components/subscription-detail';
// import { NoSubscriptionView } from '@/components/dashboard/subscriptions/views/no-subscription-view';
// import { SubscriptionListView } from '@/components/dashboard/subscriptions/views/subscription-list-view';
// import { MultipleSubscriptionsView } from '@/components/dashboard/subscriptions/views/multiple-subscriptions-view';
// import { SubscriptionErrorView } from '@/components/dashboard/subscriptions/views/subscription-error-view';
import { SubscriptionsDebug } from '@/components/dashboard/subscriptions/subscriptions-debug';
import { getSubscriptionsFromDB } from '@/utils/paddle/get-subscriptions-from-db';

export async function Subscriptions() {
  console.log('🔵 [SUBSCRIPTIONS] Starting Subscriptions component...');

  const { data: subscriptions } = await getSubscriptionsFromDB();

  console.log('🔵 [SUBSCRIPTIONS] getSubscriptionsFromDB result:', {
    hasData: !!subscriptions,
    dataType: typeof subscriptions,
    length: subscriptions?.length || 0,
    subscriptions: subscriptions,
    timestamp: new Date().toISOString(),
  });

  // 使用调试组件来显示客户端日志
  return <SubscriptionsDebug initialSubscriptions={subscriptions || null} />;
}
