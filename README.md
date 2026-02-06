# 多智能体讨论问答系统

这是一个“单问题输入 -> 多智能体后台讨论 -> 最终综合答案输出”的系统，包含前端（Vue3）与后端（Fastify）。

核心流程：

1. 用户输入问题。
2. 后端 3 个角色进行 2 轮讨论（分析师、质疑者、整合者）。
3. 后端基于完整讨论记录生成最终综合答案并返回给前端。

## 一键部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgithubbzxs%2Fmoa)

部署前请在 Vercel 配置以下环境变量：

- `LLM_API_KEY`：模型服务 API Key（必填）。
- `LLM_BASE_URL`：模型服务 Base URL（可选，默认 `https://api.openai.com/v1`）。
- `LLM_MODEL`：模型名称（可选，默认 `gpt-4o-mini`）。
- `VITE_API_BASE_URL`：前端请求后端地址。Vercel 同域部署建议设为 `/api`。
- `WEB_ORIGIN`：允许跨域来源（本地开发默认 `http://localhost:3000`）。

说明：当前主流程不依赖数据库即可运行；数据库相关配置仅用于仓库中其他扩展接口。

## 本地开发

1. 复制环境变量：
   - `apps/api/.env.example` -> `apps/api/.env`
   - `apps/web/.env.example` -> `apps/web/.env`
2. 安装依赖：`npm install`
3. 启动开发：`npm run dev`
4. 前端地址：`http://localhost:3000`
5. 后端接口：`POST http://localhost:8080/api/debate/answer`

前端页面已提供 API 配置区，可直接填写 `API Key`、`Base URL`、`Model` 后发起请求。

## 接口说明

请求体（最简）：

```json
{
  "question": "你的问题"
}
```

请求体（带运行时模型配置）：

```json
{
  "question": "你的问题",
  "llm": {
    "apiKey": "sk-...",
    "baseUrl": "https://api.openai.com/v1",
    "model": "gpt-4o-mini"
  }
}
```

响应体：

```json
{
  "question": "你的问题",
  "transcript": [
    { "round": 1, "role": "分析师", "content": "..." },
    { "round": 1, "role": "质疑者", "content": "..." }
  ],
  "finalAnswer": "最终综合答案"
}
```

## 目录结构

- `apps/web` 前端
- `apps/api` 后端
- `packages/shared` 共享类型