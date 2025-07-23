import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function GET() {
  console.log('🟡 [OAUTH-STATUS] Checking OAuth configuration');
  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

    console.log('🟡 [OAUTH-STATUS] Current site ID:', siteId);

    // 获取当前用户
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // 检查环境变量
    const envCheck = {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    };

    // 计算重定向URL
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000';

    const redirectUrl = `${siteUrl}/auth/callback`;

    // 检查用户是否有客户记录
    let customerRecord = null;
    let customerError = null;

    if (user?.email) {
      const { data: customer, error: custErr } = await supabase
        .from('test_customers')
        .select('*')
        .eq('email', user.email)
        .eq('tenant_id', siteId)
        .single();

      customerRecord = customer;
      customerError = custErr;
    }

    return NextResponse.json({
      success: true,
      siteId,
      user: {
        isAuthenticated: !!user,
        email: user?.email,
        id: user?.id,
        provider: user?.app_metadata?.provider,
        error: userError?.message,
      },
      environment: envCheck,
      oauth: {
        siteUrl,
        redirectUrl,
        callbackUrl: '/auth/callback',
        fullCallbackUrl: redirectUrl,
      },
      customerRecord: {
        exists: !!customerRecord,
        data: customerRecord,
        error: customerError?.message,
      },
      recommendations: [
        !user ? 'User not authenticated - try logging in with GitHub' : null,
        !customerRecord ? 'No customer record found - OAuth callback may not be working' : null,
        !process.env.NEXT_PUBLIC_SITE_URL ? 'NEXT_PUBLIC_SITE_URL not set - using fallback URL' : null,
      ].filter(Boolean),
    });
  } catch (error) {
    console.error('🟡 [OAUTH-STATUS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
