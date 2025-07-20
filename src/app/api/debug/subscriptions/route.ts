import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await supabase.auth.getUser();

    if (!user.data.user) {
      return NextResponse.json({ error: 'No authenticated user' });
    }

    // 获取用户的 customer 信息
    const { data: customerData } = await supabase
      .from('test_customers')
      .select('customer_id')
      .eq('email', user.data.user.email)
      .single();

    if (!customerData?.customer_id) {
      return NextResponse.json({
        error: 'No customer found for user',
        userEmail: user.data.user.email,
      });
    }

    // 获取该用户的订阅数据
    const { data: subscriptions, error } = await supabase
      .from('test_subscriptions')
      .select('*')
      .eq('customer_id', customerData.customer_id);

    if (error) {
      return NextResponse.json({ error: error.message });
    }

    return NextResponse.json({
      customerId: customerData.customer_id,
      subscriptions: subscriptions || [],
      count: subscriptions?.length || 0,
    });
  } catch (error) {
    console.error('Debug subscriptions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
