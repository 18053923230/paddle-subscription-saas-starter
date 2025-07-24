import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function POST() {
  console.log('🟡 [FIX-CUSTOMER-IDS] Starting customer ID fix');

  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

    console.log('🟡 [FIX-CUSTOMER-IDS] Current site ID:', siteId);

    // 设置当前租户ID
    const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

    if (tenantError) {
      console.error('🟡 [FIX-CUSTOMER-IDS] Failed to set tenant:', tenantError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to set tenant',
          details: tenantError.message,
        },
        { status: 500 },
      );
    }

    // 获取当前租户的所有客户记录
    const { data: customers, error: customersError } = await supabase
      .from('test_customers')
      .select('*')
      .eq('tenant_id', siteId)
      .order('created_at', { ascending: true });

    if (customersError) {
      console.error('🟡 [FIX-CUSTOMER-IDS] Error fetching customers:', customersError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch customers',
          details: customersError.message,
        },
        { status: 500 },
      );
    }

    console.log('🟡 [FIX-CUSTOMER-IDS] Found customers:', customers?.length || 0);

    if (!customers || customers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No customers found to fix',
        siteId,
        fixedCount: 0,
      });
    }

    // 分析客户记录，找出重复的email
    const emailGroups = new Map();

    customers.forEach((customer) => {
      const email = customer.email;
      if (!emailGroups.has(email)) {
        emailGroups.set(email, []);
      }
      emailGroups.get(email).push(customer);
    });

    let fixedCount = 0;
    const actions = [];

    // 处理每个email组
    for (const [email, emailCustomers] of emailGroups) {
      if (emailCustomers.length > 1) {
        console.log('🟡 [FIX-CUSTOMER-IDS] Found duplicate email:', email, 'count:', emailCustomers.length);

        // 按创建时间排序
        emailCustomers.sort(
          (a: { created_at: string }, b: { created_at: string }) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );

        // 保留第一个（最早创建的），删除其他的
        const toKeep = emailCustomers[0];
        const toDelete = emailCustomers.slice(1);

        actions.push({
          email,
          keep: toKeep.customer_id,
          delete: toDelete.map((c: { customer_id: string }) => c.customer_id),
          reason: 'Duplicate email - keeping earliest created',
        });

        // 删除重复记录
        for (const customer of toDelete) {
          const { error: deleteError } = await supabase
            .from('test_customers')
            .delete()
            .eq('customer_id', customer.customer_id)
            .eq('tenant_id', customer.tenant_id);

          if (deleteError) {
            console.error('🟡 [FIX-CUSTOMER-IDS] Error deleting customer:', deleteError);
          } else {
            fixedCount++;
            console.log('🟡 [FIX-CUSTOMER-IDS] Deleted duplicate customer:', customer.customer_id);
          }
        }
      }
    }

    // 获取修复后的客户记录
    const { data: remainingCustomers } = await supabase
      .from('test_customers')
      .select('*')
      .eq('tenant_id', siteId)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      success: true,
      message: 'Customer ID fix completed',
      siteId,
      originalCount: customers.length,
      fixedCount,
      remainingCount: remainingCustomers?.length || 0,
      actions,
      remainingCustomers: remainingCustomers || [],
    });
  } catch (error) {
    console.error('🟡 [FIX-CUSTOMER-IDS] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error during customer ID fix',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
