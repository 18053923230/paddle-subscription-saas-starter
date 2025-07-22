/**
 * 站点配置接口
 * 定义每个站点需要的配置项
 */
export interface SiteConfig {
  // 基础信息
  siteId: string;
  siteName: string;
  siteTitle: string;
  siteDescription: string;

  // 域名和URL
  domain: string;
  baseUrl: string;

  // 品牌信息
  logo: string;
  favicon: string;
  primaryColor: string;

  // Paddle配置
  paddleEnvironment: 'sandbox' | 'live';
  paddleApiKey: string;
  paddleWebhookSecret: string;

  // 功能开关
  features: {
    enableBlog: boolean;
    enableAnalytics: boolean;
    enableSupport: boolean;
    enablePricing: boolean;
  };

  // 内容配置
  content: {
    heroTitle: string;
    heroSubtitle: string;
    pricingTitle: string;
    contactEmail: string;
  };
}

/**
 * 从环境变量自动生成站点配置
 * 这样每个站点只需要设置不同的环境变量即可
 */
export function getSiteConfig(): SiteConfig {
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'default';

  return {
    // 基础信息
    siteId,
    siteName: process.env.NEXT_PUBLIC_SITE_NAME || 'My SaaS Platform',
    siteTitle: process.env.NEXT_PUBLIC_SITE_TITLE || 'My SaaS Platform',
    siteDescription: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || 'A modern SaaS platform',

    // 域名和URL
    domain: process.env.NEXT_PUBLIC_DOMAIN || 'localhost:3000',
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',

    // 品牌信息
    logo: process.env.NEXT_PUBLIC_LOGO_URL || '/logo.svg',
    favicon: process.env.NEXT_PUBLIC_FAVICON_URL || '/favicon.ico',
    primaryColor: process.env.NEXT_PUBLIC_PRIMARY_COLOR || '#3B82F6',

    // Paddle配置
    paddleEnvironment: (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'live') || 'sandbox',
    paddleApiKey: process.env.PADDLE_API_KEY || '',
    paddleWebhookSecret: process.env.PADDLE_WEBHOOK_SECRET || '',

    // 功能开关
    features: {
      enableBlog: process.env.NEXT_PUBLIC_ENABLE_BLOG === 'true',
      enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
      enableSupport: process.env.NEXT_PUBLIC_ENABLE_SUPPORT === 'true',
      enablePricing: process.env.NEXT_PUBLIC_ENABLE_PRICING !== 'false',
    },

    // 内容配置
    content: {
      heroTitle: process.env.NEXT_PUBLIC_HERO_TITLE || 'Build Your SaaS Business',
      heroSubtitle: process.env.NEXT_PUBLIC_HERO_SUBTITLE || 'Start your subscription business today with our platform',
      pricingTitle: process.env.NEXT_PUBLIC_PRICING_TITLE || 'Simple, Transparent Pricing',
      contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@example.com',
    },
  };
}

/**
 * 获取当前站点ID
 * 用于数据库中的租户隔离
 */
export function getCurrentSiteId(): string {
  return process.env.NEXT_PUBLIC_SITE_ID || 'default';
}

/**
 * 验证站点配置是否完整
 */
export function validateSiteConfig(): { isValid: boolean; errors: string[] } {
  // const config = getSiteConfig();
  const errors: string[] = [];

  // 检查必需的环境变量
  if (!process.env.NEXT_PUBLIC_SITE_ID) {
    errors.push('NEXT_PUBLIC_SITE_ID is required');
  }

  if (!process.env.NEXT_PUBLIC_SITE_NAME) {
    errors.push('NEXT_PUBLIC_SITE_NAME is required');
  }

  if (!process.env.PADDLE_API_KEY) {
    errors.push('PADDLE_API_KEY is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 获取站点特定的数据库表名
 * 可以为不同站点使用不同的表名（可选）
 */
export function getSiteTableName(baseTableName: string): string {
  const siteId = getCurrentSiteId();
  return siteId === 'default' ? baseTableName : `${siteId}_${baseTableName}`;
}
