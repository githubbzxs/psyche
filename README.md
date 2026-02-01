# 多 Agent 辩论平台

这是一个仿 ChatGPT UI 的多 Agent 辩论平台，包含前端（Vue3）与后端（Fastify + Prisma + PostgreSQL）。

## 一键部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgithubbzxs%2Fmoa)

部署前请在 Vercel 配置以下环境变量（按需填写）：

- `DATABASE_URL`：数据库连接字符串（建议使用 Vercel Postgres）。
- `JWT_SECRET`：JWT 签名密钥。
- `API_KEY_SECRET`：API Key 签名密钥。
- `WEB_ORIGIN`：前端访问地址，例如 `https://<your-domain>.vercel.app`。
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL`：如需 Google OAuth 再配置。
- `VITE_API_BASE_URL`：建议设置为 `/api`，与 Vercel Functions 同域。
- `VITE_USE_API`：需要启用远程 API 时设置为 `true`。

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
