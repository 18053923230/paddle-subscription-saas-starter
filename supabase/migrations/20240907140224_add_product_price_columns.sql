-- Add product_id and price_id columns to test_subscriptions table
ALTER TABLE public.test_subscriptions 
ADD COLUMN IF NOT EXISTS product_id text,
ADD COLUMN IF NOT EXISTS price_id text;

-- Add comments for documentation
COMMENT ON COLUMN public.test_subscriptions.product_id IS 'Product ID from Paddle';
COMMENT ON COLUMN public.test_subscriptions.price_id IS 'Price ID from Paddle'; 