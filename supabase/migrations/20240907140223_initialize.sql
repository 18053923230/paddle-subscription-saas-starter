-- Create customers table to map Paddle customer_id to email
create table
  public.test_customers (
    customer_id text not null,
    email text not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint test_customers_pkey primary key (customer_id)
  ) tablespace pg_default;

-- Create subscription table to store webhook events sent by Paddle
create table
  public.test_subscriptions (
    subscription_id text not null,
    subscription_status text not null,
    price_id text null,
    product_id text null,
    scheduled_change text null,
    customer_id text not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint test_subscriptions_pkey primary key (subscription_id),
    constraint test_subscriptions_customer_id_fkey foreign key (customer_id) references test_customers (customer_id)
  ) tablespace pg_default;

-- Grant access to authenticated users to read the customers table to get the customer_id based on the email
create policy "Enable read access for authenticated users to test_customers" on "public"."test_customers" as PERMISSIVE for SELECT to authenticated using ( true );

-- Grant access to authenticated users to read the subscriptions table
create policy "Enable read access for authenticated users to test_subscriptions" on "public"."test_subscriptions" as PERMISSIVE for SELECT to authenticated using ( true );
