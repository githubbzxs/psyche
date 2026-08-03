# Psyche

Psyche 是一个免费、通用、GPLv3 开源的多端 Codex 控制软件。当前仓库处于产品规格、风险验证与三端交互设计阶段。

本目录中的 Web 应用是可操作的设计原型，用于确认 macOS、iPadOS 和 iOS 的信息架构与关键交互，不是最终客户端实现。正式客户端将使用 Swift/SwiftUI，Host Agent 与 Relay 使用 Rust。

## 本地运行

```bash
npm install
npm run dev
```

## 验证

```bash
npm run typecheck
npm run build
npm run probe:relay
npm run test:e2e
```

## 文档

- `docs/product-spec.md`：最终产品规格。
- `docs/risk-validation.md`：四个最高风险点的证据、结论与剩余验证。
- `docs/ui-design.md`：三端页面地图、布局与状态规则。
