# 🧠 Project Memory (项目记忆库)

> 注意：此文件由 Agent 自动维护。每次会话结束或重要变更后必须更新。
> 目的：作为项目的长期记忆，确保上下文在不同会话和 Sub-Agents 之间无损传递。

## 1. 📍 Current Status (当前状态)

**当前阶段**: 🚧 开发中
**当前任务**:
- [ ] 执行用户指定的 git 步骤并更新项目记忆

**下一步计划**:
- [ ] 完成 `memory.md` 的 git add 与 commit

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

- 工作区存在未跟踪文件，需确认是否纳入版本控制（如 `apps/`、`packages/` 等）

## 6. 🎨 User Preferences (用户偏好)

- 语言要求：注释和文档必须使用中文。

---

**Last Updated**: 2026-01-31 22:37
