import { createClient } from '@/utils/supabase/server';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function getCustomerId() {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  if (user.data.user?.email) {
    // 获取当前站点ID
    const siteId = getCurrentSiteId();

    const customersData = await supabase
      .from('test_customers')
      .select('customer_id,email,tenant_id')
      .eq('email', user.data.user?.email)
      .eq('tenant_id', siteId)
      .single();

    if (customersData?.data?.customer_id) {
      return customersData?.data?.customer_id as string;
    }
  }
  return '';
}
