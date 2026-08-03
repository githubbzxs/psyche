# Psyche 最终产品规格

版本：0.1
状态：前三步冻结稿
日期：2026-08-03（UTC+8）

## 1. 产品定义

Psyche 是一个免费、通用、GPLv3 开源的 Codex 多端控制软件。用户在 Mac、Linux 主机或 VPS 上照常运行 Codex CLI，同时可以在 macOS、iOS 和 iPadOS 客户端中查看、继续、审批和管理同一个 Codex 会话。

Psyche 不是新的 Agent 运行时，不代理模型账号，也不把终端画面远程投屏。它订阅 Host 上同一条结构化 Codex 事件流，并把各端变成同一会话的一等客户端。

## 2. 产品目标

1. 安装后继续使用普通 `codex` 命令，不要求用户迁移工作习惯。
2. 三端完整呈现受支持 Codex CLI 的能力，不静默省略 Plan、审批、命令、Diff、MCP、Skills、Plugins、Hooks、模型和权限等功能。
3. 缓存会话打开 p95 小于 100ms，应用自身同步附加延迟 p95 小于 100ms，网络恢复后的重连 p95 小于 1s。
4. Host 保持数据权威，Relay 不读取项目名、会话状态、命令、Diff 或消息正文。
5. 用户可以完全自建，不依赖 Psyche 官方账号、Relay 或推送服务。

## 3. 非目标

1. 不承诺追溯接管安装 Psyche 前已经独立运行的 Codex 进程。
2. 不防御用户刻意绕过 Psyche 包装器、直接执行真实 Codex 二进制。
3. 不把 iPhone 或 iPad 作为长期运行 Codex CLI 的执行主机。
4. 不提供官方托管 Relay、账号系统或云端会话存储。
5. 第一阶段不做营销网站，打开客户端直接进入工作台。

## 4. 用户体验契约

### 4.1 安装与普通 CLI

- macOS 安装后自动启动普通用户权限的 Host Agent 和本地 Relay。
- Psyche 在用户 Shell 中提供透明的 `codex` 入口，保留原参数、环境、TTY、退出码、信号和当前工作目录。
- `codex` 仍使用用户现有的 `~/.codex`、认证、配置、MCP、Skills、Plugins 和历史会话。
- Host Agent 启动或复用唯一的受控 app-server；终端 TUI 与 Apple 客户端连接这个实例。
- 安装前已运行的独立进程只导入其落盘历史，不伪装为可实时控制的同一实例。

### 4.2 Workspace 与设备

- 无中心账号和邮箱登录。
- 用户通过 Workspace Key 加入；首次加入后使用设备独立密钥自动认证。
- 创建 Workspace 时生成离线 Recovery Key；Relay 管理员不能代替用户恢复所有权。
- macOS 默认自动运行本地 Relay；局域网优先直连，外网连接使用用户自建 Relay。
- 每个受控 Host 主动连接 Relay，客户端连接同一 Relay 后可发现该 Workspace 下的全部 Host。

### 4.3 会话与控制

- 支持开始、恢复、派生、归档、删除、回滚、压缩、重命名和搜索会话。
- 支持开始、Steer、中断和排队后续消息。
- Plan、命令、工具调用、子 Agent、MCP、Skills、Plugins、Hooks、Diff、Git、审批、用量和上下文状态均进入统一时间线。
- Codex 自身审批规则保持权威；Psyche 不额外强制 Face ID 或 Touch ID。
- Host 或 Codex 崩溃后恢复历史，将未完成任务标为中断，不自动重复执行可能产生副作用的操作。
- 同一 Git 项目默认沿用当前工作目录；创建会话时可选择独立 Worktree。

### 4.4 通知

- iOS/iPadOS 后台通知统一使用用户配置的 Bark。
- Onboarding 提供 Bark 地址、设备 Key、测试通知和最小内容说明。
- 通知只携带通用事件；App 唤醒后向 Host 同步真实状态。

## 5. 系统边界

### 5.1 Apple 客户端

- 技术：Swift、SwiftUI，必要时窄范围桥接 AppKit/UIKit。
- 平台：macOS、iOS、iPadOS。
- 责任：本地加密缓存、增量 Reducer、原生渲染、离线浏览、命令发送、审批和设备管理。

### 5.2 Host Agent

- 技术：Rust，统一二进制命令 `psyche host`。
- 权限：普通用户，自启动，不以 root 运行。
- 责任：管理 Codex app-server、复用 `~/.codex`、维护 SQLite WAL 热索引、规范化事件、分配单调序号、执行幂等命令、管理本地审计和版本适配。
- 真相来源：Host 事件序列和 SQLite WAL；原始 JSONL 只作审计、兼容导入和灾难恢复。

