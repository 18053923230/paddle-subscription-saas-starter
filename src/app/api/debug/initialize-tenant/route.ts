import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function GET() {
  console.log('🟡 [INITIALIZE-TENANT] GET request - Initializing new tenant');
  return await initializeTenant();
}

export async function POST() {
  console.log('🟡 [INITIALIZE-TENANT] POST request - Initializing new tenant');
  return await initializeTenant();
}

async function initializeTenant() {
  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

    console.log('🟡 [INITIALIZE-TENANT] Initializing tenant:', siteId);

    // 检查是否已经有记录 - 修复查询逻辑
    const { data: existingRecords, error: checkError } = await supabase
      .from('test_customers')
      .select('*') // 改为select('*')而不是select('count')
      .eq('tenant_id', siteId);

    console.log('🟡 [INITIALIZE-TENANT] Existing records check:', {
      count: existingRecords?.length || 0,
      error: checkError?.message,
      records: existingRecords,
    });

    if (existingRecords && existingRecords.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Tenant already has records, no initialization needed',
        siteId,
        existingRecords: existingRecords.length,
        records: existingRecords,
      });
    }

    // 创建第一条记录（系统初始化记录）
    const initCustomerId = `init_${siteId}_${Date.now()}`;
    const initEmail = `system@${siteId}.com`;

    console.log('🟡 [INITIALIZE-TENANT] Creating initialization record:', {
      customerId: initCustomerId,
      email: initEmail,
      tenantId: siteId,
    });

    const { data: initRecord, error: insertError } = await supabase
      .from('test_customers')
      .insert({
        customer_id: initCustomerId,
        email: initEmail,
        tenant_id: siteId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('🟡 [INITIALIZE-TENANT] Failed to create init record:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
        },
        { status: 500 },
      );
    }

    console.log('🟡 [INITIALIZE-TENANT] Initialization record created successfully:', initRecord);

    // 验证记录是否真的创建了
    const { data: verifyRecord, error: verifyError } = await supabase
      .from('test_customers')
      .select('*')
      .eq('tenant_id', siteId);

    console.log('🟡 [INITIALIZE-TENANT] Verification:', {
      count: verifyRecord?.length || 0,
      error: verifyError?.message,
      records: verifyRecord,
    });

    return NextResponse.json({
      success: true,
      message: 'Tenant initialized successfully',
      siteId,
      initRecord,
      verification: {
        success: !verifyError,
        count: verifyRecord?.length || 0,
        error: verifyError?.message,
        records: verifyRecord,
      },
    });
  } catch (error) {
    console.error('🟡 [INITIALIZE-TENANT] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
