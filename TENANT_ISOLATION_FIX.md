# 租户隔离问题修复方案

## 问题描述

新站点部署后，用户登录和订阅功能正常，但在Supabase后台看不到数据，在Paddle后台看到的是老站点的数据。这是因为租户隔离机制没有正确工作。

## 根本原因

1. **Webhook处理时没有设置租户ID**：Webhook路由没有正确设置当前租户ID到数据库会话
2. **数据库主键约束不支持租户隔离**：原有的主键约束只基于`customer_id`和`subscription_id`，没有包含`tenant_id`
3. **API路由缺少租户设置**：某些API路由没有正确设置租户ID
4. **认证回调路由没有设置租户ID**：用户登录时没有正确创建客户记录
5. **密码登录和注册没有创建客户记录**：只有OAuth登录会触发认证回调，密码登录和注册直接跳转，没有创建客户记录
6. **RLS策略阻止第一条记录创建**：新站点没有任何记录时，RLS策略可能阻止第一条记录的创建

## 修复方案

### 1. 修复Webhook路由

在 `src/app/api/webhook/route.ts` 中添加了租户ID设置：

```typescript
// 在webhook处理前设置租户ID
const supabase = await createClient();
const siteId = getCurrentSiteId();

// 设置当前租户ID到数据库会话
const { error: tenantError } = await supabase.rpc('set_current_tenant', { tenant_id: siteId });
```

### 2. 修复数据库主键约束

创建了新的迁移文件 `supabase/migrations/20240907140228_fix_primary_keys_for_tenant_isolation.sql`：

- 删除原有的单字段主键约束
- 创建包含租户ID的复合主键约束
- 更新外键约束以支持租户隔离
- 创建唯一索引确保email在租户内唯一

### 3. 更新Upsert操作

更新了所有upsert操作以支持新的复合主键：

```typescript
// 之前
{
  onConflict: 'customer_id';
}

// 现在
{
  onConflict: 'customer_id,tenant_id';
}
```

### 4. 修复API路由

修复了以下路由以正确设置租户ID：

- `src/app/api/sync-users/route.ts`
- `src/app/api/debug/site-status/route.ts`
- `src/app/auth/callback/route.ts`

### 5. 修复认证Actions

修复了登录和注册actions，确保所有认证方式都会创建客户记录：

- `src/app/login/actions.ts` - 密码登录和匿名登录
- `src/app/signup/actions.ts` - 用户注册

### 6. 修复RLS策略

创建了新的迁移文件 `supabase/migrations/20240907140230_fix_rls_for_empty_tenant.sql`：

- 修复RLS策略，允许在没有租户设置时也能创建记录
- 创建更宽松的策略，支持新站点的第一条记录创建
- 添加安全的租户设置函数

### 7. 添加调试工具

创建了新的调试API端点：

- `/api/debug/tenant-test` - 测试租户隔离
- `/api/debug/cleanup-duplicates` - 清理重复记录
- `/api/debug/create-customer-manual` - 手动创建客户记录
- `/api/debug/auth-status` - 检查认证状态
- `/api/debug/initialize-tenant` - 初始化新租户（创建第一条记录）

创建了数据库函数：

- `check_duplicate_emails()` - 检查重复email
- `cleanup_duplicate_customers()` - 清理重复记录
- `get_tenant_stats()` - 获取租户统计信息
- `safe_set_current_tenant()` - 安全设置租户ID
- `get_current_tenant_safe()` - 安全获取当前租户ID

## 应用修复

### 1. 应用数据库迁移

```bash
# 在Supabase项目中应用新的迁移
supabase db push
```

### 2. 验证环境变量

确保新站点的环境变量正确设置：

```bash
NEXT_PUBLIC_SITE_ID=your-new-site-id
NEXT_PUBLIC_SITE_NAME=Your New Site Name
# ... 其他环境变量
```

### 3. 初始化新租户

**关键步骤**：对于新站点，必须先初始化租户：

```bash
# POST到初始化端点
curl -X POST https://your-site.com/api/debug/initialize-tenant
```

### 4. 测试和调试

按顺序执行以下测试：

1. **初始化租户**：POST到 `/api/debug/initialize-tenant`
2. **检查认证状态**：访问 `/api/debug/auth-status`
3. **检查站点状态**：访问 `/api/debug/site-status`
4. **测试租户隔离**：访问 `/api/debug/tenant-test`
5. **清理重复记录**：POST到 `/api/debug/cleanup-duplicates`
6. **手动创建客户**：POST到 `/api/debug/create-customer-manual`

### 5. 测试认证流程

1. **测试密码登录**：使用邮箱密码登录，检查是否创建客户记录
2. **测试注册**：注册新用户，检查是否创建客户记录
3. **测试匿名登录**：使用访客登录，检查是否创建客户记录

### 6. 检查Webhook配置

确保Paddle webhook URL指向正确的站点，并且webhook secret正确配置。

## 验证步骤

1. **初始化租户**：POST到 `/api/debug/initialize-tenant` 创建第一条记录
2. **检查认证状态**：访问 `/api/debug/auth-status` 确认用户认证和客户记录
3. **检查环境变量**：访问 `/api/debug/site-status` 确认站点ID正确
4. **测试租户隔离**：访问 `/api/debug/tenant-test` 验证数据隔离
5. **清理重复数据**：如果有重复记录，使用清理工具
6. **测试用户登录**：在新站点登录，检查是否创建了正确的客户记录
7. **测试订阅流程**：完成订阅流程，检查数据是否正确写入

## 故障排除

### 如果新站点无法创建任何记录

1. **首先初始化租户**：POST到 `/api/debug/initialize-tenant`
2. 检查RLS策略是否正确应用
3. 确认数据库迁移是否成功应用

### 如果用户记录没有创建

1. 检查认证actions日志，查看是否有错误
2. 使用 `/api/debug/auth-status` 检查认证状态
3. 使用 `/api/debug/create-customer-manual` 手动创建客户记录
4. 检查是否有重复的email记录导致冲突

### 如果数据仍然写入到错误的地方

1. 确认所有API路由都正确设置了租户ID
2. 检查webhook URL是否正确指向新站点
3. 验证数据库迁移是否成功应用

### 如果出现重复记录

1. 使用 `/api/debug/cleanup-duplicates` 清理重复记录
2. 检查唯一索引是否正确创建
3. 验证upsert操作是否正确

### 如果认证回调没有被触发

1. 确认OAuth登录配置正确
2. 检查重定向URL设置
3. 验证Supabase认证配置

## 注意事项

- **新站点必须先初始化**：使用 `/api/debug/initialize-tenant` 创建第一条记录
- 修复后，不同租户的相同customer_id不会再产生冲突
- 每个租户的数据完全隔离，不会相互影响
- 确保所有环境变量在新站点上正确配置
- 如果使用相同的Paddle账户，需要确保webhook URL指向正确的站点
- 建议在应用修复前备份现有数据
- 密码登录、注册和匿名登录现在都会自动创建客户记录
- RLS策略现在支持新站点的第一条记录创建
