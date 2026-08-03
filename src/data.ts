export type HostState = "online" | "busy" | "offline";
export type SessionState = "running" | "waiting" | "completed" | "interrupted";

export interface Host {
  id: string;
  name: string;
  platform: string;
  location: string;
  state: HostState;
  latency: number | null;
  version: string;
  tasks: number;
  cpu: number;
  memory: number;
  lastSeen: string;
  relay: string;
}

export interface Session {
  id: string;
  title: string;
  project: string;
  host: string;
  branch: string;
  state: SessionState;
  time: string;
  preview: string;
  unread?: boolean;
  mode: "Plan" | "Code" | "Review";
}

export interface Project {
  id: string;
  name: string;
  path: string;
  host: string;
  branch: string;
  sessions: number;
  running: number;
  updated: string;
  color: string;
}

export const hosts: Host[] = [
  {
    id: "mac-studio",
    name: "Studio · Shenzhen",
    platform: "macOS 15.6 · Apple M2 Max",
    location: "本地网络",
    state: "busy",
    latency: 8,
    version: "Codex 0.146.0",
    tasks: 2,
    cpu: 34,
    memory: 58,
    lastSeen: "刚刚",
    relay: "局域网直连",
  },
  {
    id: "build-vps",
    name: "Build · Hong Kong",
    platform: "Debian 12 · x86_64",
    location: "自建 Relay",
    state: "online",
    latency: 42,
    version: "Codex 0.146.0",
    tasks: 0,
    cpu: 12,
    memory: 41,
    lastSeen: "刚刚",
    relay: "hk-relay · E2EE",
  },
  {
    id: "macbook",
    name: "MacBook Pro",
    platform: "macOS 15.5 · Apple M3 Pro",
    location: "远程",
    state: "offline",
    latency: null,
    version: "Codex 0.145.0",
    tasks: 0,
    cpu: 0,
    memory: 0,
    lastSeen: "18 分钟前",
    relay: "hk-relay",
  },
  {
    id: "oracle",
    name: "Worker · Tokyo",
    platform: "Ubuntu 24.04 · ARM64",
    location: "自建 Relay",
    state: "online",
    latency: 67,
    version: "Codex 0.146.0",
    tasks: 0,
    cpu: 7,
    memory: 29,
    lastSeen: "刚刚",
    relay: "hk-relay · E2EE",
  },
];

export const sessions: Session[] = [
  {
    id: "remote-sync",
    title: "优化断线重连与增量同步",
    project: "Psyche",
    host: "Studio · Shenzhen",
    branch: "feat/event-replay",
    state: "waiting",
    time: "现在",
    preview: "等待批准修改 relay/replay.rs",
    unread: true,
    mode: "Plan",
  },
  {
    id: "ios-shell",
    title: "实现 iOS 会话时间线",
    project: "Psyche",
    host: "Studio · Shenzhen",
    branch: "feat/ios-timeline",
    state: "running",
    time: "2 分钟",
    preview: "正在运行 Swift 测试…",
    mode: "Code",
  },
  {
    id: "release-audit",
    title: "检查 Release Manifest",
    project: "Psyche",
    host: "Build · Hong Kong",
    branch: "main",
    state: "completed",
    time: "28 分钟",
    preview: "Ed25519 校验与 SHA-256 对账完成",
    mode: "Review",
  },
  {
    id: "welfare-api",
    title: "诊断接口 503",
    project: "Welfare",
    host: "Worker · Tokyo",
    branch: "hotfix/provider",
    state: "interrupted",
    time: "昨天",
    preview: "Host 重启，任务已安全中断",
    unread: true,
    mode: "Code",
  },
  {
    id: "docs-refresh",
    title: "更新协议兼容文档",
    project: "Psyche",
    host: "MacBook Pro",
    branch: "docs/protocol",
    state: "completed",
    time: "周六",
    preview: "补充 0.142–0.146 兼容矩阵",
    mode: "Plan",
  },
  {
    id: "blog-layout",
    title: "修复移动端文章排版",
    project: "Blog",
    host: "Build · Hong Kong",
    branch: "fix/mobile",
    state: "completed",
    time: "周五",
    preview: "Playwright 三个视口均已通过",
    mode: "Code",
  },
];

export const projects: Project[] = [
  {
    id: "psyche",
    name: "Psyche",
    path: "~/Documents/psyche",
    host: "Studio · Shenzhen",
    branch: "feat/event-replay",
    sessions: 18,
    running: 2,
    updated: "刚刚",
    color: "#e6573f",
  },
  {
    id: "welfare",
    name: "Welfare",
    path: "~/Documents/welfare",
    host: "Worker · Tokyo",
    branch: "main",
    sessions: 34,
    running: 0,
    updated: "昨天",
    color: "#168b6a",
  },
  {
    id: "blog",
    name: "Blog",
    path: "~/Documents/blog",
    host: "Build · Hong Kong",
    branch: "main",
    sessions: 9,
    running: 0,
    updated: "周五",
    color: "#2f6dba",
  },
  {
    id: "mini-agent",
    name: "Mini SWE Agent",
    path: "~/Desktop/mini-swe-agent",
    host: "MacBook Pro",
    branch: "main",
    sessions: 11,
    running: 0,
    updated: "7 月 30 日",
    color: "#a26822",
  },
];
