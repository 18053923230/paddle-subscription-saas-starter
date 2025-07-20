import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  console.log('Debug user', request);
  try {
    const supabase = await createClient();
    const user = await supabase.auth.getUser();

    if (!user.data.user) {
      return NextResponse.json({ error: 'No authenticated user' });
    }

    // 获取用户的 customer 信息
    const { data: customerData } = await supabase
      .from('test_customers')
      .select('*')
      .eq('email', user.data.user.email)
      .single();

    return NextResponse.json({
      user: {
        id: user.data.user.id,
        email: user.data.user.email,
        created_at: user.data.user.created_at,
      },
      customer: customerData,
    });
  } catch (error) {
    console.error('Debug user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
