# Psyche 四项最高风险验证

日期：2026-08-03（UTC+8）
本机 Codex：`codex-cli 0.146.0`

本报告只回答前三步能验证到的程度。它不是正式 Host Agent/Relay 的性能验收；需要第 4 步最小技术原型才能关闭的风险会明确保留。

## 结论总览

| 风险 | 当前结论 | 证据强度 | 是否允许进入页面设计 |
|---|---|---|---|
| 普通 `codex` 透明连接 Host Agent | 条件可行 | 当前 CLI 能力 + 明确边界 | 是 |
| 终端与 Apple 客户端控制同一会话 | 结构化共享状态已验证；写冲突待测 | 双客户端现场探针 | 是 |
| 历史会话一次索引、快速打开 | 热索引路线可行；完整 20GB 冷导入未测 | 10,000 会话 + 100MB 热索引探针 | 是 |
| Relay 重连与增量补发达到延迟 | 算法与本机链路可行；公网链路未测 | 10,000 事件回放探针 | 是，但不得宣称指标已正式达标 |

## 1. 普通 `codex` 能否透明连接 Host Agent

### 已证实

- 当前 `codex --help` 提供 `--remote ws://`、`wss://` 和 Unix socket。
- `codex app-server daemon` 提供 `bootstrap`、`start`、`restart`、远程控制开关和版本查询。
- `codex app-server proxy` 可以把 stdio 转发到正在运行的 app-server control socket。
- 官方手册给出的路径是先运行 app-server，再用 `codex --remote` 连接同一个实例。

### 工程结论

安装器可以把用户 Shell 中的 `codex` 入口指向 Psyche 的轻量包装器。包装器复用所有参数、环境、TTY、信号和退出码，只补充受控 app-server 的连接参数，因此用户仍然输入普通 `codex`。

### 必须保留的边界

- 只承诺安装后经由包装器启动的 `codex`。
- 不承诺追溯接管安装前已经运行的独立进程。
- 用户刻意调用绝对路径绕过包装器时不接管。
- 正式实现必须测试交互 TUI、`exec`、`review`、`resume`、Shell completion、stdin 管道、信号、退出码和失败回退。

当前状态：**条件通过，进入最小技术原型后关闭。**

## 2. 终端与 Apple 客户端能否稳定控制同一会话

### 现场探针

启动一个仅监听 `127.0.0.1` 的临时 app-server，并同时连接两个独立 WebSocket 客户端：`psyche_terminal_probe` 与 `psyche_apple_probe`。两个客户端分别执行 `initialize`、`initialized` 和 `thread/list`。

结果：

- `/readyz` 返回正常。
- 两个客户端都初始化为同一 Unix Host 平台。
- 双方读取 5 个会话，排序后的会话 ID 完全一致。
- 样本首个会话 ID 一致。
- 探针结束后临时 app-server 已停止，没有安装持久 daemon。

当前 Codex 还生成了 349 个 JSON Schema 文件；42 个 Schema 文件覆盖 `thread/list`、`thread/read`、`turn/steer`、`turn/interrupt`、`item/completed`、Plan、命令、Diff 和 MCP 等核心术语。

### 尚未关闭

- 两个客户端同时发送 Steer、审批或中断时的冲突顺序。
- TUI 暂时断开后是否维持前台输入和滚动位置。
- Host 重启时 active turn 的状态收敛。

当前状态：**共享读取和结构化事件面已通过；并发写控制待最小技术原型。**

## 3. 历史 Codex 会话能否一次索引、快速打开

### 现场探针

使用 Node 内置 SQLite 建立与预定 Host 热索引相同的主键和时间索引：

- 10,000 个会话元数据。
- 逻辑总历史大小 20GiB。
- 一个真实物化的 100MiB 单会话，按 1MiB 事件块存储。
- 物化数据库约 101.4MiB。
- 300 次缓存会话打开，p95 为 0.682ms。
- 100 次最近 100 会话查询，p95 为 0.085ms。

### 正确解读

该结果证明“SQLite 热索引 + 分块事件”不会天然阻碍 `<100ms` 的缓存打开目标。它不等于完成 20GiB 验收，因为逻辑总量没有真实物化，测试运行在内存 SQLite，也没有包含 JSONL 解析、数据库加密、冷盘、Markdown 渲染和低端移动设备。

### 下一阶段验收

- Rust 索引器真实导入 20GiB JSONL。
- 首次导入吞吐、峰值内存、可暂停和崩溃恢复。
- 冷启动、热打开、搜索和 100MiB 时间线增量渲染。
- 加密数据库和移动端 5GB 淘汰策略。

当前状态：**数据结构风险显著降低，完整容量与冷导入仍未关闭。**

## 4. Relay 断线重连和增量补发能否达到延迟

### 本机探针

`scripts/probe-relay.mjs` 建立本机 WebSocket Relay，保留 10,000 个有序事件。客户端携带 `lastAck` 和稳定 `commandId` 重连，Relay 只返回缺失区间。探针执行 120 次重连，并重复发送同一命令 ID。

验收条件：

- 重放首序号等于 `lastAck + 1`。
- 重放尾序号等于当前日志尾部。
- 区间连续，没有缺口。
- 同一 `commandId` 的重复请求得到稳定结果。
- 本机“连接 + 补发”p95 小于 1s。

运行命令：

```bash
npm run probe:relay
```

### 尚未关闭

- 公网 RTT、移动网络 Wi-Fi/蜂窝切换和 NAT 超时。
- Protobuf 编解码、端到端加密、SQLite WAL 落盘和 Relay 重启。
- 慢客户端背压、重放窗口过期、快照切换和百万事件长期运行。

当前状态：**重放模型可验证，只有公网最小技术原型可以正式确认 `<1s`。**

## 最终判断

没有发现需要推翻现有产品方向的硬阻塞，可以进入第 3 步页面设计。四项风险都不能在当前阶段被标记为“生产关闭”；下一步最小技术原型必须优先关闭并发写控制、20GiB 冷导入和公网加密重连三个剩余风险。
