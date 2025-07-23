import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function POST(request: NextRequest) {
  console.log('Create customer route', request);
  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

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

    // 检查是否已存在客户记录
    const { data: existingCustomer } = await supabase
      .from('test_customers')
      .select('customer_id')
      .eq('email', user.email)
      .eq('tenant_id', siteId)
      .single();

    if (existingCustomer) {
      return NextResponse.json({
        success: true,
        message: 'Customer record already exists',
        customerId: existingCustomer.customer_id,
      });
    }

    // 创建新的客户记录
    const customerId = `ctm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
      console.error('Failed to create customer record:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Customer record created successfully',
      customer: newCustomer,
    });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
