# 租户隔离问题修复文档

## 问题描述

新部署的站点用户登录后，数据没有正确写入Supabase，而是关联到了旧站点的数据。问题出现在多租户数据隔离上。

## 根本原因

1. **第一条记录问题**: 新租户没有第一条记录时，RLS策略过于严格，阻止了记录的创建
2. **租户ID设置问题**: 某些API路由没有正确设置 `current_setting('app.current_tenant_id')`
3. **数据库约束问题**: 主键和外键约束没有包含 `tenant_id`

## 解决方案

### 1. 数据库层面修复

#### 1.1 修复主键约束

```sql
-- 文件: supabase/migrations/20240907140228_fix_primary_keys_for_tenant_isolation.sql
ALTER TABLE public.test_customers
ADD CONSTRAINT test_customers_pkey PRIMARY KEY (customer_id, tenant_id);

ALTER TABLE public.test_subscriptions
ADD CONSTRAINT test_subscriptions_pkey PRIMARY KEY (subscription_id, tenant_id);
```

#### 1.2 修复RLS策略

```sql
-- 文件: supabase/migrations/20240907140230_fix_rls_for_empty_tenant.sql
CREATE POLICY "Allow tenant access and creation for customers" ON public.test_customers
FOR ALL USING (
  (current_setting('app.current_tenant_id', true) IS NOT NULL AND
   current_setting('app.current_tenant_id', true) != '' AND
   tenant_id = current_setting('app.current_tenant_id', true))
  OR
  (current_setting('app.current_tenant_id', true) IS NULL OR
   current_setting('app.current_tenant_id', true) = '')
);
```

### 2. 应用层面修复

#### 2.1 客户记录初始化

- **文件**: `src/app/api/debug/initialize-tenant/route.ts`
- **功能**: 为新租户创建第一条客户记录
- **访问**: `GET/POST /api/debug/initialize-tenant`

#### 2.2 强制客户记录初始化

- **文件**: `src/app/api/debug/force-initialize/route.ts`
- **功能**: 强制创建客户记录，即使已有记录
- **访问**: `GET/POST /api/debug/force-initialize`

#### 2.3 订阅记录初始化

- **文件**: `src/app/api/debug/initialize-subscription/route.ts`
- **功能**: 为新租户创建第一条订阅记录
- **访问**: `GET/POST /api/debug/initialize-subscription`

#### 2.4 强制订阅记录初始化

- **文件**: `src/app/api/debug/force-initialize-subscription/route.ts`
- **功能**: 强制创建订阅记录，即使已有记录
- **访问**: `GET/POST /api/debug/force-initialize-subscription`

### 3. 认证流程修复

#### 3.1 登录动作

- **文件**: `src/app/login/actions.ts`
- **修复**: 添加租户ID设置和客户记录创建逻辑

#### 3.2 OAuth回调

- **文件**: `src/app/auth/callback/route.ts`
- **修复**: 添加租户ID设置和客户记录创建逻辑

#### 3.3 注册动作

- **文件**: `src/app/signup/actions.ts`
- **修复**: 添加租户ID设置和客户记录创建逻辑

### 4. Webhook处理修复

#### 4.1 Webhook路由

- **文件**: `src/app/api/webhook/route.ts`
- **修复**: 在处理webhook前设置租户ID

#### 4.2 Webhook处理器

- **文件**: `src/utils/paddle/process-webhook.ts`
- **修复**:
  - 在创建订阅记录前设置租户ID
  - 在创建客户记录前设置租户ID
  - 如果客户记录不存在，自动创建客户记录

### 5. 调试工具

#### 5.1 站点状态检查

- **文件**: `src/app/api/debug/site-status/route.ts`
- **功能**: 检查当前站点状态和用户记录

#### 5.2 认证状态检查

- **文件**: `src/app/api/debug/auth-status/route.ts`
- **功能**: 检查用户认证状态和跨租户记录

#### 5.3 OAuth状态检查

- **文件**: `src/app/api/debug/oauth-status/route.ts`
- **功能**: 检查OAuth配置和状态

#### 5.4 查看所有记录

- **文件**: `src/app/api/debug/view-all-records/route.ts`
- **功能**: 绕过RLS查看所有记录（调试用）

## 测试步骤

### 1. 初始化新租户

```bash
# 初始化客户记录
curl https://your-site.vercel.app/api/debug/initialize-tenant

# 初始化订阅记录
curl https://your-site.vercel.app/api/debug/initialize-subscription
```

### 2. 测试用户登录

1. 访问登录页面
2. 使用GitHub登录或邮箱密码登录
3. 检查是否自动创建客户记录

### 3. 测试订阅创建

1. 完成订阅流程
2. 检查Paddle webhook是否正确创建订阅记录
3. 验证记录是否关联到正确的租户

### 4. 验证租户隔离

```bash
# 检查当前租户状态
curl https://your-site.vercel.app/api/debug/site-status

# 检查认证状态
curl https://your-site.vercel.app/api/debug/auth-status
```

## 常见问题

### Q: 初始化API报告已有记录，但查看记录API显示无记录

**A**: 可能是RLS策略问题，使用强制初始化API：

```bash
curl https://your-site.vercel.app/api/debug/force-initialize
curl https://your-site.vercel.app/api/debug/force-initialize-subscription
```

### Q: OAuth登录后没有客户记录

**A**: 检查环境变量配置：

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_BASE_URL`
- Supabase OAuth重定向URL设置

### Q: Webhook没有创建订阅记录

**A**: 检查：

1. Paddle webhook URL配置
2. Webhook密钥配置
3. 租户ID设置是否正确

## 环境变量配置

确保以下环境变量正确设置：

```bash
NEXT_PUBLIC_SITE_ID=your-site-id
NEXT_PUBLIC_SITE_URL=https://your-site.vercel.app
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
PADDLE_API_KEY=your-paddle-api-key
PADDLE_WEBHOOK_SECRET=your-paddle-webhook-secret
```

## 部署检查清单

- [ ] 运行所有数据库迁移
- [ ] 设置正确的环境变量
- [ ] 配置Supabase OAuth重定向URL
- [ ] 配置Paddle webhook URL
- [ ] 测试客户记录初始化
- [ ] 测试订阅记录初始化
- [ ] 测试用户登录流程
- [ ] 测试订阅创建流程
- [ ] 验证租户数据隔离
