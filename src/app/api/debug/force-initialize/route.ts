import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function GET() {
  console.log('🟡 [FORCE-INITIALIZE] Force initializing new tenant');
  return await forceInitialize();
}

export async function POST() {
  console.log('🟡 [FORCE-INITIALIZE] POST request - Force initializing new tenant');
  return await forceInitialize();
}

async function forceInitialize() {
  try {
    const supabase = await createClient();
    const siteId = getCurrentSiteId();

    console.log('🟡 [FORCE-INITIALIZE] Force initializing tenant:', siteId);

    // 先查看现有记录
    const { data: existingRecords, error: checkError } = await supabase
      .from('test_customers')
      .select('*')
      .eq('tenant_id', siteId);

    console.log('🟡 [FORCE-INITIALIZE] Existing records check:', {
      count: existingRecords?.length || 0,
      error: checkError?.message,
      records: existingRecords,
    });

    // 强制创建一条新记录
    const forceCustomerId = `force_${siteId}_${Date.now()}`;
    const forceEmail = `force@${siteId}.com`;

    console.log('🟡 [FORCE-INITIALIZE] Creating force initialization record:', {
      customerId: forceCustomerId,
      email: forceEmail,
      tenantId: siteId,
    });

    const { data: forceRecord, error: insertError } = await supabase
      .from('test_customers')
      .insert({
        customer_id: forceCustomerId,
        email: forceEmail,
        tenant_id: siteId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('🟡 [FORCE-INITIALIZE] Failed to create force record:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
        },
        { status: 500 },
      );
    }

    console.log('🟡 [FORCE-INITIALIZE] Force record created successfully:', forceRecord);

    // 验证记录是否真的创建了
    const { data: verifyRecord, error: verifyError } = await supabase
      .from('test_customers')
      .select('*')
      .eq('tenant_id', siteId)
      .order('created_at', { ascending: false });

    console.log('🟡 [FORCE-INITIALIZE] Verification:', {
      count: verifyRecord?.length || 0,
      error: verifyError?.message,
      records: verifyRecord,
    });

    // 检查所有记录
    const { data: allRecords, error: allRecordsError } = await supabase
      .from('test_customers')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('🟡 [FORCE-INITIALIZE] All records check:', {
      count: allRecords?.length || 0,
      error: allRecordsError?.message,
    });

    return NextResponse.json({
      success: true,
      message: 'Force initialization completed',
      siteId,
      forceRecord,
      beforeCount: existingRecords?.length || 0,
      afterCount: verifyRecord?.length || 0,
      totalRecords: allRecords?.length || 0,
      verification: {
        success: !verifyError,
        count: verifyRecord?.length || 0,
        error: verifyError?.message,
        records: verifyRecord,
      },
      allRecords: {
        count: allRecords?.length || 0,
        error: allRecordsError?.message,
        records: allRecords,
      },
    });
  } catch (error) {
    console.error('🟡 [FORCE-INITIALIZE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
