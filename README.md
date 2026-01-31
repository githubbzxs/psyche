# 多 Agent 辩论平台

这是一个仿 ChatGPT UI 的多 Agent 辩论平台，包含前端（Vue3）与后端（Fastify + Prisma + PostgreSQL）。

## 本地开发

1. 复制环境变量：
   - `apps/api/.env.example` -> `apps/api/.env`
   - `apps/web/.env.example` -> `apps/web/.env`
2. 安装依赖：`npm install`
3. 启动开发：`npm run dev`
4. 前端地址：`http://localhost:3000`

## 后端初始化（首次）

1. 确保本机 PostgreSQL 已启动，并创建数据库 `moa`
2. 生成 Prisma Client：`npx prisma generate --schema apps/api/prisma/schema.prisma`
3. 初始化数据库结构：`npx prisma migrate dev --schema apps/api/prisma/schema.prisma --name init`

## 目录结构

- `apps/web` 前端
- `apps/api` 后端
- `packages/shared` 共享类型
