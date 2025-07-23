import {
  CustomerCreatedEvent,
  CustomerUpdatedEvent,
  EventEntity,
  EventName,
  SubscriptionCreatedEvent,
  SubscriptionUpdatedEvent,
} from '@paddle/paddle-node-sdk';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export class ProcessWebhook {
  async processEvent(eventData: EventEntity) {
    console.log('🟢 [PROCESS WEBHOOK] Processing event:', {
      eventType: eventData.eventType,
      eventData: eventData,
      timestamp: new Date().toISOString(),
    });

    switch (eventData.eventType) {
      case EventName.SubscriptionCreated:
        console.log('🟢 [PROCESS WEBHOOK] Subscription Created event detected');
        await this.updateSubscriptionData(eventData);
        break;
      case EventName.SubscriptionUpdated:
        console.log('🟢 [PROCESS WEBHOOK] Subscription Updated event detected');
        await this.updateSubscriptionData(eventData);
        break;
      case EventName.CustomerCreated:
        console.log('🟢 [PROCESS WEBHOOK] Customer Created event detected');
        await this.updateCustomerData(eventData);
        break;
      case EventName.CustomerUpdated:
        console.log('🟢 [PROCESS WEBHOOK] Customer Updated event detected');
        await this.updateCustomerData(eventData);
        break;
      default:
        console.log('🟢 [PROCESS WEBHOOK] Unhandled event type:', eventData.eventType);
    }
  }

  private async updateSubscriptionData(eventData: SubscriptionCreatedEvent | SubscriptionUpdatedEvent) {
    console.log('🔴 [WRITE TO DB] Starting subscription data write to test_subscriptions table');

    // 获取当前站点ID
    const siteId = getCurrentSiteId();

    console.log('🔴 [WRITE TO DB] Current site ID:', siteId);

    console.log('🔴 [WRITE TO DB] Event data to be written:', {
      subscription_id: eventData.data.id,
      subscription_status: eventData.data.status,
      price_id: eventData.data.items[0].price?.id ?? '',
      product_id: eventData.data.items[0].price?.productId ?? '',
      scheduled_change: eventData.data.scheduledChange?.effectiveAt,
      customer_id: eventData.data.customerId,
      tenant_id: siteId,
      fullEventData: eventData,
      timestamp: new Date().toISOString(),
    });

    try {
      const supabase = await createClient();
      console.log('🔴 [WRITE TO DB] Supabase client created, executing upsert...');

      // 首先检查客户记录是否存在
      const { data: customerExists, error: customerCheckError } = await supabase
        .from('test_customers')
        .select('customer_id')
        .eq('customer_id', eventData.data.customerId)
        .eq('tenant_id', siteId)
        .single();

      console.log('🔴 [WRITE TO DB] Customer check result:', {
        exists: !!customerExists,
        error: customerCheckError?.message,
        customerId: eventData.data.customerId,
        tenantId: siteId,
      });

      const response = await supabase.from('test_subscriptions').upsert(
        {
          subscription_id: eventData.data.id,
          subscription_status: eventData.data.status,
          price_id: eventData.data.items[0].price?.id ?? '',
          product_id: eventData.data.items[0].price?.productId ?? '',
          scheduled_change: eventData.data.scheduledChange?.effectiveAt,
          customer_id: eventData.data.customerId,
          tenant_id: siteId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'subscription_id' },
      );

      if (response.error) {
        console.error('🔴 [WRITE TO DB] Error writing subscription data:', response.error);
      } else {
        console.log('🔴 [WRITE TO DB] Subscription data written successfully');
      }
    } catch (error) {
      console.error('🔴 [WRITE TO DB] Exception writing subscription data:', error);
    }
  }

  private async updateCustomerData(eventData: CustomerCreatedEvent | CustomerUpdatedEvent) {
    console.log('🔴 [WRITE TO DB] Starting customer data write to test_customers table');

    // 获取当前站点ID
    const siteId = getCurrentSiteId();

    console.log('🔴 [WRITE TO DB] Event data to be written:', {
      customer_id: eventData.data.id,
      email: eventData.data.email,
      tenant_id: siteId,
      fullEventData: eventData,
      timestamp: new Date().toISOString(),
    });

    try {
      const supabase = await createClient();
      console.log('🔴 [WRITE TO DB] Supabase client created, executing upsert...');

      const response = await supabase.from('test_customers').upsert(
        {
          customer_id: eventData.data.id,
          email: eventData.data.email,
          tenant_id: siteId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'customer_id' },
      );

      if (response.error) {
        console.error('🔴 [WRITE TO DB] Error writing customer data:', response.error);
      } else {
        console.log('🔴 [WRITE TO DB] Customer data written successfully');
      }
    } catch (error) {
      console.error('🔴 [WRITE TO DB] Exception writing customer data:', error);
    }
  }
}
