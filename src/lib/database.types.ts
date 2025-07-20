export interface Subscription {
  subscription_id: string;
  subscription_status: string;
  price_id: string | null;
  product_id: string | null;
  scheduled_change: string | null;
  customer_id: string;
  created_at: string;
  updated_at: string;
}
