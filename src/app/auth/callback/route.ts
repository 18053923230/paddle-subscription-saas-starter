import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // 登录成功后，自动创建客户记录
      const siteId = getCurrentSiteId();
      const userEmail = data.user.email;

      console.log('🟡 [AUTH-CALLBACK] Processing login for user:', userEmail, 'in tenant:', siteId);

      if (userEmail) {
        try {
          // 设置当前租户ID到数据库会话
          const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

          if (tenantError) {
            console.error('🟡 [AUTH-CALLBACK] Failed to set tenant:', tenantError);
          } else {
            console.log('🟡 [AUTH-CALLBACK] Successfully set tenant_id:', siteId);
          }

          // 检查是否已存在客户记录
          const { data: existingCustomer, error: checkError } = await supabase
            .from('test_customers')
            .select('customer_id')
            .eq('email', userEmail)
            .eq('tenant_id', siteId);

          console.log('🟡 [AUTH-CALLBACK] Existing customer check:', {
            exists: !!existingCustomer,
            count: existingCustomer?.length || 0,
            error: checkError?.message,
          });

          if (!existingCustomer || existingCustomer.length === 0) {
            // 创建新的客户记录
            const customerId = `ctm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            console.log('🟡 [AUTH-CALLBACK] Creating new customer record:', {
              customerId,
              email: userEmail,
              tenantId: siteId,
            });

            const { data: newCustomer, error: insertError } = await supabase
              .from('test_customers')
              .insert({
                customer_id: customerId,
                email: userEmail,
                tenant_id: siteId,
              })
              .select()
              .single();

            if (insertError) {
              console.error('🟡 [AUTH-CALLBACK] Failed to create customer record:', insertError);
            } else {
              console.log('🟡 [AUTH-CALLBACK] Customer record created successfully:', newCustomer);
            }
          } else {
            console.log('🟡 [AUTH-CALLBACK] Customer record already exists:', existingCustomer[0]);
          }
        } catch (error) {
          console.error('🟡 [AUTH-CALLBACK] Error in customer record creation:', error);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
