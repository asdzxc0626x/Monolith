<div align="center">

<img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/box.svg" width="96" height="96" alt="Monolith" />

# Monolith

**高质感无服务器边缘博客系统**

*极致视觉 · 边缘计算 · 多后端存储 · 零运维成本*

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Hono](https://img.shields.io/badge/Hono-4.x-E36002?style=flat-square&logo=hono&logoColor=white)](https://hono.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

<br/>

[**📚 文档**](https://github.com/one-ea/Monolith/wiki) · [**🐛 Issue**](https://github.com/one-ea/Monolith/issues) · [**☁️ 在线预览**](https://monolith-client.pages.dev)

</div>

---

## ✨ 项目简介

Monolith 是一套运行在 **Cloudflare 全球边缘网络**上的现代化无服务器博客系统。前后端完全解耦，通过适配器模式支持多种数据库与对象存储后端，无需运维，全球延迟 < 50ms。

> 🎨 **沉浸式阅读体验**：延续高质感排版、顺滑过渡与边缘原生速度，围绕内容创作与后台管理提供稳定一致的写作体验。

---

## 🌟 核心特性

| 特性 | 描述 |
|------|------|
| ⚡ **边缘原生** | Hono + Cloudflare Workers，无冷启动，全球毫秒级响应 |
| 🔌 **存储适配器** | 数据库：D1 / Turso / PostgreSQL；对象存储：R2 / S3 兼容 |
| 🌗 **高质感主题** | 统一视觉语言、细腻动效与内容优先的阅读体验 |
| 📝 **Markdown** | 代码高亮 + 一键复制、TOC、阅读进度条、预计阅读时间 |
| 🔍 **全站搜索** | ⌘K 快捷触发，标题与内容全文检索 |
| 🔐 **安全设计** | JWT 认证 + 路由守卫 + 管理入口隐藏 |
| 📊 **数据洞察** | 浏览量统计、14 日趋势图、热门排行 |
| 💬 **评论系统** | Honeypot 反垃圾 + 人工审核 |
| 💾 **备份恢复** | JSON / R2-S3 / WebDAV 多端备份 |
| 🗺️ **SEO** | sitemap.xml、RSS 2.0、robots.txt、语义化 HTML |
| 🧩 **代码注入** | 后台注入任意第三方脚本与样式 |
| 🤖 **AI 就绪** | 配备独立的 MCP Server 工具链，赋能 AI 助手全自动打理博客文章与系统配置 |

> 🤖 **MCP 强大赋能**：Monolith 拥有独立的 [Monolith-MCP](https://github.com/one-ea/Monolith-MCP) 工具链（提供多种核心工具），您可以直接在 Cursor / Windsurf / Antigravity 等 AI 编辑器中唤醒 AI 为您自动写稿、审核评论、生成数据报表、乃至进行灾备恢复！

---

## 🏗️ 架构

```
┌──────────────────────┐         ┌──────────────────────────┐
│  Cloudflare Pages    │         │   Cloudflare Workers     │
│                      │         │                          │
│  Vite + React SPA    │         │  Hono  ──▶  IDatabase    │
│  Pages Functions     │──API──▶ │           ├── D1         │
│  (反向代理层)         │         │           ├── Turso      │
└──────────────────────┘         │           └── PostgreSQL │
                                 │                          │
                                 │        ──▶  IObjectStorage│
                                 │           ├── R2         │
                                 │           └── S3 兼容    │
                                 └──────────────────────────┘
```

> 详细架构、项目结构与技术选型请参阅 [Wiki · 架构概览](https://github.com/one-ea/Monolith/wiki/Architecture)

---

## ✅ 前置条件

- Node.js `20+` 与 npm `10+`
- 已安装并登录 `Wrangler CLI`（`npm install -g wrangler && wrangler login`）
- Cloudflare 账户已具备 Workers、Pages、D1、R2 的访问权限
- 已准备好后端必需密钥：`ADMIN_PASSWORD`、`JWT_SECRET`

---

## 🚀 快速开始

```bash
# 克隆 & 安装
git clone https://github.com/one-ea/Monolith.git && cd Monolith
cd client && npm install && cd ../server && npm install && cd ..

# 配置密钥
cat > server/.dev.vars << 'EOF'
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_random_secret_key
EOF

# 初始化数据库 & 启动
cd server && npx wrangler d1 migrations apply monolith-db --local
npm run dev      # → http://localhost:8787

# 另一终端
cd client && npm run dev      # → http://localhost:5173
```

> 📖 完整指南：[Wiki · 快速开始](https://github.com/one-ea/Monolith/wiki/Quick-Start) ｜ [Wiki · 部署指南](https://github.com/one-ea/Monolith/wiki/Deployment)

---

## ☁️ 一键部署到 Cloudflare

仓库现已提供一条完整的 Cloudflare 一键部署脚本，会按顺序自动做这几件事：

1. 执行 Workers 远程数据库迁移
2. 部署 Workers 后端
3. 自动提取最新的 Workers `workers.dev` 地址
4. 把该地址写入 Cloudflare Pages 项目的 `API_BASE`
5. 从 `client/` 目录部署 Pages 前端，并自动带上 `client/functions/` 的 Functions bundle

执行命令：

```bash
npm install
npm run deploy:cloudflare
```

常用参数：

```bash
# 指定 Pages 项目名与生产分支
npm run deploy:cloudflare -- --pages-project monolith-client --branch main

# 如果自动识别 Workers URL 失败，可以手动指定
npm run deploy:cloudflare -- --api-base https://your-worker.your-account.workers.dev

# 只重发前端，不重复跑迁移和后端部署
npm run deploy:cloudflare -- --skip-migrate --skip-server --api-base https://your-worker.your-account.workers.dev

# 只更新后端与环境变量，暂时跳过前端发布
npm run deploy:cloudflare -- --skip-client --api-base https://your-worker.your-account.workers.dev
```

这个流程的设计目标，是避免部署后出现“前端已经上线，但 Pages Functions 还在指向默认后端”导致的发文保存失败、无法创建页面等问题。

### GitHub Actions 自动部署

仓库现已额外提供工作流：`.github/workflows/deploy-cloudflare.yml`

它支持两种触发方式：

1. `push` 到 `main` 时自动部署
2. Actions 面板手动触发 `Cloudflare Deploy`

需要在 GitHub Secrets 中配置：

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```
需要在 cloudflare 中配置：
1. 新建一个名为`monolith-client`的pages，无需上传任何有效内容，仅创建一个即可
2. worker部署完毕后需要添加`JWT_SECRET`与`ADMIN_PASSWORD`两个变量

手动触发时可选参数：

- `branch`：部署到 `main` 或 `dev`
- `skip_migrate`
- `skip_server`
- `skip_client`
- `api_base`

这条 Actions 链路底层复用了 `npm run deploy:cloudflare`，不会出现“本地脚本和 CI 工作流行为不一致”的双轨漂移。



### 部署防呆说明

- `seed_test_posts.sql` 已从生产迁移目录移出，改为本地专用的 `server/src/seeds/seed_test_posts.sql`
- 测试文章只允许通过 `npm run db:seed:test-posts:local` 手动写入本地数据库
- 生产远程迁移只会读取 `server/src/migrations/` 下的正式迁移文件

部署完成后，建议立即验证：

```text
1. 打开 /api/health，确认后端连通
2. 打开 /admin 登录后台
3. 新建一篇测试文章并保存
4. 新建一个测试页面并保存
```

---

## 📄 License

[MIT](LICENSE)
