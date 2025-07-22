import { createClient } from '@/utils/supabase/server';

export interface TenantConfig {
  id: string;
  name: string;
  domain?: string;
  paddleEnvironment?: 'sandbox' | 'live';
}

// 默认租户配置
export const DEFAULT_TENANT: TenantConfig = {
  id: 'default',
  name: 'Default Tenant',
};

// 租户配置映射（可以通过环境变量或配置文件扩展）
export const TENANT_CONFIGS: Record<string, TenantConfig> = {
  default: DEFAULT_TENANT,
  tenant1: {
    id: 'tenant1',
    name: 'Tenant 1',
    domain: 'tenant1.example.com',
    paddleEnvironment: 'sandbox',
  },
  tenant2: {
    id: 'tenant2',
    name: 'Tenant 2',
    domain: 'tenant2.example.com',
    paddleEnvironment: 'sandbox',
  },
  // 可以添加更多租户配置
  // 'tenant3': { id: 'tenant3', name: 'Tenant 3', domain: 'tenant3.example.com' },
};

/**
 * 根据域名或请求头获取当前租户ID
 */
export function getCurrentTenantId(request?: Request): string {
  if (typeof window !== 'undefined') {
    // 客户端：从URL或localStorage获取
    const urlParams = new URLSearchParams(window.location.search);
    const tenantId = urlParams.get('tenant') || localStorage.getItem('current_tenant_id');
    return tenantId || 'default';
  }

  if (request) {
    // 服务端：从请求头或域名获取
    const host = request.headers.get('host') || '';
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenant');

    if (tenantId) return tenantId;

    // 根据域名判断租户
    for (const [id, config] of Object.entries(TENANT_CONFIGS)) {
      if (config.domain && host.includes(config.domain)) {
        return id;
      }
    }
  }

  return 'default';
}

/**
 * 设置当前租户ID到数据库会话
 */
export async function setCurrentTenant(tenantId: string): Promise<void> {
  const supabase = await createClient();

  // 设置数据库会话变量
  await supabase.rpc('set_current_tenant', { tenant_id: tenantId });

  // 客户端也保存到localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('current_tenant_id', tenantId);
  }
}

/**
 * 获取当前租户配置
 */
export function getCurrentTenant(request?: Request): TenantConfig {
  const tenantId = getCurrentTenantId(request);
  return TENANT_CONFIGS[tenantId] || DEFAULT_TENANT;
}

/**
 * 验证租户ID是否有效
 */
export function isValidTenantId(tenantId: string): boolean {
  return Object.keys(TENANT_CONFIGS).includes(tenantId);
}
