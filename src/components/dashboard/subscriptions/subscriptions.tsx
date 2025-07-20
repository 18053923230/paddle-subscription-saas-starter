import { SubscriptionDetail } from '@/components/dashboard/subscriptions/components/subscription-detail';
import { NoSubscriptionView } from '@/components/dashboard/subscriptions/views/no-subscription-view';
import { MultipleSubscriptionsView } from '@/components/dashboard/subscriptions/views/multiple-subscriptions-view';
import { SubscriptionErrorView } from '@/components/dashboard/subscriptions/views/subscription-error-view';
import { getSubscriptionsFromDB } from '@/utils/paddle/get-subscriptions-from-db';

export async function Subscriptions() {
  const { data: subscriptions } = await getSubscriptionsFromDB();

  if (subscriptions) {
    if (subscriptions.length === 0) {
      return <NoSubscriptionView />;
    } else if (subscriptions.length === 1) {
      return <SubscriptionDetail subscriptionId={subscriptions[0].id} />;
    } else {
      return <MultipleSubscriptionsView subscriptions={subscriptions} />;
    }
  } else {
    return <SubscriptionErrorView />;
  }
}
