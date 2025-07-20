'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const checkData = async () => {
    setLoading(true);
    setData(null);

    try {
      // 检查用户信息
      const userResponse = await fetch('/api/debug/user');
      const userData = await userResponse.json();

      // 检查订阅数据
      const subscriptionResponse = await fetch('/api/debug/subscriptions');
      const subscriptionData = await subscriptionResponse.json();

      setData({
        user: userData,
        subscriptions: subscriptionData,
      });
    } catch (error) {
      setData({ error: 'Failed to fetch debug data' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Debug Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={checkData} disabled={loading} className="w-full">
            {loading ? 'Loading...' : 'Check Data'}
          </Button>

          {data && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">User Data:</h3>
                <pre className="text-sm overflow-auto">{JSON.stringify(data.user, null, 2)}</pre>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Subscription Data:</h3>
                <pre className="text-sm overflow-auto">{JSON.stringify(data.subscriptions, null, 2)}</pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
