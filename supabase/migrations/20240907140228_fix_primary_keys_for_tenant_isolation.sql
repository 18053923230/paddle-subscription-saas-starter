-- 修复主键约束以支持租户隔离
-- 删除现有的主键约束和外键约束

-- 删除外键约束
ALTER TABLE public.test_subscriptions 
DROP CONSTRAINT IF EXISTS test_subscriptions_customer_id_fkey;

-- 删除主键约束
ALTER TABLE public.test_customers 
DROP CONSTRAINT IF EXISTS test_customers_pkey;

ALTER TABLE public.test_subscriptions 
DROP CONSTRAINT IF EXISTS test_subscriptions_pkey;

-- 创建新的复合主键，包含租户ID
ALTER TABLE public.test_customers 
ADD CONSTRAINT test_customers_pkey PRIMARY KEY (customer_id, tenant_id);

ALTER TABLE public.test_subscriptions 
ADD CONSTRAINT test_subscriptions_pkey PRIMARY KEY (subscription_id, tenant_id);

-- 重新创建外键约束，包含租户ID
ALTER TABLE public.test_subscriptions 
ADD CONSTRAINT test_subscriptions_customer_id_fkey 
FOREIGN KEY (customer_id, tenant_id) 
REFERENCES test_customers (customer_id, tenant_id);

-- 创建唯一索引确保email在租户内唯一
CREATE UNIQUE INDEX idx_test_customers_email_tenant 
ON public.test_customers (email, tenant_id);

-- 创建索引优化查询性能
CREATE INDEX idx_test_customers_tenant_email 
ON public.test_customers (tenant_id, email);

CREATE INDEX idx_test_subscriptions_tenant_customer 
ON public.test_subscriptions (tenant_id, customer_id);

-- 更新RLS策略以使用新的主键结构
DROP POLICY IF EXISTS "Allow tenant access and creation for customers" ON public.test_customers;
DROP POLICY IF EXISTS "Allow tenant access and creation for subscriptions" ON public.test_subscriptions;

-- 创建新的RLS策略
CREATE POLICY "Allow tenant access and creation for customers" ON public.test_customers
FOR ALL USING (
  tenant_id = current_setting('app.current_tenant_id', true)
);

CREATE POLICY "Allow tenant access and creation for subscriptions" ON public.test_subscriptions
FOR ALL USING (
  tenant_id = current_setting('app.current_tenant_id', true)
); 