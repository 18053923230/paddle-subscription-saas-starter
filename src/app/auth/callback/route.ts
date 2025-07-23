import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
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

      if (userEmail) {
        try {
          // 检查是否已存在客户记录
          const { data: existingCustomer } = await supabase
            .from('test_customers')
            .select('customer_id')
            .eq('email', userEmail)
            .eq('tenant_id', siteId)
            .single();

          if (!existingCustomer) {
            // 创建新的客户记录
            const { error: insertError } = await supabase.from('test_customers').insert({
              customer_id: `ctm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              email: userEmail,
              tenant_id: siteId,
            });

            if (insertError) {
              console.error('Failed to create customer record:', insertError);
            } else {
              console.log('Customer record created successfully for:', userEmail, 'in tenant:', siteId);
            }
          }
        } catch (error) {
          console.error('Error in customer record creation:', error);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
