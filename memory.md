# 🧠 Project Memory (项目记忆库)

> 注意：此文件由 Agent 自动维护。每次会话结束或重要变更后必须更新。
> 目的：作为项目的长期记忆，确保上下文在不同会话和 Sub-Agents 之间无损传递。

## 1. 📍 Current Status (当前状态)

**当前阶段**: 📝 规划中
**当前任务**:
- [ ] 处理“本地运行”需求，确认需要启动的服务

**下一步计划**:
- [ ] 若需全量启动，补全 `apps/web` 前端脚手架与配置
- [ ] 若仅启动后端，准备本地数据库并启动 `apps/api`

## 2. 🛠 Tech Stack & Config (技术栈与配置)

| 类别 | 选型/版本 | 备注 |
| --- | --- | --- |
| **Language** | 待确认 | |
| **Framework** | 前端 Vue 3 | |
| **Backend** | Fastify + Prisma + PostgreSQL | |
| **Monorepo** | workspaces：`apps/*`、`packages/*` | |
| **Shared** | `packages/shared` | |
| **Build Tool** | 待确认 | |
| **Linting** | 待确认 | |

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

## 5. ⚠️ Known Issues & Constraints (已知问题与约束)

- `apps/web` 目录为空，缺少 `package.json` 与 `.env.example`，根级 `npm run dev` 会失败。

## 6. 🎨 User Preferences (用户偏好)

- 语言要求：注释和文档必须使用中文。

---

**Last Updated**: 2026-02-01 00:07
