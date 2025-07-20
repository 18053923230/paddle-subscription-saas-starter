import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  console.log('🟡 [TEST QUERY] /api/debug/test-query called');

  try {
    const supabase = await createClient();
    const user = await supabase.auth.getUser();

    if (!user.data.user) {
      return NextResponse.json({ error: 'No authenticated user' });
    }

    const userEmail = user.data.user.email;
    console.log('🟡 [TEST QUERY] User email:', userEmail);

    // 测试1: 获取所有客户
    const { data: allCustomers, error: allCustomersError } = await supabase.from('test_customers').select('*');

    console.log('🟡 [TEST QUERY] All customers:', allCustomers);

    // 测试2: 精确匹配
    const { data: exactMatch, error: exactMatchError } = await supabase
      .from('test_customers')
      .select('*')
      .eq('email', userEmail);

    console.log('🟡 [TEST QUERY] Exact match:', exactMatch);

    // 测试3: 使用 single()
    let singleResult = null;
    let singleError = null;
    try {
      const { data, error } = await supabase.from('test_customers').select('*').eq('email', userEmail).single();
      singleResult = data;
      singleError = error;
    } catch (e) {
      singleError = e;
    }

    console.log('🟡 [TEST QUERY] Single result:', singleResult);
    console.log('🟡 [TEST QUERY] Single error:', singleError);

    // 测试4: 不区分大小写匹配
    const { data: caseInsensitiveMatch, error: caseInsensitiveError } = await supabase
      .from('test_customers')
      .select('*')
      .ilike('email', userEmail || '');

    console.log('🟡 [TEST QUERY] Case insensitive match:', caseInsensitiveMatch);

    // 测试5: 检查邮箱长度和字符
    const emailDetails = {
      original: userEmail,
      length: userEmail?.length,
      trimmed: userEmail?.trim(),
      trimmedLength: userEmail?.trim().length,
      toLowerCase: userEmail?.toLowerCase(),
      toUpperCase: userEmail?.toUpperCase(),
      charCodes: userEmail?.split('').map((c) => c.charCodeAt(0)),
    };

    console.log('🟡 [TEST QUERY] Email details:', emailDetails);

    return NextResponse.json({
      success: true,
      userEmail: userEmail,
      emailDetails: emailDetails,
      allCustomers: allCustomers || [],
      allCustomersError: allCustomersError,
      exactMatch: exactMatch || [],
      exactMatchError: exactMatchError,
      singleResult: singleResult,
      singleError: singleError,
      caseInsensitiveMatch: caseInsensitiveMatch || [],
      caseInsensitiveError: caseInsensitiveError,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('🟡 [TEST QUERY] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
