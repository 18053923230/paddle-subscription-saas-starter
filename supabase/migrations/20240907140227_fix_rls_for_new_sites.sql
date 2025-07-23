-- 修复RLS策略，允许新站点创建记录
-- 对于新站点，如果没有现有记录，允许创建

-- 删除现有的严格策略
DROP POLICY IF EXISTS "Users can only access their tenant's customers" ON public.test_customers;
DROP POLICY IF EXISTS "Users can only access their tenant's subscriptions" ON public.test_subscriptions;

-- 创建更灵活的RLS策略
-- 允许访问当前租户的记录，也允许创建新记录
CREATE POLICY "Allow tenant access and creation for customers" ON public.test_customers
FOR ALL USING (
  tenant_id = current_setting('app.current_tenant_id', true)
);

CREATE POLICY "Allow tenant access and creation for subscriptions" ON public.test_subscriptions
FOR ALL USING (
  tenant_id = current_setting('app.current_tenant_id', true)
);

-- 添加一个函数来检查租户是否存在记录
CREATE OR REPLACE FUNCTION tenant_has_records(tenant_id text)
RETURNS boolean AS $$
DECLARE
  customer_count integer;
  subscription_count integer;
BEGIN
  SELECT COUNT(*) INTO customer_count 
  FROM public.test_customers 
  WHERE tenant_id = $1;
  
  SELECT COUNT(*) INTO subscription_count 
  FROM public.test_subscriptions 
  WHERE tenant_id = $1;
  
  RETURN (customer_count > 0 OR subscription_count > 0);
END;
$$ LANGUAGE plpgsql;

-- 添加一个函数来初始化新租户
CREATE OR REPLACE FUNCTION initialize_tenant(tenant_id text)
RETURNS void AS $$
BEGIN
  -- 这里可以添加新租户的初始化逻辑
  -- 比如创建默认记录等
  RAISE NOTICE 'Initializing new tenant: %', tenant_id;
END;
$$ LANGUAGE plpgsql; 