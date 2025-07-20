'use client';

import { useEffect, useState } from 'react';
import { SubscriptionListView } from './views/subscription-list-view';
import { NoSubscriptionView } from './views/no-subscription-view';
import { SubscriptionDetail } from './components/subscription-detail';
import { SubscriptionErrorView } from './views/subscription-error-view';
import { Subscription as PaddleSubscription } from '@paddle/paddle-node-sdk';

interface Props {
  initialSubscriptions: PaddleSubscription[] | null;
}

export function SubscriptionsDebug({ initialSubscriptions }: Props) {
  const [subscriptions, setSubscriptions] = useState<PaddleSubscription[] | null>(initialSubscriptions);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('🟠 [SUBSCRIPTIONS DEBUG] Client component mounted');
    console.log('🟠 [SUBSCRIPTIONS DEBUG] Initial subscriptions:', {
      hasData: !!initialSubscriptions,
      dataType: typeof initialSubscriptions,
      length: initialSubscriptions?.length || 0,
      subscriptions: initialSubscriptions,
      timestamp: new Date().toISOString(),
    });
  }, [initialSubscriptions]);

  const refreshData = async () => {
    console.log('🟠 [SUBSCRIPTIONS DEBUG] Refreshing data...');
    setLoading(true);

    try {
      const response = await fetch('/api/debug/subscriptions');
      const data = await response.json();

      console.log('🟠 [SUBSCRIPTIONS DEBUG] Refresh result:', data);
      setSubscriptions(data.subscriptions || null);
    } catch (error) {
      console.error('🟠 [SUBSCRIPTIONS DEBUG] Error refreshing:', error);
    } finally {
      setLoading(false);
    }
  };

  console.log('🟠 [SUBSCRIPTIONS DEBUG] Rendering with subscriptions:', {
    hasData: !!subscriptions,
    length: subscriptions?.length || 0,
    subscriptions: subscriptions,
  });

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!subscriptions) {
    console.log('🟠 [SUBSCRIPTIONS DEBUG] No data, showing error view');
    return (
      <div>
        <SubscriptionErrorView />
        <div className="mt-4 p-4 bg-yellow-100 rounded">
          <button onClick={refreshData} className="px-4 py-2 bg-blue-500 text-white rounded">
            Refresh Data
          </button>
        </div>
      </div>
    );
  }

  if (subscriptions.length === 0) {
    console.log('🟠 [SUBSCRIPTIONS DEBUG] No subscriptions, showing no subscription view');
    return (
      <div>
        <NoSubscriptionView />
        <div className="mt-4 p-4 bg-yellow-100 rounded">
          <button onClick={refreshData} className="px-4 py-2 bg-blue-500 text-white rounded">
            Refresh Data
          </button>
        </div>
      </div>
    );
  }

  if (subscriptions.length === 1) {
    console.log('🟠 [SUBSCRIPTIONS DEBUG] Single subscription, showing detail view');
    return (
      <div>
        <SubscriptionDetail subscriptionId={subscriptions[0].id} />
        <div className="mt-4 p-4 bg-yellow-100 rounded">
          <button onClick={refreshData} className="px-4 py-2 bg-blue-500 text-white rounded">
            Refresh Data
          </button>
        </div>
      </div>
    );
  }

  console.log('🟠 [SUBSCRIPTIONS DEBUG] Multiple subscriptions, showing list view');
  return (
    <div>
      <SubscriptionListView subscriptions={subscriptions} />
      <div className="mt-4 p-4 bg-yellow-100 rounded">
        <button onClick={refreshData} className="px-4 py-2 bg-blue-500 text-white rounded">
          Refresh Data
        </button>
      </div>
    </div>
  );
}