### 5.3 Relay

- 技术：Rust，统一二进制命令 `psyche relay`。
- 责任：匿名设备路由、连接状态、短期密文缓冲、ACK 与重放窗口。
- 可见元数据：匿名设备 ID、在线状态、连接时间和流量大小。
- 不可见数据：Host 名称、项目、会话状态、命令、Diff、文件和正文。
- 不提供官方实例；用户自行部署。

### 5.4 Codex 适配层

- 使用 app-server 的结构化 JSON-RPC 作为 Host 内部集成入口。
- Psyche 对外协议使用版本化 Protobuf 消息，通过 WebSocket 传输。
- 每个 Codex 版本生成其专属 Schema，编译成版本适配器和能力矩阵。
- 未知事件必须保留原始类型与载荷并显示“不受支持”，不得静默丢弃。
- 默认支持当前安装的 Codex；不兼容时可并行安装经过校验的受控运行时，并允许回滚。

## 6. 同步模型

1. Host 为每个 Workspace 分配单调递增的 `event_sequence`。
2. 客户端持久化最后完整应用的 `last_ack_sequence`。
3. 重连时客户端只请求 `last_ack_sequence` 之后的事件。
4. 所有有副作用的请求带稳定 `command_id`；Host 重复收到时返回原结果，不重复执行。
5. 快照只用于首次同步或重放窗口过期；正常恢复不重建完整会话。
6. UI Reducer 按 item ID 局部更新；流式 Markdown、命令输出和 Diff 分块渲染，不因单个 token 重建整条时间线。

## 7. 数据与存储

- SQLite 开启 WAL，索引会话摘要、状态、事件偏移和搜索字段。
- 原始 Codex JSONL 不修改，保留原始路径和可验证偏移。
- 本地数据库加密，密钥保存在 Keychain。
- 移动端统一默认缓存 5GB，可调整和立即清理。
- Mac 默认全量缓存，也可设置上限和一键清理。
- 清理客户端缓存不删除 Host 原始会话。
- Host 本地审计日志只记录设备、操作类型、时间和结果，不记录正文、命令参数和文件内容；默认保留 30 天。

## 8. 性能与容量

验收规模：10,000 个会话、20GB 总历史、单会话 100MB。

| 指标 | 目标 | 统计边界 |
|---|---:|---|
| 缓存会话打开 p95 | `<100ms` | 从点击到首屏稳定内容可交互 |
| 同步附加延迟 p95 | `<100ms` | Host 事件产生到客户端 Reducer 应用，不含用户公网延迟 |
| 网络恢复后重连 p95 | `<1s` | 网络可用到增量流恢复，不含 Host 离线时间 |
| 时间线滚动 | 60fps 目标 | 常见设备，超长会话使用虚拟化和分块渲染 |

模型首字延迟、Host 调度和用户网络 RTT 必须单独记录，不能混入 Psyche 应用性能。

## 9. 安全与隐私

- Host 与客户端内容端到端加密，Relay 只路由密文。
- 设备独立密钥可单独撤销，不共享长期私钥。
- Workspace Recovery Key 离线保存。
- 不自动上传遥测、崩溃报告或性能数据；用户可主动导出本地诊断包。
- Release 产物使用 SHA-256 对账，并由项目独立 Ed25519 密钥签署 Manifest；校验失败时拒绝安装或更新。

## 10. 发布与兼容

- Monorepo 管理 Swift 客户端、Rust Host/Relay、Protocol 和工具。
- GitHub Releases 提供 IPA、未公证 DMG、Host Agent、Relay 和受控 Codex 运行时。
- iOS/iPadOS 用户自行签名侧载 IPA；项目不承诺 APNs。
- macOS 用户手动允许未公证应用；`xattr` 仅作为明确说明的备用方式。
- 首个公开 Stable 必须同时具备 macOS、iOS、iPadOS、Host Agent、Relay、功能对齐和性能门槛；不完整构建不标为 Stable。

## 11. 完成标准

1. 功能矩阵对当前受支持 Codex Schema 逐项通过，没有静默缺失。
2. 终端与至少两个 Apple 客户端可同时观察同一会话，并正确处理所有权、Steer、审批和中断冲突。
3. 既定容量下通过冷导入、热打开、断线重连、Relay 重启、Host 重启和客户端离线测试。
4. Relay 数据库和网络抓包不能恢复正文。
5. IPA、DMG 和二进制均通过 Manifest 签名校验和回滚测试。
