import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function POST(request: NextRequest) {
  console.log('🟡 [CREATE-CUSTOMER-MANUAL] Manual customer creation', request.body);
  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

    console.log('🟡 [CREATE-CUSTOMER-MANUAL] Creating customer for tenant:', siteId);

    // 设置当前租户ID到数据库会话
    const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

    if (tenantError) {
      console.error('🟡 [CREATE-CUSTOMER-MANUAL] Failed to set tenant:', tenantError);
      return NextResponse.json({ error: 'Failed to set tenant' }, { status: 500 });
    }

    // 获取当前用户
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not authenticated or no email found',
        },
        { status: 401 },
      );
    }

    console.log('🟡 [CREATE-CUSTOMER-MANUAL] User email:', user.email);

    // 检查是否已存在客户记录
    const { data: existingCustomers, error: checkError } = await supabase
      .from('test_customers')
      .select('*')
      .eq('email', user.email)
      .eq('tenant_id', siteId);

    console.log('🟡 [CREATE-CUSTOMER-MANUAL] Existing customers check:', {
      count: existingCustomers?.length || 0,
      error: checkError?.message,
      customers: existingCustomers,
    });

    if (existingCustomers && existingCustomers.length > 0) {
      console.log('🟡 [CREATE-CUSTOMER-MANUAL] Customer already exists:', existingCustomers[0]);
      return NextResponse.json({
        success: true,
        message: 'Customer record already exists',
        customer: existingCustomers[0],
        existingCount: existingCustomers.length,
      });
    }

    // 创建新的客户记录
    const customerId = `ctm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('🟡 [CREATE-CUSTOMER-MANUAL] Creating new customer:', {
      customerId,
      email: user.email,
      tenantId: siteId,
    });

    const { data: newCustomer, error: insertError } = await supabase
      .from('test_customers')
      .insert({
        customer_id: customerId,
        email: user.email,
        tenant_id: siteId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('🟡 [CREATE-CUSTOMER-MANUAL] Failed to create customer:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
        },
        { status: 500 },
      );
    }

    console.log('🟡 [CREATE-CUSTOMER-MANUAL] Customer created successfully:', newCustomer);

    // 验证创建是否成功
    const { data: verifyCustomer, error: verifyError } = await supabase
      .from('test_customers')
      .select('*')
      .eq('customer_id', customerId)
      .eq('tenant_id', siteId)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Customer record created successfully',
      customer: newCustomer,
      verification: {
        success: !verifyError,
        data: verifyCustomer,
        error: verifyError?.message,
      },
    });
  } catch (error) {
    console.error('🟡 [CREATE-CUSTOMER-MANUAL] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
