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

    // 获取当前站点ID
    const siteId = getCurrentSiteId();

    console.log('🔴 [WRITE TO DB] Current site ID:', siteId);
    console.log('🔴 [WRITE TO DB] Processing subscription for tenant:', siteId);

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

      // 强制设置当前租户ID到数据库会话
      const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

      if (tenantError) {
        console.error('🔴 [WRITE TO DB] Failed to set tenant for subscription:', tenantError);
        return; // 如果无法设置租户，直接返回，不处理
      } else {
        console.log('🔴 [WRITE TO DB] Successfully set tenant_id for subscription:', siteId);
      }

      // 验证租户设置是否生效
      const { data: currentTenant } = await supabase.rpc('get_current_tenant_safe');
      console.log('🔴 [WRITE TO DB] Current tenant setting:', currentTenant);

      if (currentTenant !== siteId) {
        console.error('🔴 [WRITE TO DB] Tenant mismatch! Expected:', siteId, 'Got:', currentTenant);
        return; // 租户不匹配，不处理
      }

      // 从Paddle获取客户信息以获取email
      let customerEmail = null;
      try {
        const paddle = getPaddleInstance();
        const customerData = await paddle.customers.get(eventData.data.customerId);
        customerEmail = customerData.email;
        console.log('🔴 [WRITE TO DB] Retrieved customer email from Paddle:', customerEmail);
      } catch (paddleError) {
        console.error('🔴 [WRITE TO DB] Failed to get customer data from Paddle:', paddleError);
      }

      // 优先通过Paddle customer_id查找现有的客户记录（这是最可靠的方式）
      let existingCustomer = null;

      console.log(
        '🔴 [WRITE TO DB] Searching for customer by Paddle ID:',
        eventData.data.customerId,
        'in tenant:',
        siteId,
      );

      const { data: customerById, error: idCheckError } = await supabase
        .from('test_customers')
        .select('customer_id, email, tenant_id')
        .eq('customer_id', eventData.data.customerId)
        .eq('tenant_id', siteId)
        .single();

      console.log('🔴 [WRITE TO DB] Customer check by ID result:', {
        exists: !!customerById,
        error: idCheckError?.message,
        customerId: eventData.data.customerId,
        tenantId: siteId,
        foundCustomer: customerById,
      });

      if (customerById) {
        existingCustomer = customerById;

        // 验证租户ID
        if (existingCustomer.tenant_id !== siteId) {
          console.error(
            '🔴 [WRITE TO DB] Customer tenant mismatch! Expected:',
            siteId,
            'Got:',
            existingCustomer.tenant_id,
          );
          return;
        }

        console.log('🔴 [WRITE TO DB] Found existing customer by Paddle ID:', existingCustomer);
      }

      // 如果通过Paddle customer_id没找到，再尝试通过email查找（作为备用方案）
      if (!existingCustomer && customerEmail) {
        console.log(
          '🔴 [WRITE TO DB] No customer found by Paddle ID, trying email:',
          customerEmail,
          'in tenant:',
          siteId,
        );

        const { data: customerByEmail, error: emailCheckError } = await supabase
          .from('test_customers')
          .select('customer_id, email, tenant_id')
          .eq('email', customerEmail)
          .eq('tenant_id', siteId)
          .single();

        if (emailCheckError) {
          console.log('🔴 [WRITE TO DB] No customer found by email either:', customerEmail, 'in tenant:', siteId);
        } else {
          existingCustomer = customerByEmail;
          console.log('🔴 [WRITE TO DB] Found existing customer by email (backup method):', existingCustomer);

          // 验证租户ID
          if (existingCustomer.tenant_id !== siteId) {
            console.error(
              '🔴 [WRITE TO DB] Customer tenant mismatch! Expected:',
              siteId,
              'Got:',
              existingCustomer.tenant_id,
            );
            return;
          }
        }
      }

      // 如果客户记录不存在，创建新的客户记录（使用Paddle的customer_id）
      if (!existingCustomer) {
        console.log('🔴 [WRITE TO DB] No existing customer record found, creating new customer with Paddle ID');
        console.log('🔴 [WRITE TO DB] Paddle customer ID:', eventData.data.customerId);
        console.log('🔴 [WRITE TO DB] Customer email:', customerEmail);
        console.log('🔴 [WRITE TO DB] Tenant ID:', siteId);

        // 创建新的客户记录，使用Paddle的customer_id
        const { data: newCustomer, error: customerInsertError } = await supabase
          .from('test_customers')
          .insert({
            customer_id: eventData.data.customerId, // 使用Paddle的customer_id
            email: customerEmail || `customer_${eventData.data.customerId}@paddle.com`,
            tenant_id: siteId,
          })
          .select()
          .single();

        if (customerInsertError) {
          console.error('🔴 [WRITE TO DB] Failed to create customer record:', customerInsertError);
          return; // 如果无法创建客户记录，不创建订阅记录
        } else {
          existingCustomer = newCustomer;
          console.log('🔴 [WRITE TO DB] Customer record created successfully with Paddle ID:', newCustomer);
        }
      }

      // 最终验证：确保我们只处理当前租户的数据
      console.log(
        '🔴 [WRITE TO DB] Final validation - Customer tenant:',
        existingCustomer.tenant_id,
        'Current tenant:',
        siteId,
      );

      if (existingCustomer.tenant_id !== siteId) {
        console.error('🔴 [WRITE TO DB] Final tenant validation failed! Aborting subscription creation.');
        return;
      }

      // 使用现有客户的customer_id创建订阅记录
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
          customer_id: existingCustomer.customer_id, // 使用现有客户的ID
          tenant_id: siteId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'subscription_id,tenant_id' }, // 更新冲突检测字段
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
