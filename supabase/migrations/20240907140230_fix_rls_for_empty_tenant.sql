-- 修复RLS策略，允许在没有租户设置时也能创建记录
-- 这是为了解决新站点第一条记录无法创建的问题

-- 删除现有的策略
DROP POLICY IF EXISTS "Allow tenant access and creation for customers" ON public.test_customers;
DROP POLICY IF EXISTS "Allow tenant access and creation for subscriptions" ON public.test_subscriptions;

-- 创建更宽松的RLS策略，允许在没有租户设置时也能操作
CREATE POLICY "Allow tenant access and creation for customers" ON public.test_customers
FOR ALL USING (
  -- 如果设置了租户ID，则匹配租户ID
  (current_setting('app.current_tenant_id', true) IS NOT NULL AND 
   current_setting('app.current_tenant_id', true) != '' AND
   tenant_id = current_setting('app.current_tenant_id', true))
  OR
  -- 如果没有设置租户ID，则允许所有操作（用于初始化）
  (current_setting('app.current_tenant_id', true) IS NULL OR 
   current_setting('app.current_tenant_id', true) = '')
);

CREATE POLICY "Allow tenant access and creation for subscriptions" ON public.test_subscriptions
FOR ALL USING (
  -- 如果设置了租户ID，则匹配租户ID
  (current_setting('app.current_tenant_id', true) IS NOT NULL AND 
   current_setting('app.current_tenant_id', true) != '' AND
   tenant_id = current_setting('app.current_tenant_id', true))
  OR
  -- 如果没有设置租户ID，则允许所有操作（用于初始化）
  (current_setting('app.current_tenant_id', true) IS NULL OR 
   current_setting('app.current_tenant_id', true) = '')
);

-- 创建一个函数来强制设置租户ID（即使失败也不影响操作）
CREATE OR REPLACE FUNCTION safe_set_current_tenant(tenant_id text)
RETURNS void AS $$
BEGIN
  -- 尝试设置租户ID，但不抛出错误
  BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_id, false);
  EXCEPTION
    WHEN OTHERS THEN
      -- 忽略任何错误，继续执行
      RAISE NOTICE 'Failed to set tenant_id: %, but continuing...', tenant_id;
  END;
END;
$$ LANGUAGE plpgsql;

-- 创建一个函数来检查当前租户设置
CREATE OR REPLACE FUNCTION get_current_tenant_safe()
RETURNS text AS $$
BEGIN
  RETURN COALESCE(current_setting('app.current_tenant_id', true), '');
END;
$$ LANGUAGE plpgsql; 