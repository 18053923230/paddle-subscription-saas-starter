import { NextResponse } from 'next/server';
import { getCurrentSiteId } from '@/utils/supabase/site-config';

export async function GET() {
  console.log('🟡 [WEBHOOK-STATUS] Checking webhook configuration');

  try {
    const siteId = getCurrentSiteId();

    // 检查环境变量
    const envCheck = {
      PADDLE_API_KEY: process.env.PADDLE_API_KEY ? '✅ Set' : '❌ Missing',
      PADDLE_WEBHOOK_SECRET: process.env.PADDLE_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing',
      PADDLE_NOTIFICATION_WEBHOOK_SECRET: process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_PADDLE_ENVIRONMENT: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'Not set',
    };

    // 计算webhook URL
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000';

    const webhookUrl = `${siteUrl}/api/webhook`;

    return NextResponse.json({
      success: true,
      siteId,
      environment: envCheck,
      webhook: {
        siteUrl,
        webhookUrl,
        webhookPath: '/api/webhook',
        fullWebhookUrl: webhookUrl,
      },
      recommendations: [
        !process.env.PADDLE_API_KEY ? 'PADDLE_API_KEY not set' : null,
        !process.env.PADDLE_WEBHOOK_SECRET ? 'PADDLE_WEBHOOK_SECRET not set' : null,
        !process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET ? 'PADDLE_NOTIFICATION_WEBHOOK_SECRET not set' : null,
        'Ensure webhook URL is configured in Paddle Dashboard',
        'Test webhook by creating a subscription',
      ].filter(Boolean),
    });
  } catch (error) {
    console.error('🟡 [WEBHOOK-STATUS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
