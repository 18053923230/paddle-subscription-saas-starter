import { NextRequest } from 'next/server';
import { ProcessWebhook } from '@/utils/paddle/process-webhook';
import { getPaddleInstance } from '@/utils/paddle/get-paddle-instance';
import { createClient } from '@/utils/supabase/server-internal';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

const webhookProcessor = new ProcessWebhook();

export async function POST(request: NextRequest) {
  console.log('🟡 [WEBHOOK] Webhook received at:', new Date().toISOString());

  const signature = request.headers.get('paddle-signature') || '';
  const rawRequestBody = await request.text();
  const privateKey = process.env['PADDLE_WEBHOOK_SECRET'] || '';

  console.log('🟡 [WEBHOOK] Request details:', {
    hasSignature: !!signature,
    bodyLength: rawRequestBody.length,
    hasPrivateKey: !!privateKey,
    headers: Object.fromEntries(request.headers.entries()),
  });

  let status, eventName;
  try {
    if (signature && rawRequestBody) {
      const paddle = getPaddleInstance();
      const eventData = await paddle.webhooks.unmarshal(rawRequestBody, privateKey, signature);
      status = 200;
      eventName = eventData?.eventType ?? 'Unknown event';

      console.log('🟡 [WEBHOOK] Event parsed successfully:', {
        eventType: eventName,
        eventData: eventData,
        timestamp: new Date().toISOString(),
      });

      if (eventData) {
        // 在webhook处理前设置租户ID
        const supabase = await createClient();
        const siteId = getCurrentSiteId();

        console.log('🟡 [WEBHOOK] Setting tenant_id for webhook processing:', siteId);

        // 设置当前租户ID到数据库会话
        const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });

        if (tenantError) {
          console.error('🟡 [WEBHOOK] Failed to set tenant for webhook:', tenantError);
        } else {
          console.log('🟡 [WEBHOOK] Successfully set tenant_id for webhook:', siteId);
        }

        console.log('🟡 [WEBHOOK] Processing event...');
        await webhookProcessor.processEvent(eventData);
        console.log('🟡 [WEBHOOK] Event processed successfully');
      }
    } else {
      status = 400;
      console.log('❌ [WEBHOOK] Missing signature from header');
    }
  } catch (e) {
    // Handle error
    status = 500;
    console.log('❌ [WEBHOOK] Error processing webhook:', e);
  }

  console.log('🟡 [WEBHOOK] Response:', { status, eventName });
  return Response.json({ status, eventName });
}
