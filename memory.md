# 🧠 Project Memory (项目记忆库)

> 注意：此文件由 Agent 自动维护。每次会话结束或重要变更后必须更新。
> 目的：作为项目的长期记忆，确保上下文在不同会话和 Sub-Agents 之间无损传递。

## 1. 📍 Current Status (当前状态)

**当前阶段**: 🚧 开发中
**当前任务**:
- [x] 同步远程仓库主干并对齐最新结构。
- [x] 新增 Vercel 一键部署按钮与部署说明。
- [x] 拆分 Fastify 应用构建逻辑，补充 Vercel Serverless 入口与配置。

**下一步计划**:
- [ ] 在 Vercel 上配置环境变量并验证部署结果。

## 2. 🛠 Tech Stack & Config (技术栈与配置)

| 类别 | 选型/版本 | 备注 |
| --- | --- | --- |
| **Language** | 前端 JavaScript / 后端 TypeScript | |
| **Framework** | 前端 Vue 3 | |
| **Backend** | Fastify + Prisma + PostgreSQL | |
| **Monorepo** | workspaces：`apps/*`、`packages/*` | |
| **Shared** | `packages/shared` | |
| **Build Tool** | 前端 Vite / 后端 tsc | |
| **Linting** | 前端 ESLint / 后端 tsc | |
| **Deploy** | Vercel（静态前端 + Serverless API） | |

**关键环境配置**:
- Node Version: 待确认
- 端口: Frontend (3000), Backend (8080)
- 环境变量: `apps/api/.env`、`apps/web/.env`

## 3. 🏗 Architecture & Patterns (架构与模式)

**目录结构规范**:
- `/apps/web`: 前端
- `/apps/api`: 后端
- `/packages/shared`: 共享类型

**核心设计模式**:
- 待确认

## 4. 📝 Key Decisions Log (关键决策记录)

*记录“为什么这样做”，防止反复修改或推翻重来。*

- **[2026-01-31]**: 项目为 Monorepo，使用 `workspaces` 管理 `apps/*` 与 `packages/*`。
- **[2026-02-01]**: 补全 Vue 3 + Vite 前端，使用本地模拟数据与 localStorage 持久化。
- **[2026-02-01]**: 将 Fastify 入口拆分为可复用构建函数，并增加 Vercel Serverless 入口与路由配置。

## 5. ⚠️ Known Issues & Constraints (已知问题与约束)

- 后端首次启动需执行 Prisma generate 与 migrate。
- Vercel 部署需配置 `DATABASE_URL`、`JWT_SECRET` 等环境变量。

## 6. 🎨 User Preferences (用户偏好)

- 语言要求：注释和文档必须使用中文。

---

**Last Updated**: 2026-02-01 13:32
