-- Add tenant_id column to existing tables
ALTER TABLE public.test_customers 
ADD COLUMN tenant_id text NOT NULL DEFAULT 'default';

ALTER TABLE public.test_subscriptions 
ADD COLUMN tenant_id text NOT NULL DEFAULT 'default';

-- Create index for better performance
CREATE INDEX idx_test_customers_tenant_id ON public.test_customers(tenant_id);
CREATE INDEX idx_test_subscriptions_tenant_id ON public.test_subscriptions(tenant_id);

-- Enable RLS on both tables
ALTER TABLE public.test_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users to test_customers" ON public.test_customers;
DROP POLICY IF EXISTS "Enable read access for authenticated users to test_subscriptions" ON public.test_subscriptions;

-- Create new RLS policies for tenant isolation
CREATE POLICY "Users can only access their tenant's customers" ON public.test_customers
FOR ALL USING (
  tenant_id = COALESCE(
    current_setting('app.current_tenant_id', true),
    'default'
  )
);

CREATE POLICY "Users can only access their tenant's subscriptions" ON public.test_subscriptions
FOR ALL USING (
  tenant_id = COALESCE(
    current_setting('app.current_tenant_id', true),
    'default'
  )
);

-- Create function to set current tenant
CREATE OR REPLACE FUNCTION set_current_tenant(tenant_id text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id, false);
END;
$$ LANGUAGE plpgsql;

-- Create function to get current tenant
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS text AS $$
BEGIN
  RETURN COALESCE(
    current_setting('app.current_tenant_id', true),
    'default'
  );
END;
$$ LANGUAGE plpgsql; 