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
import { getPaddleInstance } from '@/utils/paddle/get-paddle-instance';
import { hasSubscriptionPending, clearSubscriptionPending } from '@/utils/subscription-state';

export class ProcessWebhook {
  async processEvent(eventData: EventEntity) {
    console.log('🟢 [PROCESS WEBHOOK] Processing event:', {
      eventType: eventData.eventType,
      eventData: eventData,
      timestamp: new Date().toISOString(),
    });

    // 验证这个事件是否属于当前站点
    const currentSiteId = getCurrentSiteId();
    console.log('🟢 [PROCESS WEBHOOK] Current site ID:', currentSiteId);

    // 检查事件是否包含产品信息
    let shouldProcess = false;

    if (
      eventData.eventType === EventName.SubscriptionCreated ||
      eventData.eventType === EventName.SubscriptionUpdated
    ) {
      const subscriptionEvent = eventData as SubscriptionCreatedEvent | SubscriptionUpdatedEvent;
      const productId = subscriptionEvent.data.items[0]?.price?.productId;

      console.log('🟢 [PROCESS WEBHOOK] Event product ID:', productId);

      // 获取客户邮箱
      let customerEmail = null;
      try {
        const paddle = getPaddleInstance();
        const customerData = await paddle.customers.get(subscriptionEvent.data.customerId);
        customerEmail = customerData.email;
        console.log('🟢 [PROCESS WEBHOOK] Customer email from Paddle:', customerEmail);
      } catch (paddleError) {
        console.error('🟢 [PROCESS WEBHOOK] Failed to get customer data from Paddle:', paddleError);
      }

      // 检查是否有主动订阅状态
      if (customerEmail && hasSubscriptionPending(customerEmail)) {
        shouldProcess = true;
        console.log(
          '🟢 [PROCESS WEBHOOK] Found active subscription state, will process event for site:',
          currentSiteId,
        );
      } else {
        console.log(
          '🟢 [PROCESS WEBHOOK] No active subscription state found, ignoring webhook for email:',
          customerEmail,
        );
        return; // 直接返回，不处理
      }
    } else if (eventData.eventType === EventName.CustomerCreated || eventData.eventType === EventName.CustomerUpdated) {
      shouldProcess = true;
      console.log('🟢 [PROCESS WEBHOOK] Will process customer event for site:', currentSiteId);
    }

    if (!shouldProcess) {
      console.log('🟢 [PROCESS WEBHOOK] Skipping event - not relevant for current site');
      return;
    }

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

    // 直接使用当前站点的租户ID
    const siteId = getCurrentSiteId();
    const paddleCustomerId = eventData.data.customerId;

    console.log('🔴 [WRITE TO DB] Current site ID:', siteId);
    console.log('🔴 [WRITE TO DB] Processing subscription for Paddle customer:', paddleCustomerId);

    console.log('🔴 [WRITE TO DB] Event data to be written:', {
      subscription_id: eventData.data.id,
      subscription_status: eventData.data.status,
      price_id: eventData.data.items[0].price?.id ?? '',
      product_id: eventData.data.items[0].price?.productId ?? '',
      scheduled_change: eventData.data.scheduledChange?.effectiveAt,
      customer_id: paddleCustomerId,
      tenant_id: siteId,
      fullEventData: eventData,
      timestamp: new Date().toISOString(),
    });

    try {
      const supabase = await createClient();
      console.log('🔴 [WRITE TO DB] Supabase client created, setting tenant:', siteId);

      // 设置当前租户ID
      const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

      if (tenantError) {
        console.error('🔴 [WRITE TO DB] Failed to set tenant:', tenantError);
        return;
      }

      console.log('🔴 [WRITE TO DB] Successfully set tenant_id:', siteId);

      // 在当前租户中查找客户记录
      let existingCustomer = null;

      // 首先通过Paddle customer_id查找
      const { data: customerById } = await supabase
        .from('test_customers')
        .select('customer_id, email, tenant_id')
        .eq('customer_id', paddleCustomerId)
        .eq('tenant_id', siteId)
        .single();

      if (customerById) {
        existingCustomer = customerById;
        console.log('🔴 [WRITE TO DB] Found existing customer by Paddle ID:', existingCustomer);
      } else {
        // 如果没找到，尝试通过email查找
        let customerEmail = null;
        try {
          const paddle = getPaddleInstance();
          const customerData = await paddle.customers.get(paddleCustomerId);
          customerEmail = customerData.email;
          console.log('🔴 [WRITE TO DB] Retrieved customer email from Paddle:', customerEmail);
        } catch (paddleError) {
          console.error('🔴 [WRITE TO DB] Failed to get customer data from Paddle:', paddleError);
        }

        if (customerEmail) {
          const { data: customerByEmail } = await supabase
            .from('test_customers')
            .select('customer_id, email, tenant_id')
            .eq('email', customerEmail)
            .eq('tenant_id', siteId)
            .single();

          if (customerByEmail) {
            existingCustomer = customerByEmail;
            console.log('🔴 [WRITE TO DB] Found existing customer by email:', existingCustomer);
          }
        }
      }

      // 如果客户记录不存在，创建新的客户记录
      if (!existingCustomer) {
        console.log('🔴 [WRITE TO DB] No existing customer record found, creating new customer');

        let customerEmail = null;
        try {
          const paddle = getPaddleInstance();
          const customerData = await paddle.customers.get(paddleCustomerId);
          customerEmail = customerData.email;
        } catch (paddleError) {
          console.error('🔴 [WRITE TO DB] Failed to get customer data from Paddle:', paddleError);
        }

        const { data: newCustomer, error: customerInsertError } = await supabase
          .from('test_customers')
          .insert({
            customer_id: paddleCustomerId,
            email: customerEmail || `customer_${paddleCustomerId}@paddle.com`,
            tenant_id: siteId,
          })
          .select()
          .single();

        if (customerInsertError) {
          console.error('🔴 [WRITE TO DB] Failed to create customer record:', customerInsertError);
          return;
        }

        existingCustomer = newCustomer;
        console.log('🔴 [WRITE TO DB] Customer record created successfully:', newCustomer);
      }

      // 创建订阅记录
      console.log(
        '🔴 [WRITE TO DB] Creating subscription for customer:',
        existingCustomer.customer_id,
        'in tenant:',
        siteId,
      );

      const response = await supabase.from('test_subscriptions').upsert(
        {
          subscription_id: eventData.data.id,
          subscription_status: eventData.data.status,
          price_id: eventData.data.items[0].price?.id ?? '',
          product_id: eventData.data.items[0].price?.productId ?? '',
          scheduled_change: eventData.data.scheduledChange?.effectiveAt,
          customer_id: existingCustomer.customer_id,
          tenant_id: siteId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'subscription_id,tenant_id' },
      );

      if (response.error) {
        console.error('🔴 [WRITE TO DB] Error writing subscription data:', response.error);
      } else {
        console.log('🔴 [WRITE TO DB] Subscription data written successfully for tenant:', siteId);
        console.log('🔴 [WRITE TO DB] Subscription details:', {
          subscriptionId: eventData.data.id,
          customerId: existingCustomer.customer_id,
          tenantId: siteId,
          status: eventData.data.status,
        });

        // 写入成功后清除订阅状态
        if (existingCustomer.email) {
          clearSubscriptionPending(existingCustomer.email);
          console.log('🔴 [WRITE TO DB] Cleared subscription state for:', existingCustomer.email);
        }
      }
    } catch (error) {
      console.error('🔴 [WRITE TO DB] Exception writing subscription data:', error);
    }
  }

  private async updateCustomerData(eventData: CustomerCreatedEvent | CustomerUpdatedEvent) {
    console.log('🔴 [WRITE TO DB] Starting customer data write to test_customers table');

    // 获取当前站点ID
    const siteId = getCurrentSiteId();

    console.log('🔴 [WRITE TO DB] Current site ID:', siteId);

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

      // 设置当前租户ID到数据库会话
      const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

      if (tenantError) {
        console.error('🔴 [WRITE TO DB] Failed to set tenant for customer:', tenantError);
      } else {
        console.log('🔴 [WRITE TO DB] Successfully set tenant_id for customer:', siteId);
      }

      const response = await supabase.from('test_customers').upsert(
        {
          customer_id: eventData.data.id,
          email: eventData.data.email,
          tenant_id: siteId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'customer_id,tenant_id' }, // 更新冲突检测字段
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
