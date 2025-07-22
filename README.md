# Paddle Subscription SaaS Starter

一个基于 Next.js 的 SaaS 启动模板，支持通过环境变量快速部署多个独立站点。

## 🚀 核心特性

- **单租户多站点架构**: 每个站点完全独立，通过环境变量配置
- **快速部署**: 只需修改环境变量即可部署新站点
- **Paddle Billing 集成**: 完整的订阅管理功能
- **Supabase 后端**: 认证、数据库和实时功能
- **现代化 UI**: 基于 Tailwind CSS 和 shadcn/ui
- **TypeScript**: 完整的类型安全
- **响应式设计**: 移动端优先

## 🏗️ 架构设计

### 单租户多站点模式

- **每个站点独立**: 每个部署都是完全独立的站点
- **环境变量配置**: 通过环境变量控制站点外观和功能
- **数据隔离**: 每个站点的数据通过 `tenant_id` 字段隔离
- **快速复制**: 复制代码库 + 修改环境变量 = 新站点

### 数据隔离机制

```sql
-- 所有表都包含 tenant_id 字段
CREATE TABLE test_customers (
  customer_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default', -- 站点ID
  ...
);

-- RLS 策略确保数据隔离
CREATE POLICY "Site data isolation" ON test_customers
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true));
```

## 🛠️ 快速开始

### 1. 克隆并安装

```bash
git clone <repository-url>
cd paddle-subscription-saas-starter
pnpm install
```

### 2. 配置环境变量

复制 `env.example` 到 `.env.local` 并配置：

```bash
# 站点基础配置
NEXT_PUBLIC_SITE_ID=my-saas-platform
NEXT_PUBLIC_SITE_NAME=My SaaS Platform
NEXT_PUBLIC_SITE_TITLE=My SaaS Platform - 专业的SaaS解决方案

# Paddle配置
PADDLE_API_KEY=your_paddle_api_key
PADDLE_WEBHOOK_SECRET=your_paddle_webhook_secret

# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 设置 Supabase

```bash
# 安装 Supabase CLI
npm install -g supabase

# 启动本地开发
supabase start

# 应用数据库迁移
supabase db push
```

### 4. 运行开发服务器

```bash
pnpm dev
```

## 🚀 快速部署新站点

### 方法1: 复制项目

```bash
# 1. 复制整个项目
cp -r paddle-subscription-saas-starter my-new-saas

# 2. 修改环境变量
cd my-new-saas
# 编辑 .env.local 文件

# 3. 部署
pnpm build
pnpm start
```

### 方法2: 使用部署平台

在 Vercel、Netlify 等平台：

1. 连接同一个代码库
2. 为每个站点设置不同的环境变量
3. 自动部署

## 📝 环境变量配置

### 必需配置

```bash
NEXT_PUBLIC_SITE_ID=unique-site-id          # 站点唯一标识
NEXT_PUBLIC_SITE_NAME=Site Name             # 站点名称
PADDLE_API_KEY=your_paddle_key              # Paddle API密钥
```

### 可选配置

```bash
# 品牌配置
NEXT_PUBLIC_LOGO_URL=/custom-logo.svg
NEXT_PUBLIC_PRIMARY_COLOR=#3B82F6

# 功能开关
NEXT_PUBLIC_ENABLE_BLOG=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# 内容配置
NEXT_PUBLIC_HERO_TITLE=自定义标题
NEXT_PUBLIC_HERO_SUBTITLE=自定义副标题
```

## 🎨 自定义站点

### 1. 品牌定制

```bash
# Logo和颜色
NEXT_PUBLIC_LOGO_URL=/your-logo.svg
NEXT_PUBLIC_PRIMARY_COLOR=#FF6B6B
```

### 2. 内容定制

```bash
# 首页内容
NEXT_PUBLIC_HERO_TITLE=您的产品标题
NEXT_PUBLIC_HERO_SUBTITLE=您的产品描述
NEXT_PUBLIC_PRICING_TITLE=定价方案
```

### 3. 功能开关

```bash
# 启用/禁用功能
NEXT_PUBLIC_ENABLE_BLOG=false
NEXT_PUBLIC_ENABLE_SUPPORT=true
```

## 📊 部署示例

### 电商SaaS站点

```bash
NEXT_PUBLIC_SITE_ID=ecommerce-saas
NEXT_PUBLIC_SITE_NAME=E-Commerce Pro
NEXT_PUBLIC_HERO_TITLE=打造您的电商帝国
NEXT_PUBLIC_HERO_SUBTITLE=专业的电商SaaS平台
```

### 内容管理站点

```bash
NEXT_PUBLIC_SITE_ID=content-saas
NEXT_PUBLIC_SITE_NAME=Content Manager
NEXT_PUBLIC_HERO_TITLE=管理您的内容帝国
NEXT_PUBLIC_HERO_SUBTITLE=强大的内容管理系统
```

### 项目管理站点

```bash
NEXT_PUBLIC_SITE_ID=project-saas
NEXT_PUBLIC_SITE_NAME=Project Hub
NEXT_PUBLIC_HERO_TITLE=项目管理从未如此简单
NEXT_PUBLIC_HERO_SUBTITLE=高效的项目管理工具
```

## 🔧 开发指南

### 添加新功能

1. 在 `src/utils/supabase/site-config.ts` 中添加配置项
2. 在 `env.example` 中添加对应的环境变量
3. 在组件中使用 `getSiteConfig()` 获取配置

### 数据库操作

所有数据库查询都会自动应用站点隔离：

```typescript
// 自动过滤当前站点的数据
const { data } = await supabase.from('test_customers').select('*').eq('tenant_id', getCurrentSiteId());
```

## 🚀 生产部署

### Vercel 部署

1. 连接 GitHub 仓库
2. 设置环境变量
3. 自动部署

### 多站点部署

- 每个站点使用不同的环境变量
- 可以共享同一个 Supabase 项目
- 数据通过 `tenant_id` 自动隔离

## 📈 扩展建议

### 1. 添加更多配置项

- 主题颜色
- 字体设置
- 布局选项

### 2. 功能模块化

- 博客模块
- 分析模块
- 支持模块

### 3. 性能优化

- 图片优化
- 缓存策略
- CDN 配置

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件
