<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/box.svg" width="120" height="120" alt="Monolith Logo" />
  <h1 style="border-bottom: none; margin-bottom: 0;">Monolith</h1>
  <p><strong>A Premium Serverless Edge-Native Blog System</strong></p>
  
  <p>
    <a href="#features">Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#deployment">Deployment</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/Hono-4.7-E36002?style=flat-square&logo=hono&logoColor=white" alt="Hono" />
    <img src="https://img.shields.io/badge/Cloudflare_Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  </p>
</div>

<br/>

Monolith 是一款专注于**极致视觉体验**与**极致性能**的无服务器边缘博客系统。基于 Cloudflare Workers 架构构建，前后台深度解耦。摒弃了所有的臃肿，只为您呈现前所未有的「丝滑、极简、高冷」的内容创作与阅读体验。

> 🎨 **Slate & Cyan 设计语言**：剔除艳俗的亮色，沉浸式高质感暗黑主题。原生果冻般的阻尼动画加载体验，为您带来电影级的交互大赏。

## 🌟 Core Features | 核心特性

- ⚡️ **Edge Native (边缘原生)**: 后端采用 Hono 直接运行于全球分布的 Cloudflare Workers 边缘节点，告别冷启动（0ms Cold Start），毫秒级响应。
- 🧊 **Premium UI (高级视觉层)**: 基于高解析度打磨的 TailwindCSS v4 引擎，内建精挑细选的 “Slate & Cyan” 色彩规范，原生集成 Apple 级 `cubic-bezier` 平滑进场与高斯模糊动效层。
- 🔌 **Pluggable Storage (存储抽象层)**:
  - 核心数据默认使用无缝的 Cloudflare **D1** (SQLite)，兼容横向扩展接入 **Turso** 乃至标准 **PostgreSQL**。
  - 媒体库对象存储默认直连无下行流量费的 **R2**，支持通过环境变量一秒内挂载任意 **S3 兼容** 云资源（如阿里云 OSS、AWS）。
- 📝 **Intelligent Markdown (无感挂载引擎)**: 撰写文章只需标准 Markdown。系统自动将代码块渲染为带有精美复制按钮的智能框，且自动将视频直链及 B 站/YouTube 链接展开为原生画中画播放器。

---

## 🏗 Architecture | 系统架构

Monolith 采用典型的横向双栈（Monorepo）分离架构设计：

```text
Monolith
├── client/       # 前端 UI 端 (React 19 + Vite 6 + Wouter)
│   ├── src/pages/     # 页面组件
│   └── src/components/# 原子级精细 UI 组件库 (轻量级 Shadcn)
└── server/       # 核心服务端 (Hono + Drizzle ORM)
    ├── src/index.ts   # 后端主入口与 API 路由中心
    └── src/storage/   # 核心亮点：灵活组合的适配器引擎
```

---

## 🚀 Quick Start | 本地极速开发

### 1. 环境准备
请确保您的系统环境已安装 [Node.js](https://nodejs.org/) (建议 LTS) 与 npm。

### 2. 克隆项目与依赖同步
```bash
git clone https://github.com/your-username/monolith.git
cd monolith

# 分别进入前端与后端进行依赖安装
cd client && npm install
cd ../server && npm install
```

### 3. 本地数据库初始化 (D1 模式)
在启动后端服务前，请先让 Drizzle 为您的本地测试环境刷入数据表以及样本：
```bash
cd server
npm run db:migrate:local  # 生成库表结构
npm run db:seed:local     # 灌入演示文章与预设数据
```

### 4. 引擎点火！
开启分开的终端窗口，分别切入目录挂载热更新服务器：
```bash
# 终端 1 (后端引擎: 监听 8787 端口)
cd server && npm run dev

# 终端 2 (前台界面: 监听 5173 端口)
cd client && npm run dev
```
打开 `http://localhost:5173` 尽情流连忘返吧。
（默认管理后台入口：`/admin/login`，密码：`admin`）

---

## 🪂 Deployment | 零成本部署到 Cloudflare

只需 3 分钟，即可将您的私人数字堡垒部署到全球边缘网络。

**步骤大纲：**
1. 登录 Cloudflare Dashboard，创建 D1 实例（命名为 `monolith-db`）与 R2 存储桶（命名为 `monolith-media`）。
2. 在 `server/wrangler.toml` 填入上述两者的 UUID ID 映射。
3. 执行生产库推送：`cd server && npm run db:migrate:remote`。
4. 部署后端 Worker 核心：`cd server && npm run deploy`。
5. 前端编译与一键推送 Cloudflare Pages：`cd client && npm run build` 然后选择连接至当前 Github Repo，设置打包目录为 `dist` 即可。

---

## 📄 License | 开源协议

MIT License. Crafted with passion code & relentless design aesthetics.
