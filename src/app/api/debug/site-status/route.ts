import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function GET(request: NextRequest) {
  console.log('Site status route', request);
  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

    // 设置当前租户ID到数据库会话
    const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

    if (tenantError) {
      console.error('🟡 [SITE-STATUS] Failed to set tenant:', tenantError);
    } else {
      console.log('🟡 [SITE-STATUS] Successfully set tenant_id:', siteId);
    }

    // 获取当前用户
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // 检查环境变量
    const envCheck = {
      NEXT_PUBLIC_SITE_ID: process.env.NEXT_PUBLIC_SITE_ID,
      NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
      PADDLE_API_KEY: process.env.PADDLE_API_KEY ? '✅ Set' : '❌ Missing',
      PADDLE_WEBHOOK_SECRET: process.env.PADDLE_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing',
    };

    // 检查数据库连接
    const { data: dbTest, error: dbError } = await supabase.from('test_customers').select('count').limit(1);
    console.log('DB test', dbTest);

    // 检查当前用户的客户记录
    let customerRecord = null;
    let customerError = null;

    if (user?.email) {
      // 先查询所有匹配的记录，看看是否有重复
      const { data: allMatchingCustomers, error: allCustErr } = await supabase
        .from('test_customers')
        .select('*')
        .eq('email', user.email)
        .eq('tenant_id', siteId);

      console.log(
        '🟡 [SITE-STATUS] All matching customers for email:',
        user.email,
        'tenant:',
        siteId,
        'count:',
        allMatchingCustomers?.length,
        allCustErr,
      );

      if (allMatchingCustomers && allMatchingCustomers.length > 0) {
        customerRecord = allMatchingCustomers[0]; // 取第一个记录
        if (allMatchingCustomers.length > 1) {
          customerError = `Multiple records found (${allMatchingCustomers.length}) for email: ${user.email}`;
        }
      } else {
        customerError = 'No customer record found';
      }
    }

    // 检查租户隔离 - 使用service role key绕过RLS来查看所有数据
    const { data: allCustomers, error: allCustomersError } = await supabase
      .from('test_customers')
      .select('*')
      .eq('tenant_id', siteId);

    const { data: allSubscriptions, error: allSubscriptionsError } = await supabase
      .from('test_subscriptions')
      .select('*')
      .eq('tenant_id', siteId);

    // 检查是否有重复的email记录
    const { data: duplicateEmails, error: duplicateError } = await supabase.rpc('check_duplicate_emails', {
      tenant_id_param: siteId,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      siteInfo: {
        siteId,
        siteName: process.env.NEXT_PUBLIC_SITE_NAME,
        url: process.env.NEXT_PUBLIC_SITE_URL,
      },
      user: {
        isAuthenticated: !!user,
        email: user?.email,
        id: user?.id,
        error: userError?.message,
      },
      environment: envCheck,
      database: {
        connection: dbError ? '❌ Failed' : '✅ Connected',
        error: dbError?.message,
      },
      customerRecord: {
        exists: !!customerRecord,
        data: customerRecord,
        error: customerError,
        allMatchingRecords: user?.email
          ? await supabase.from('test_customers').select('*').eq('email', user.email).eq('tenant_id', siteId)
          : null,
      },
      tenantIsolation: {
        customersInTenant: allCustomers?.length || 0,
        subscriptionsInTenant: allSubscriptions?.length || 0,
        customersError: allCustomersError?.message,
        subscriptionsError: allSubscriptionsError?.message,
        duplicateEmails: duplicateEmails || [],
        duplicateError: duplicateError?.message,
      },
      recommendations: [],
    });
  } catch (error) {
    console.error('Site status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
