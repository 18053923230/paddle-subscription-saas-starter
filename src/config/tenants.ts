import { TenantConfig } from '@/utils/supabase/tenant';

/**
 * 租户配置文件
 * 这里定义了所有租户的配置信息
 * 可以根据需要扩展更多配置项
 */
export const TENANT_CONFIGURATIONS: Record<string, TenantConfig> = {
  // 默认租户
  default: {
    id: 'default',
    name: 'Default SaaS',
    domain: 'localhost:3000',
    paddleEnvironment: 'sandbox',
  },

  // 租户1 - 示例电商网站
  tenant1: {
    id: 'tenant1',
    name: 'E-Commerce Pro',
    domain: 'tenant1.example.com',
    paddleEnvironment: 'sandbox',
  },

  // 租户2 - 示例SaaS工具
  tenant2: {
    id: 'tenant2',
    name: 'SaaS Tools',
    domain: 'tenant2.example.com',
    paddleEnvironment: 'sandbox',
  },

  // 租户3 - 示例内容平台
  tenant3: {
    id: 'tenant3',
    name: 'Content Platform',
    domain: 'tenant3.example.com',
    paddleEnvironment: 'live', // 生产环境
  },
};

/**
 * 根据环境变量动态加载租户配置
 * 支持从环境变量中读取租户特定的配置
 */
export function getTenantConfig(tenantId: string): TenantConfig {
  const baseConfig = TENANT_CONFIGURATIONS[tenantId] || TENANT_CONFIGURATIONS.default;

  // 从环境变量中读取租户特定的配置
  const envPrefix = `TENANT_${tenantId.toUpperCase()}`;

  return {
    ...baseConfig,
    // 可以添加更多从环境变量读取的配置
    paddleEnvironment: (process.env[`${envPrefix}_PADDLE_ENV`] as 'sandbox' | 'live') || baseConfig.paddleEnvironment,
  };
}

/**
 * 获取所有可用的租户配置
 */
export function getAllTenantConfigs(): Record<string, TenantConfig> {
  return TENANT_CONFIGURATIONS;
}

/**
 * 验证租户配置是否有效
 */
export function validateTenantConfig(tenantId: string): boolean {
  return Object.keys(TENANT_CONFIGURATIONS).includes(tenantId);
}
