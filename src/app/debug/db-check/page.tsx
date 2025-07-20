'use client';

import { useEffect, useState } from 'react';

interface Customer {
  customer_id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

interface Subscription {
  subscription_id: string;
  subscription_status: string;
  price_id: string | null;
  product_id: string | null;
  scheduled_change: string | null;
  customer_id: string;
  created_at: string;
  updated_at: string;
}

export default function DbCheckPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [currentUser, setCurrentUser] = useState<{ email?: string; id?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkData = async () => {
      console.log('🟠 [DB CHECK] Starting database check...');

      try {
        // 获取当前用户
        const userResponse = await fetch('/api/debug/user');
        const userData = await userResponse.json();
        setCurrentUser(userData.user); // 只设置 user 部分，不是整个对象

        console.log('🟠 [DB CHECK] Current user:', userData);

        // 获取所有客户
        const customersResponse = await fetch('/api/debug/customers');
        const customersData = await customersResponse.json();
        setCustomers(customersData.customers || []);

        console.log('🟠 [DB CHECK] All customers:', customersData);

        // 获取所有订阅
        const subscriptionsResponse = await fetch('/api/debug/all-subscriptions');
        const subscriptionsData = await subscriptionsResponse.json();
        setSubscriptions(subscriptionsData.subscriptions || []);

        console.log('🟠 [DB CHECK] All subscriptions:', subscriptionsData);
      } catch (error) {
        console.error('🟠 [DB CHECK] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkData();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Database Check</h1>

      {/* 当前用户信息 */}
      <div className="mb-8 p-4 bg-blue-50 rounded">
        <h2 className="text-lg font-semibold mb-2">Current User</h2>
        <pre className="text-sm bg-white p-2 rounded overflow-auto">{JSON.stringify(currentUser, null, 2)}</pre>
      </div>

      {/* 客户数据 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">All Customers ({customers.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">Customer ID</th>
                <th className="border px-4 py-2">Email</th>
                <th className="border px-4 py-2">Created At</th>
                <th className="border px-4 py-2">Matches Current User</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.customer_id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2 font-mono text-sm">{customer.customer_id}</td>
                  <td className="border px-4 py-2">{customer.email}</td>
                  <td className="border px-4 py-2 text-sm">{new Date(customer.created_at).toLocaleString()}</td>
                  <td className="border px-4 py-2">
                    {currentUser?.email === customer.email ? (
                      <span className="text-green-600 font-bold">✅ MATCH</span>
                    ) : (
                      <span className="text-red-600">❌ NO MATCH</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 订阅数据 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">All Subscriptions ({subscriptions.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">Subscription ID</th>
                <th className="border px-4 py-2">Status</th>
                <th className="border px-4 py-2">Customer ID</th>
                <th className="border px-4 py-2">Price ID</th>
                <th className="border px-4 py-2">Product ID</th>
                <th className="border px-4 py-2">Created At</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((subscription) => (
                <tr key={subscription.subscription_id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2 font-mono text-sm">{subscription.subscription_id}</td>
                  <td className="border px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        subscription.subscription_status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {subscription.subscription_status}
                    </span>
                  </td>
                  <td className="border px-4 py-2 font-mono text-sm">{subscription.customer_id}</td>
                  <td className="border px-4 py-2 font-mono text-sm">{subscription.price_id || '-'}</td>
                  <td className="border px-4 py-2 font-mono text-sm">{subscription.product_id || '-'}</td>
                  <td className="border px-4 py-2 text-sm">{new Date(subscription.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
