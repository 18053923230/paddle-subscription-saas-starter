'use client';

import { useEffect, useState } from 'react';

export default function TestQueryPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testQuery = async () => {
      console.log('🟠 [TEST QUERY] Starting test...');

      try {
        const response = await fetch('/api/debug/test-query');
        const data = await response.json();
        setResult(data);

        console.log('🟠 [TEST QUERY] Result:', data);
      } catch (error) {
        console.error('🟠 [TEST QUERY] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    testQuery();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Test Query Debug</h1>

      <div className="mb-8 p-4 bg-blue-50 rounded">
        <h2 className="text-lg font-semibold mb-2">Query Result</h2>
        <pre className="text-sm bg-white p-2 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>
      </div>
    </div>
  );
}
