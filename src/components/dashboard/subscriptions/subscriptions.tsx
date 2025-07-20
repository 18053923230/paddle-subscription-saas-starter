import { SubscriptionDetail } from '@/components/dashboard/subscriptions/components/subscription-detail';
import { NoSubscriptionView } from '@/components/dashboard/subscriptions/views/no-subscription-view';
import { SubscriptionListView } from '@/components/dashboard/subscriptions/views/subscription-list-view';
// import { MultipleSubscriptionsView } from '@/components/dashboard/subscriptions/views/multiple-subscriptions-view';
import { SubscriptionErrorView } from '@/components/dashboard/subscriptions/views/subscription-error-view';
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

  if (subscriptions) {
    console.log('🔵 [SUBSCRIPTIONS] Processing subscriptions data...');

    if (subscriptions.length === 0) {
      console.log('🔵 [SUBSCRIPTIONS] No subscriptions found, showing NoSubscriptionView');
      return <NoSubscriptionView />;
    } else if (subscriptions.length === 1) {
      console.log('🔵 [SUBSCRIPTIONS] Single subscription found, showing SubscriptionDetail:', {
        subscriptionId: subscriptions[0].id,
      });
      return <SubscriptionDetail subscriptionId={subscriptions[0].id} />;
    } else {
      console.log('🔵 [SUBSCRIPTIONS] Multiple subscriptions found, showing SubscriptionListView:', {
        count: subscriptions.length,
        subscriptionIds: subscriptions.map((s) => s.id),
      });
      // 显示订阅列表视图，按日期排序
      return <SubscriptionListView subscriptions={subscriptions} />;
    }
  } else {
    console.log('🔵 [SUBSCRIPTIONS] No data returned, showing SubscriptionErrorView');
    return <SubscriptionErrorView />;
  }
}
