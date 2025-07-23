import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function GET() {
  console.log('🟡 [AUTH-STATUS] Checking authentication status');
  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

    console.log('🟡 [AUTH-STATUS] Current site ID:', siteId);

    // 设置当前租户ID到数据库会话
    const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

    if (tenantError) {
      console.error('🟡 [AUTH-STATUS] Failed to set tenant:', tenantError);
    } else {
      console.log('🟡 [AUTH-STATUS] Successfully set tenant_id:', siteId);
    }

    // 获取当前用户
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log('🟡 [AUTH-STATUS] User authentication result:', {
      isAuthenticated: !!user,
      email: user?.email,
      id: user?.id,
      error: userError?.message,
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not authenticated',
        authUrl: '/login',
      });
    }

    // 检查用户是否有客户记录
    const { data: customerRecords, error: customerError } = await supabase
      .from('test_customers')
      .select('*')
      .eq('email', user.email)
      .eq('tenant_id', siteId);

    console.log('🟡 [AUTH-STATUS] Customer records check:', {
      count: customerRecords?.length || 0,
      error: customerError?.message,
      records: customerRecords,
    });

    // 检查用户在所有租户中的记录
    const { data: allCustomerRecords, error: allCustomerError } = await supabase
      .from('test_customers')
      .select('*')
      .eq('email', user.email);

    console.log('🟡 [AUTH-STATUS] All customer records check:', {
      count: allCustomerRecords?.length || 0,
      error: allCustomerError?.message,
      records: allCustomerRecords,
    });

    // 检查认证会话信息
    const { data: session, error: sessionError } = await supabase.auth.getSession();

    console.log('🟡 [AUTH-STATUS] Session check:', {
      hasSession: !!session.session,
      error: sessionError?.message,
    });

    return NextResponse.json({
      success: true,
      siteId,
      user: {
        isAuthenticated: !!user,
        email: user.email,
        id: user.id,
        error: userError?.message,
      },
      session: {
        hasSession: !!session.session,
        error: sessionError?.message,
      },
      customerRecords: {
        inCurrentTenant: {
          count: customerRecords?.length || 0,
          error: customerError?.message,
          records: customerRecords || [],
        },
        inAllTenants: {
          count: allCustomerRecords?.length || 0,
          error: allCustomerError?.message,
          records: allCustomerRecords || [],
        },
      },
      recommendations:
        customerRecords?.length === 0
          ? [
              'User is authenticated but no customer record found in current tenant',
              'Try using /api/debug/create-customer-manual to create customer record',
              'Check if auth callback route is being called during login',
            ]
          : [],
    });
  } catch (error) {
    console.error('🟡 [AUTH-STATUS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
