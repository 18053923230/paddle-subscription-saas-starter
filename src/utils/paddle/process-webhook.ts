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

    // 获取Paddle customer_id
    const paddleCustomerId = eventData.data.customerId;
    console.log('🔴 [WRITE TO DB] Processing subscription for Paddle customer:', paddleCustomerId);

    console.log('🔴 [WRITE TO DB] Event data to be written:', {
      subscription_id: eventData.data.id,
      subscription_status: eventData.data.status,
      price_id: eventData.data.items[0].price?.id ?? '',
      product_id: eventData.data.items[0].price?.productId ?? '',
      scheduled_change: eventData.data.scheduledChange?.effectiveAt,
      customer_id: paddleCustomerId,
      fullEventData: eventData,
      timestamp: new Date().toISOString(),
    });

    try {
      const supabase = await createClient();
      console.log('🔴 [WRITE TO DB] Supabase client created, searching for customer across all tenants...');

      // 首先，通过Paddle customer_id查找客户记录（跨所有租户）
      const { data: customerAcrossTenants, error: customerSearchError } = await supabase
        .from('test_customers')
        .select('customer_id, email, tenant_id')
        .eq('customer_id', paddleCustomerId);

      console.log('🔴 [WRITE TO DB] Customer search result:', {
        found: !!customerAcrossTenants,
        count: customerAcrossTenants?.length || 0,
        error: customerSearchError?.message,
        customers: customerAcrossTenants,
      });

      if (customerSearchError) {
        console.error('🔴 [WRITE TO DB] Error searching for customer:', customerSearchError);
        return;
      }

      // 如果找到了客户记录，使用第一个（应该只有一个）
      let existingCustomer = null;
      let targetTenantId = null;

      if (customerAcrossTenants && customerAcrossTenants.length > 0) {
        existingCustomer = customerAcrossTenants[0];
        targetTenantId = existingCustomer.tenant_id;

        console.log('🔴 [WRITE TO DB] Found existing customer:', {
          customerId: existingCustomer.customer_id,
          email: existingCustomer.email,
          tenantId: targetTenantId,
        });
      } else {
        // 如果没找到客户记录，尝试通过email查找
        console.log('🔴 [WRITE TO DB] No customer found by Paddle ID, trying to get email from Paddle...');

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
          // 通过email查找客户记录
          const { data: customerByEmail, error: emailSearchError } = await supabase
            .from('test_customers')
            .select('customer_id, email, tenant_id, created_at')
            .eq('email', customerEmail);

          console.log('🔴 [WRITE TO DB] Email search result:', {
            found: !!customerByEmail,
            count: customerByEmail?.length || 0,
            error: emailSearchError?.message,
            customers: customerByEmail,
          });

          if (customerByEmail && customerByEmail.length > 0) {
            // 如果找到多个，选择最早创建的
            customerByEmail.sort(
              (a: { created_at: string }, b: { created_at: string }) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            );

            existingCustomer = customerByEmail[0];
            targetTenantId = existingCustomer.tenant_id;

            console.log('🔴 [WRITE TO DB] Found customer by email:', {
              customerId: existingCustomer.customer_id,
              email: existingCustomer.email,
              tenantId: targetTenantId,
            });
          }
        }
      }

      // 如果仍然没找到客户记录，记录错误并返回
      if (!existingCustomer || !targetTenantId) {
        console.error('🔴 [WRITE TO DB] No customer record found for Paddle customer ID:', paddleCustomerId);
        console.error('🔴 [WRITE TO DB] Cannot determine which tenant to process subscription for');
        return;
      }

      // 设置目标租户ID
      console.log('🔴 [WRITE TO DB] Setting target tenant ID:', targetTenantId);

      const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: targetTenantId });

      if (tenantError) {
        console.error('🔴 [WRITE TO DB] Failed to set target tenant:', tenantError);
        return;
      } else {
        console.log('🔴 [WRITE TO DB] Successfully set target tenant_id:', targetTenantId);
      }

      // 验证租户设置是否生效
      const { data: currentTenant } = await supabase.rpc('get_current_tenant_safe');
      console.log('🔴 [WRITE TO DB] Current tenant setting:', currentTenant);

      if (currentTenant !== targetTenantId) {
        console.error('🔴 [WRITE TO DB] Tenant mismatch! Expected:', targetTenantId, 'Got:', currentTenant);
        return;
      }

      // 最终验证：确保我们只处理目标租户的数据
      console.log(
        '🔴 [WRITE TO DB] Final validation - Customer tenant:',
        existingCustomer.tenant_id,
        'Target tenant:',
        targetTenantId,
      );

      if (existingCustomer.tenant_id !== targetTenantId) {
        console.error('🔴 [WRITE TO DB] Final tenant validation failed! Aborting subscription creation.');
        return;
      }

      // 使用现有客户的customer_id创建订阅记录
      console.log(
        '🔴 [WRITE TO DB] Creating subscription for customer:',
        existingCustomer.customer_id,
        'in tenant:',
        targetTenantId,
      );

      const response = await supabase.from('test_subscriptions').upsert(
        {
          subscription_id: eventData.data.id,
          subscription_status: eventData.data.status,
          price_id: eventData.data.items[0].price?.id ?? '',
          product_id: eventData.data.items[0].price?.productId ?? '',
          scheduled_change: eventData.data.scheduledChange?.effectiveAt,
          customer_id: existingCustomer.customer_id, // 使用现有客户的ID
          tenant_id: targetTenantId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'subscription_id,tenant_id' }, // 更新冲突检测字段
      );

      if (response.error) {
        console.error('🔴 [WRITE TO DB] Error writing subscription data:', response.error);
      } else {
        console.log('🔴 [WRITE TO DB] Subscription data written successfully for tenant:', targetTenantId);
        console.log('🔴 [WRITE TO DB] Subscription details:', {
          subscriptionId: eventData.data.id,
          customerId: existingCustomer.customer_id,
          tenantId: targetTenantId,
          status: eventData.data.status,
        });
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
