'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

interface FormData {
  email: string;
  password: string;
}

export async function login(data: FormData) {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: true };
  }

  // 登录成功后，创建客户记录
  if (authData.user?.email) {
    const siteId = getCurrentSiteId();

    console.log('🟡 [LOGIN-ACTION] Processing login for user:', authData.user.email, 'in tenant:', siteId);

    try {
      // 设置当前租户ID到数据库会话
      const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

      if (tenantError) {
        console.error('🟡 [LOGIN-ACTION] Failed to set tenant:', tenantError);
      } else {
        console.log('🟡 [LOGIN-ACTION] Successfully set tenant_id:', siteId);
      }

      // 检查是否已存在客户记录
      const { data: existingCustomer, error: checkError } = await supabase
        .from('test_customers')
        .select('customer_id')
        .eq('email', authData.user.email)
        .eq('tenant_id', siteId);

      console.log('🟡 [LOGIN-ACTION] Existing customer check:', {
        exists: !!existingCustomer,
        count: existingCustomer?.length || 0,
        error: checkError?.message,
      });

      if (!existingCustomer || existingCustomer.length === 0) {
        // 创建新的客户记录
        const customerId = `ctm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log('🟡 [LOGIN-ACTION] Creating new customer record:', {
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
          console.error('🟡 [LOGIN-ACTION] Failed to create customer record:', insertError);
        } else {
          console.log('🟡 [LOGIN-ACTION] Customer record created successfully:', newCustomer);
        }
      } else {
        console.log('🟡 [LOGIN-ACTION] Customer record already exists:', existingCustomer[0]);
      }
    } catch (error) {
      console.error('🟡 [LOGIN-ACTION] Error in customer record creation:', error);
    }
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signInWithGithub() {
  const supabase = await createClient();

  // 获取当前站点的URL
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000';

  console.log('🟡 [GITHUB-LOGIN] Starting GitHub OAuth with redirect URL:', `${siteUrl}/auth/callback`);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    console.error('🟡 [GITHUB-LOGIN] OAuth error:', error);
    return { error: true };
  }

  if (data.url) {
    console.log('🟡 [GITHUB-LOGIN] Redirecting to OAuth URL');
    redirect(data.url);
  } else {
    console.error('🟡 [GITHUB-LOGIN] No OAuth URL received');
    return { error: true };
  }
}

export async function loginAnonymously() {
  const supabase = await createClient();
  const { data: authData, error: signInError } = await supabase.auth.signInAnonymously();
  const { error: updateUserError } = await supabase.auth.updateUser({
    email: `anonymous+${Date.now().toString(36)}@example.com`,
  });

  if (signInError || updateUserError) {
    return { error: true };
  }

  // 匿名登录成功后，也创建客户记录
  if (authData.user?.email) {
    const siteId = getCurrentSiteId();

    console.log('🟡 [LOGIN-ANONYMOUS] Processing anonymous login for user:', authData.user.email, 'in tenant:', siteId);

    try {
      // 设置当前租户ID到数据库会话
      const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

      if (tenantError) {
        console.error('🟡 [LOGIN-ANONYMOUS] Failed to set tenant:', tenantError);
      } else {
        console.log('🟡 [LOGIN-ANONYMOUS] Successfully set tenant_id:', siteId);
      }

      // 检查是否已存在客户记录
      const { data: existingCustomer, error: checkError } = await supabase
        .from('test_customers')
        .select('customer_id')
        .eq('email', authData.user.email)
        .eq('tenant_id', siteId);

      console.log('🟡 [LOGIN-ANONYMOUS] Existing customer check:', {
        exists: !!existingCustomer,
        count: existingCustomer?.length || 0,
        error: checkError?.message,
      });

      if (!existingCustomer || existingCustomer.length === 0) {
        // 创建新的客户记录
        const customerId = `ctm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log('🟡 [LOGIN-ANONYMOUS] Creating new customer record:', {
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
          console.error('🟡 [LOGIN-ANONYMOUS] Failed to create customer record:', insertError);
        } else {
          console.log('🟡 [LOGIN-ANONYMOUS] Customer record created successfully:', newCustomer);
        }
      } else {
        console.log('🟡 [LOGIN-ANONYMOUS] Customer record already exists:', existingCustomer[0]);
      }
    } catch (error) {
      console.error('🟡 [LOGIN-ANONYMOUS] Error in customer record creation:', error);
    }
  }

  revalidatePath('/', 'layout');
  redirect('/');
}
