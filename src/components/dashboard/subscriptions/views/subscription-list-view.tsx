import { DashboardPageHeader } from '@/components/dashboard/layout/dashboard-page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import dayjs from 'dayjs';
import { Subscription as PaddleSubscription } from '@paddle/paddle-node-sdk';

interface Props {
  subscriptions: PaddleSubscription[];
}

export function SubscriptionListView({ subscriptions }: Props) {
  console.log('🟢 [SUBSCRIPTION LIST VIEW] Component rendered with subscriptions:', {
    count: subscriptions.length,
    subscriptions: subscriptions,
    timestamp: new Date().toISOString(),
  });

  // 按创建日期排序（最新的在前）
  const sortedSubscriptions = [...subscriptions].sort(
    (a, b) => new Date(b.startedAt || b.createdAt).getTime() - new Date(a.startedAt || a.createdAt).getTime(),
  );

  console.log('🟢 [SUBSCRIPTION LIST VIEW] Sorted subscriptions:', {
    count: sortedSubscriptions.length,
    sortedSubscriptions: sortedSubscriptions,
    timestamp: new Date().toISOString(),
  });

  return (
    <>
      <DashboardPageHeader pageTitle={'Subscriptions'} />
      <div className={'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
        {sortedSubscriptions.map((subscription) => (
          <Card key={subscription.id} className={'bg-background/50 backdrop-blur-[24px] border-border p-6'}>
            <CardHeader className="p-0 space-y-0">
              <CardTitle className="flex justify-between items-center pb-2">
                <span className={'text-xl font-medium'}>
                  {subscription.status === 'active' ? 'Active' : subscription.status}
                </span>
                <div
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {subscription.status}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className={'p-0 space-y-4'}>
              <div className="space-y-2">
                <div className="text-sm text-secondary">
                  <strong>Subscription ID:</strong> {subscription.id}
                </div>
                {subscription.items[0]?.price?.id && (
                  <div className="text-sm text-secondary">
                    <strong>Price ID:</strong> {subscription.items[0].price.id}
                  </div>
                )}
                {subscription.items[0]?.price?.productId && (
                  <div className="text-sm text-secondary">
                    <strong>Product ID:</strong> {subscription.items[0].price.productId}
                  </div>
                )}
                <div className="text-sm text-secondary">
                  <strong>Created:</strong>{' '}
                  {dayjs(subscription.startedAt || subscription.createdAt).format('MMM DD, YYYY')}
                </div>
                {subscription.nextBilledAt && (
                  <div className="text-sm text-secondary">
                    <strong>Next Billing:</strong> {dayjs(subscription.nextBilledAt).format('MMM DD, YYYY')}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button asChild={true} size={'sm'} variant={'outline'} className={'text-sm rounded-sm border-border'}>
                  <Link href={`/dashboard/subscriptions/${subscription.id}`}>View Details</Link>
                </Button>
                <Button asChild={true} size={'sm'} variant={'outline'} className={'text-sm rounded-sm border-border'}>
                  <Link href={`/dashboard/payments/${subscription.id}`}>View Payments</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
