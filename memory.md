# 🧠 Project Memory (项目记忆库)

> 注意：此文件由 Agent 自动维护。每次会话结束或重要变更后必须更新。
> 目的：作为项目的长期记忆，确保上下文在不同会话和 Sub-Agents 之间无损传递。

## 1. 📍 Current Status (当前状态)

**当前阶段**: ✅ 已交付
**当前任务**:
- [x] 已补全 `apps/web` 前端并可本地运行与模拟辩论

**下一步计划**:
- [ ] 如需联调后端，补齐 `apps/api` 的入口与路由
- [ ] 视需要接入真实模型 API

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

**关键环境配置**:
- Node Version: 待确认
- 端口: 待确认
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

## 5. ⚠️ Known Issues & Constraints (已知问题与约束)

- `apps/api` 缺少 `src/server.ts`，`src/routes` 目录为空，当前无法启动。
- `npm install` 提示 5 个中危漏洞，可按需执行 `npm audit fix`。

## 6. 🎨 User Preferences (用户偏好)

- 语言要求：注释和文档必须使用中文。

---

**Last Updated**: 2026-02-01 00:43
