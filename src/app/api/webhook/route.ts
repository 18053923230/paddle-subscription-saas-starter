import { NextRequest } from 'next/server';
import { ProcessWebhook } from '@/utils/paddle/process-webhook';
import { getPaddleInstance } from '@/utils/paddle/get-paddle-instance';

const webhookProcessor = new ProcessWebhook();

export async function POST(request: NextRequest) {
  console.log('🟡 [WEBHOOK] Webhook received at:', new Date().toISOString());

  const signature = request.headers.get('paddle-signature') || '';
  const rawRequestBody = await request.text();
  const privateKey = process.env['PADDLE_NOTIFICATION_WEBHOOK_SECRET'] || '';

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
