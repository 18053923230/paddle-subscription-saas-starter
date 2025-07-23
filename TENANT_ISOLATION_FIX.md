# 租户隔离问题修复方案

## 问题描述

新站点部署后，用户登录和订阅功能正常，但在Supabase后台看不到数据，在Paddle后台看到的是老站点的数据。这是因为租户隔离机制没有正确工作。

## 根本原因

1. **Webhook处理时没有设置租户ID**：Webhook路由没有正确设置当前租户ID到数据库会话
2. **数据库主键约束不支持租户隔离**：原有的主键约束只基于`customer_id`和`subscription_id`，没有包含`tenant_id`
3. **API路由缺少租户设置**：某些API路由没有正确设置租户ID

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

修复了 `src/app/api/sync-users/route.ts` 以正确设置租户ID。

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

### 3. 测试租户隔离

访问 `/api/debug/tenant-test` 来测试租户隔离是否正常工作。

### 4. 检查Webhook配置

确保Paddle webhook URL指向正确的站点，并且webhook secret正确配置。

## 验证步骤

1. **检查环境变量**：访问 `/api/debug/site-status` 确认站点ID正确
2. **测试租户隔离**：访问 `/api/debug/tenant-test` 验证数据隔离
3. **测试用户登录**：在新站点登录，检查是否创建了正确的客户记录
4. **测试订阅流程**：完成订阅流程，检查数据是否正确写入

## 注意事项

- 修复后，不同租户的相同customer_id不会再产生冲突
- 每个租户的数据完全隔离，不会相互影响
- 确保所有环境变量在新站点上正确配置
- 如果使用相同的Paddle账户，需要确保webhook URL指向正确的站点

## 故障排除

如果问题仍然存在：

1. 检查Supabase日志中的租户设置错误
2. 验证RLS策略是否正确应用
3. 确认数据库迁移是否成功应用
4. 检查Paddle webhook配置是否正确
