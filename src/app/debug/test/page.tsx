'use client';

import { useEffect } from 'react';

export default function TestPage() {
  useEffect(() => {
    console.log('🟠 [TEST PAGE] Test page loaded');
    console.log('🟠 [TEST PAGE] Testing console.log functionality');

    // 测试各种日志级别
    console.info('🟠 [TEST PAGE] Info message');
    console.warn('🟠 [TEST PAGE] Warning message');
    console.error('🟠 [TEST PAGE] Error message');

    // 测试对象日志
    console.log('🟠 [TEST PAGE] Object test:', {
      string: 'test string',
      number: 123,
      boolean: true,
      array: [1, 2, 3],
      object: { key: 'value' },
      timestamp: new Date().toISOString(),
    });
  }, []);

  const testApiCall = async () => {
    console.log('🟠 [TEST PAGE] Testing API call...');
    try {
      const response = await fetch('/api/debug/subscriptions');
      const data = await response.json();
      console.log('🟠 [TEST PAGE] API response:', data);
    } catch (error) {
      console.error('🟠 [TEST PAGE] API error:', error);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Test Page</h1>
      <p className="mb-4">Check the browser console for logs.</p>

      <button onClick={testApiCall} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Test API Call
      </button>

      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Instructions:</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>Open browser developer tools (F12)</li>
          <li>Go to Console tab</li>
          <li>Look for messages starting with 🟠 [TEST PAGE]</li>
          <li>Click &quot;Test API Call&quot; button to test API</li>
        </ol>
      </div>
    </div>
  );
}
