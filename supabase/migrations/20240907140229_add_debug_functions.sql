-- 添加调试用的数据库函数

-- 检查重复email的函数
CREATE OR REPLACE FUNCTION check_duplicate_emails(tenant_id_param text)
RETURNS TABLE(email text, tenant_id text, count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.email,
    tc.tenant_id,
    COUNT(*) as count
  FROM public.test_customers tc
  WHERE tc.tenant_id = tenant_id_param
  GROUP BY tc.email, tc.tenant_id
  HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql;

-- 清理重复记录的函数
CREATE OR REPLACE FUNCTION cleanup_duplicate_customers(tenant_id_param text)
RETURNS TABLE(deleted_count integer, kept_customer_id text) AS $$
DECLARE
  duplicate_record RECORD;
  deleted_count_var integer := 0;
  kept_customer_id_var text;
BEGIN
  -- 查找重复的email记录
  FOR duplicate_record IN
    SELECT email, COUNT(*) as count
    FROM public.test_customers
    WHERE tenant_id = tenant_id_param
    GROUP BY email
    HAVING COUNT(*) > 1
  LOOP
    -- 保留第一个记录，删除其他重复记录
    WITH ranked_customers AS (
      SELECT 
        customer_id,
        ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) as rn
      FROM public.test_customers
      WHERE email = duplicate_record.email AND tenant_id = tenant_id_param
    )
    SELECT customer_id INTO kept_customer_id_var
    FROM ranked_customers
    WHERE rn = 1;
    
    -- 删除重复记录
    DELETE FROM public.test_customers
    WHERE email = duplicate_record.email 
      AND tenant_id = tenant_id_param
      AND customer_id != kept_customer_id_var;
    
    deleted_count_var := deleted_count_var + (duplicate_record.count - 1);
  END LOOP;
  
  RETURN QUERY SELECT deleted_count_var, kept_customer_id_var;
END;
$$ LANGUAGE plpgsql;

-- 获取租户统计信息的函数
CREATE OR REPLACE FUNCTION get_tenant_stats(tenant_id_param text)
RETURNS TABLE(
  total_customers bigint,
  total_subscriptions bigint,
  unique_emails bigint,
  duplicate_emails bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.test_customers WHERE tenant_id = tenant_id_param) as total_customers,
    (SELECT COUNT(*) FROM public.test_subscriptions WHERE tenant_id = tenant_id_param) as total_subscriptions,
    (SELECT COUNT(DISTINCT email) FROM public.test_customers WHERE tenant_id = tenant_id_param) as unique_emails,
    (SELECT COUNT(*) FROM (
      SELECT email, COUNT(*) as count
      FROM public.test_customers
      WHERE tenant_id = tenant_id_param
      GROUP BY email
      HAVING COUNT(*) > 1
    ) as duplicates) as duplicate_emails;
END;
$$ LANGUAGE plpgsql; 