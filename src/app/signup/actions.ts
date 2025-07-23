'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

interface FormData {
  email: string;
  password: string;
}

export async function signup(data: FormData) {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signUp(data);

  if (error) {
    return { error: true };
  }

  // 注册成功后，创建客户记录
  if (authData.user?.email) {
    const siteId = getCurrentSiteId();

    console.log('🟡 [SIGNUP-ACTION] Processing signup for user:', authData.user.email, 'in tenant:', siteId);

    try {
      // 设置当前租户ID到数据库会话
      const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

      if (tenantError) {
        console.error('🟡 [SIGNUP-ACTION] Failed to set tenant:', tenantError);
      } else {
        console.log('🟡 [SIGNUP-ACTION] Successfully set tenant_id:', siteId);
      }

      // 检查是否已存在客户记录
      const { data: existingCustomer, error: checkError } = await supabase
        .from('test_customers')
        .select('customer_id')
        .eq('email', authData.user.email)
        .eq('tenant_id', siteId);

      console.log('🟡 [SIGNUP-ACTION] Existing customer check:', {
        exists: !!existingCustomer,
        count: existingCustomer?.length || 0,
        error: checkError?.message,
      });

      if (!existingCustomer || existingCustomer.length === 0) {
        // 创建新的客户记录
        const customerId = `ctm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log('🟡 [SIGNUP-ACTION] Creating new customer record:', {
          customerId,
          email: authData.user.email,
          tenantId: siteId,
        });

        const { data: newCustomer, error: insertError } = await supabase
          .from('test_customers')
          .insert({
            customer_id: customerId,
            email: authData.user.email,
            tenant_id: siteId,
          })
          .select()
          .single();

        if (insertError) {
          console.error('🟡 [SIGNUP-ACTION] Failed to create customer record:', insertError);
        } else {
          console.log('🟡 [SIGNUP-ACTION] Customer record created successfully:', newCustomer);
        }
      } else {
        console.log('🟡 [SIGNUP-ACTION] Customer record already exists:', existingCustomer[0]);
      }
    } catch (error) {
      console.error('🟡 [SIGNUP-ACTION] Error in customer record creation:', error);
    }
  }

  revalidatePath('/', 'layout');
  redirect('/');
}
