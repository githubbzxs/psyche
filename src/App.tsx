import {
  Activity,
  AlertCircle,
  Archive,
  ArrowLeft,
  Bell,
  Blocks,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleStop,
  Clock3,
  Cloud,
  Code2,
  Command,
  Copy,
  Cpu,
  Database,
  Download,
  ExternalLink,
  FileCode2,
  FileDiff,
  Folder,
  GitBranch,
  Globe2,
  HardDrive,
  Home,
  KeyRound,
  Laptop,
  LayoutDashboard,
  ListFilter,
  ListTodo,
  LoaderCircle,
  LockKeyhole,
  Menu,
  MessageSquare,
  Monitor,
  Moon,
  MoreHorizontal,
  Network,
  Paperclip,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Server,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  SquareTerminal,
  Sun,
  Tablet,
  Trash2,
  UserRound,
  Wifi,
  WifiOff,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { hosts, projects, sessions, type Host, type Project, type Session } from "./data";

type Section = "home" | "sessions" | "projects" | "hosts" | "settings";
type DevicePreview = "auto" | "mac" | "ipad" | "iphone";
type ApprovalState = "pending" | "approved" | "denied";
type Theme = "dark" | "light";

interface NavItem {
  id: Section;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { id: "home", label: "首页", icon: Home },
  { id: "sessions", label: "会话", icon: MessageSquare },
  { id: "projects", label: "项目", icon: Folder },
  { id: "hosts", label: "主机", icon: Server },
  { id: "settings", label: "设置", icon: Settings2 },
];

const sectionTitles: Record<Section, string> = {
  home: "工作台",
  sessions: "会话",
  projects: "项目",
  hosts: "主机",
  settings: "设置",
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={classNames("brand", compact && "brand-compact")}>
      <span className="brand-mark" aria-hidden="true">
        <Activity size={compact ? 17 : 19} strokeWidth={2.4} />
        <span className="brand-pulse" />
      </span>
      {!compact && <span className="brand-name">Psyche</span>}
    </div>
  );
}

function StatusDot({ state }: { state: "online" | "busy" | "offline" | "warning" }) {
  return <span className={`status-dot status-${state}`} aria-hidden="true" />;
}

function StateLabel({ state }: { state: Session["state"] }) {
  const labels: Record<Session["state"], string> = {
    running: "运行中",
    waiting: "等待处理",
    completed: "已完成",
    interrupted: "已中断",
  };
  return (
    <span className={`state-label state-${state}`}>
      {state === "running" && <LoaderCircle size={12} className="spin" />}
      {state === "waiting" && <AlertCircle size={12} />}
      {state === "completed" && <CheckCircle2 size={12} />}
      {state === "interrupted" && <CircleStop size={12} />}
      {labels[state]}
    </span>
  );
}

function IconButton({
  label,
  icon: Icon,
  onClick,
  active = false,
  disabled = false,
  className,
}: {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={classNames("icon-button", active && "is-active", className)}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={18} />
    </button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={classNames("toggle", checked && "is-on")}
      onClick={onChange}
    >
      <span />
    </button>
  );
}

function SectionHeader({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div className="section-title-row">
        <h2>{title}</h2>
        {count !== undefined && <span className="section-count">{count}</span>}
      </div>
      {action}
    </div>
  );
}

function Modal({
  title,
  description,
  children,
  onClose,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <IconButton label="关闭" icon={X} onClick={onClose} />
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </section>
    </div>
  );
}

function Sidebar({ active, onChange, onNewTask }: { active: Section; onChange: (id: Section) => void; onNewTask: () => void }) {
  return (
    <aside className="primary-sidebar">
      <div className="sidebar-top">
        <Brand />
        <button type="button" className="new-task-button" onClick={onNewTask} aria-label="新建任务" title="新建任务">
          <Plus size={17} />
          <span>新建任务</span>
        </button>
        <nav className="sidebar-nav" aria-label="主导航">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={classNames("nav-button", active === id && "is-active")}
              onClick={() => onChange(id)}
              aria-label={label}
              title={label}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === "sessions" && <span className="nav-badge">2</span>}
            </button>
          ))}
        </nav>
      </div>
      <div className="sidebar-bottom">
        <button type="button" className="workspace-switcher">
          <span className="workspace-avatar">P</span>
          <span className="workspace-copy">
            <strong>Personal</strong>
            <small>4 台主机</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="relay-summary">
          <span><StatusDot state="online" />Relay 已连接</span>
          <small>42ms · 端到端加密</small>
        </div>
      </div>
    </aside>
  );
}

function BottomNav({ active, onChange }: { active: Section; onChange: (id: Section) => void }) {
  return (
    <nav className="bottom-nav" aria-label="移动端主导航">
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={classNames(active === id && "is-active")}
          onClick={() => onChange(id)}
        >
          <span className="bottom-nav-icon">
            <Icon size={20} />
            {id === "sessions" && <span className="bottom-notice" />}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function TopBar({
  section,
  query,
  onQuery,
  onSearchOpen,
  onNewTask,
  previewMenuOpen,
  setPreviewMenuOpen,
  onPreview,
  theme,
  onThemeToggle,
}: {
  section: Section;
  query: string;
  onQuery: (value: string) => void;
  onSearchOpen: () => void;
  onNewTask: () => void;
  previewMenuOpen: boolean;
  setPreviewMenuOpen: (open: boolean) => void;
  onPreview: (preview: DevicePreview) => void;
  theme: Theme;
  onThemeToggle: () => void;
}) {
  return (
    <header className="topbar">
      <div className="mobile-brand-row">
        <Brand />
        <span className="mobile-sync"><StatusDot state="online" />42ms</span>
      </div>
      <h1>{sectionTitles[section]}</h1>
      <div className="topbar-actions">
        <label className="topbar-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="搜索会话、项目或主机"
            aria-label="全局搜索"
          />
          <kbd>⌘ K</kbd>
        </label>
        <IconButton label="搜索" icon={Search} className="mobile-search-button" onClick={onSearchOpen} />
        <IconButton
          label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
          icon={theme === "dark" ? Sun : Moon}
          className="theme-toggle-button"
          onClick={onThemeToggle}
        />
        <div className="preview-menu-wrap">
          <IconButton
            label="设备预览"
            icon={Monitor}
            active={previewMenuOpen}
            onClick={() => setPreviewMenuOpen(!previewMenuOpen)}
          />
          {previewMenuOpen && (
            <div className="context-menu preview-menu">
              <button type="button" onClick={() => onPreview("auto")}><RefreshCw size={16} />响应式</button>
              <button type="button" onClick={() => onPreview("mac")}><Laptop size={16} />macOS</button>
              <button type="button" onClick={() => onPreview("ipad")}><Tablet size={16} />iPadOS</button>
              <button type="button" onClick={() => onPreview("iphone")}><Smartphone size={16} />iOS</button>
            </div>
          )}
        </div>
        <IconButton label="通知" icon={Bell} />
        <button type="button" className="primary-command topbar-new-task" onClick={onNewTask}>
          <Plus size={17} />
          <span>新建任务</span>
        </button>
      </div>
    </header>
  );
}

function HomePage({ onOpenSession, onOpenHosts }: { onOpenSession: (id: string) => void; onOpenHosts: () => void }) {
  return (
    <div className="page home-page">
      <header className="page-intro home-intro">
        <div>
          <p className="eyebrow"><StatusDot state="online" />Personal Workspace</p>
          <h2>所有 Agent 都在这里。</h2>
          <p>3 台在线，2 个任务运行中，1 项操作等待处理。</p>
        </div>
        <div className="sync-metric" title="最近 5 分钟的应用附加同步延迟">
          <Zap size={17} />
          <span><strong>42ms</strong><small>同步延迟</small></span>
        </div>
      </header>

      <section className="content-section attention-section">
        <SectionHeader title="需要处理" count={2} />
        <div className="attention-list">
          <button type="button" className="attention-row is-critical" onClick={() => onOpenSession("remote-sync")}>
            <span className="attention-icon"><FileDiff size={18} /></span>
            <span className="row-main">
              <strong>批准 3 个文件修改</strong>
              <small>Psyche · 优化断线重连与增量同步</small>
            </span>
            <span className="row-meta">刚刚<ChevronRight size={16} /></span>
          </button>
          <button type="button" className="attention-row" onClick={() => onOpenSession("welfare-api")}>
            <span className="attention-icon is-amber"><RotateCcw size={18} /></span>
            <span className="row-main">
              <strong>确认是否重试中断任务</strong>
              <small>Welfare · Host 重启后未自动重复执行</small>
            </span>
            <span className="row-meta">18 分钟<ChevronRight size={16} /></span>
          </button>
        </div>
      </section>

      <section className="content-section">
        <SectionHeader title="运行中" count={2} />
        <div className="running-grid">
          <button type="button" className="running-item" onClick={() => onOpenSession("ios-shell")}>
            <div className="running-item-top">
              <span className="project-glyph project-red"><Code2 size={17} /></span>
              <StateLabel state="running" />
            </div>
            <strong>实现 iOS 会话时间线</strong>
            <p>正在运行 Swift 测试…</p>
            <div className="progress-track"><span style={{ width: "72%" }} /></div>
            <footer><span>Studio · Shenzhen</span><span>6m 42s</span></footer>
          </button>
          <button type="button" className="running-item" onClick={() => onOpenSession("remote-sync")}>
            <div className="running-item-top">
              <span className="project-glyph project-blue"><Network size={17} /></span>
              <StateLabel state="waiting" />
            </div>
            <strong>优化断线重连与增量同步</strong>
            <p>计划完成，等待批准 Diff</p>
            <div className="progress-track is-waiting"><span style={{ width: "86%" }} /></div>
            <footer><span>Studio · Shenzhen</span><span>12m 08s</span></footer>
          </button>
        </div>
      </section>

      <section className="content-section host-warning-section">
        <SectionHeader title="主机状态" action={<button type="button" className="text-command" onClick={onOpenHosts}>查看全部</button>} />
        <button type="button" className="host-warning" onClick={onOpenHosts}>
          <span className="host-device"><Laptop size={19} /></span>
          <span className="row-main">
            <strong>MacBook Pro 已离线</strong>
            <small>最后连接于 18 分钟前 · 没有运行中的任务</small>
          </span>
          <span className="row-meta"><WifiOff size={16} />离线<ChevronRight size={16} /></span>
        </button>
      </section>

      <section className="content-section recent-section">
        <SectionHeader title="最近会话" action={<button type="button" className="text-command" onClick={() => onOpenSession(sessions[0].id)}>查看全部</button>} />
        <div className="recent-table">
          {sessions.slice(0, 4).map((session) => (
            <button key={session.id} type="button" className="recent-row" onClick={() => onOpenSession(session.id)}>
              <span className="session-state-icon">
                {session.state === "running" && <LoaderCircle size={17} className="spin" />}
                {session.state === "waiting" && <AlertCircle size={17} />}
                {session.state === "completed" && <CheckCircle2 size={17} />}
                {session.state === "interrupted" && <CircleStop size={17} />}
              </span>
              <span className="row-main"><strong>{session.title}</strong><small>{session.project} · {session.branch}</small></span>
              <span className="recent-host">{session.host}</span>
              <span className="row-meta">{session.time}<ChevronRight size={16} /></span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function SessionList({
  selected,
  query,
  onSelect,
}: {
  selected: string;
  query: string;
  onSelect: (id: string) => void;
}) {
  const filtered = sessions.filter((session) =>
    `${session.title} ${session.project} ${session.preview}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <aside className="session-list-pane">
      <div className="pane-header">
        <div>
          <h2>会话</h2>
          <small>{sessions.length} 个最近会话</small>
        </div>
        <IconButton label="筛选" icon={ListFilter} />
      </div>
      <label className="pane-search">
        <Search size={15} />
        <input value={query} readOnly placeholder="搜索会话" aria-label="搜索会话" />
      </label>
      <div className="session-groups">
        <div className="session-group-label"><span>今天</span><span>4</span></div>
        {filtered.slice(0, 4).map((session) => (
          <button
            type="button"
            key={session.id}
            className={classNames("session-row", selected === session.id && "is-selected")}
            onClick={() => onSelect(session.id)}
          >
            <span className="session-row-top">
              <strong>{session.title}</strong>
              <small>{session.time}</small>
            </span>
            <span className="session-row-preview">{session.preview}</span>
            <span className="session-row-footer">
              <span><StatusDot state={session.state === "running" ? "busy" : session.state === "waiting" ? "warning" : "online"} />{session.project}</span>
              <span>{session.mode}</span>
            </span>
            {session.unread && <span className="unread-dot" />}
          </button>
        ))}
        <div className="session-group-label"><span>更早</span><span>2</span></div>
        {filtered.slice(4).map((session) => (
          <button
            type="button"
            key={session.id}
            className={classNames("session-row", selected === session.id && "is-selected")}
            onClick={() => onSelect(session.id)}
          >
            <span className="session-row-top"><strong>{session.title}</strong><small>{session.time}</small></span>
            <span className="session-row-preview">{session.preview}</span>
            <span className="session-row-footer"><span>{session.project}</span><span>{session.mode}</span></span>
          </button>
        ))}
      </div>
      <button type="button" className="archive-button"><Archive size={16} />已归档会话</button>
    </aside>
  );
}

function Conversation({
  session,
  onBack,
  approval,
  onApproval,
  taskRunning,
  setTaskRunning,
  onToast,
}: {
  session: Session;
  onBack: () => void;
  approval: ApprovalState;
  onApproval: (state: ApprovalState) => void;
  taskRunning: boolean;
  setTaskRunning: (running: boolean) => void;
  onToast: (message: string) => void;
}) {
  const [planOpen, setPlanOpen] = useState(true);
  const [commandOpen, setCommandOpen] = useState(true);
  const [diffOpen, setDiffOpen] = useState(true);
  const [composerMode, setComposerMode] = useState<"Plan" | "Code">("Plan");
  const [draft, setDraft] = useState("");
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const value = draft.trim();
    if (!value) return;
    setSentMessages((current) => [...current, value]);
    setDraft("");
    setTaskRunning(true);
    onToast("消息已发送到 Studio · Shenzhen");
    textareaRef.current?.focus();
  };

  return (
    <section className="conversation-pane">
      <header className="conversation-header">
        <IconButton label="返回会话列表" icon={ArrowLeft} onClick={onBack} className="conversation-back" />
        <div className="conversation-title">
          <div className="conversation-title-row"><h2>{session.title}</h2><StateLabel state={taskRunning ? "running" : approval === "pending" ? "waiting" : "completed"} /></div>
          <p><span>{session.project}</span><span>·</span><span>{session.branch}</span><span>·</span><span>{session.host}</span></p>
        </div>
        <div className="conversation-actions">
          <IconButton
            label={taskRunning ? "暂停任务" : "继续任务"}
            icon={taskRunning ? Pause : Play}
            onClick={() => {
              setTaskRunning(!taskRunning);
              onToast(taskRunning ? "已请求中断当前回合" : "任务已继续");
            }}
          />
          <IconButton label="更多操作" icon={MoreHorizontal} />
        </div>
      </header>

      <div className="timeline-scroll">
        <div className="timeline">
          <div className="timeline-day"><span>今天 14:21</span></div>
          <article className="message user-message">
            <div className="message-avatar user-avatar"><UserRound size={16} /></div>
            <div className="message-content">
              <div className="message-meta"><strong>你</strong><span>14:21</span></div>
              <p>检查 Relay 断线重连流程。目标是在不重新拉取完整会话的情况下，从客户端最后确认的序号继续补发，同时保证重复消息不会执行两次。</p>
            </div>
          </article>

          <article className="message assistant-message">
            <div className="message-avatar psyche-avatar"><Activity size={16} /></div>
            <div className="message-content">
              <div className="message-meta"><strong>Psyche</strong><span>14:21</span></div>
              <p>我会先确认现有事件序号、ACK 与重放窗口，再补齐恢复逻辑和覆盖断线边界的测试。</p>
              <div className="inline-tool plan-tool">
                <button type="button" className="inline-tool-header" onClick={() => setPlanOpen(!planOpen)}>
                  <span className="tool-icon plan-icon"><ListTodo size={17} /></span>
                  <span className="tool-title"><strong>计划</strong><small>4 个步骤 · 3 个已完成</small></span>
                  <span className="tool-status"><span>进行中</span><ChevronDown size={16} className={classNames(planOpen && "is-open")} /></span>
                </button>
                {planOpen && (
                  <div className="plan-steps">
                    <div className="plan-step is-done"><Check size={15} /><span><strong>读取现有 Relay 协议</strong><small>确认事件序号和客户端 ACK 边界</small></span></div>
                    <div className="plan-step is-done"><Check size={15} /><span><strong>补充 replay window</strong><small>只重放 last_ack 之后的事件</small></span></div>
                    <div className="plan-step is-done"><Check size={15} /><span><strong>增加幂等命令 ID</strong><small>重复命令返回既有结果</small></span></div>
                    <div className="plan-step is-active"><LoaderCircle size={15} className="spin" /><span><strong>运行测试并检查 Diff</strong><small>等待文件修改审批</small></span></div>
                  </div>
                )}
              </div>

              <div className="inline-tool command-tool">
                <button type="button" className="inline-tool-header" onClick={() => setCommandOpen(!commandOpen)}>
                  <span className="tool-icon command-icon"><SquareTerminal size={17} /></span>
                  <span className="tool-title"><strong>运行命令</strong><small>cargo test relay::replay</small></span>
                  <span className="tool-status success"><Check size={14} /><span>通过</span><ChevronDown size={16} className={classNames(commandOpen && "is-open")} /></span>
                </button>
                {commandOpen && (
                  <div className="terminal-output">
                    <div className="terminal-line"><span className="terminal-prompt">$</span><span>cargo test relay::replay</span></div>
                    <div><span className="terminal-muted">running 8 tests</span></div>
                    <div><span className="terminal-ok">test replay::resumes_after_last_ack ... ok</span></div>
                    <div><span className="terminal-ok">test replay::deduplicates_command_id ... ok</span></div>
                    <div><span className="terminal-ok">test replay::expires_old_window ... ok</span></div>
                    <div className="terminal-summary">test result: <strong>ok</strong>. 8 passed; 0 failed; finished in 0.42s</div>
                  </div>
                )}
              </div>
            </div>
          </article>

          <article className="message assistant-message compact-message">
            <div className="message-avatar psyche-avatar"><Activity size={16} /></div>
            <div className="message-content">
              <div className="message-meta"><strong>Psyche</strong><span>14:27</span></div>
              <p>重放窗口和命令幂等已完成。改动只触及 Relay 恢复路径，现有实时消息路径保持不变。</p>
              <div className={classNames("inline-tool diff-tool", approval !== "pending" && "is-resolved") }>
                <button type="button" className="inline-tool-header" onClick={() => setDiffOpen(!diffOpen)}>
                  <span className="tool-icon diff-icon"><FileDiff size={17} /></span>
                  <span className="tool-title"><strong>3 个文件有修改</strong><small>+84 −19 · Relay</small></span>
                  <span className={classNames("tool-status", approval === "approved" && "success", approval === "denied" && "danger") }>
                    {approval === "pending" && <span>等待审批</span>}
                    {approval === "approved" && <><Check size={14} /><span>已批准</span></>}
                    {approval === "denied" && <><X size={14} /><span>已拒绝</span></>}
                    <ChevronDown size={16} className={classNames(diffOpen && "is-open")} />
                  </span>
                </button>
                {diffOpen && (
                  <div className="diff-body">
                    <div className="diff-file-header"><span><FileCode2 size={15} />relay/src/replay.rs</span><span className="diff-count"><b>+51</b><i>−8</i></span></div>
                    <div className="diff-code" aria-label="代码差异">
                      <div className="diff-context"><span>71</span><code>pub async fn resume(&amp;self, client: ClientId) &#123;</code></div>
                      <div className="diff-add"><span>72</span><code>    let checkpoint = self.acks.last_for(client).await?;</code></div>
                      <div className="diff-add"><span>73</span><code>    let events = self.log.after(checkpoint.sequence).await?;</code></div>
                      <div className="diff-add"><span>74</span><code>    self.stream.replay(events, client).await</code></div>
                      <div className="diff-context"><span>75</span><code>&#125;</code></div>
                    </div>
                    <div className="diff-files-more">
                      <span><FileCode2 size={14} />relay/src/commands.rs <b>+21 −7</b></span>
                      <span><FileCode2 size={14} />relay/tests/reconnect.rs <b>+12 −4</b></span>
                    </div>
                    {approval === "pending" ? (
                      <div className="approval-actions">
                        <button type="button" className="secondary-command" onClick={() => { onApproval("denied"); onToast("已拒绝文件修改"); }}><X size={16} />拒绝</button>
                        <button type="button" className="primary-command" onClick={() => { onApproval("approved"); onToast("修改已批准，任务继续运行"); }}><Check size={16} />批准修改</button>
                      </div>
                    ) : (
                      <div className={classNames("approval-result", approval === "denied" && "is-denied") }>
                        {approval === "approved" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <span>{approval === "approved" ? "你已批准这些修改" : "你已拒绝这些修改"}</span>
                        <button type="button" onClick={() => onApproval("pending")}>撤销</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </article>

          {sentMessages.map((message, index) => (
            <article className="message user-message" key={`${message}-${index}`}>
              <div className="message-avatar user-avatar"><UserRound size={16} /></div>
              <div className="message-content">
                <div className="message-meta"><strong>你</strong><span>刚刚</span></div>
                <p>{message}</p>
              </div>
            </article>
          ))}

          {taskRunning && sentMessages.length > 0 && (
            <div className="agent-working"><LoaderCircle size={15} className="spin" /><span>Psyche 正在处理</span></div>
          )}
        </div>
      </div>

      <footer className="composer-wrap">
        <div className="composer">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="给 Codex 发送消息"
            rows={1}
          />
          <div className="composer-toolbar">
            <div className="composer-tools">
              <IconButton label="添加附件" icon={Paperclip} />
              <button type="button" className="composer-select" onClick={() => setComposerMode(composerMode === "Plan" ? "Code" : "Plan")}>
                {composerMode === "Plan" ? <ListTodo size={15} /> : <Code2 size={15} />}
                {composerMode}<ChevronDown size={13} />
              </button>
              <button type="button" className="composer-select access-select"><ShieldCheck size={15} />按需审批<ChevronDown size={13} /></button>
            </div>
            <button type="button" className="send-button" aria-label="发送消息" title="发送消息" onClick={submit} disabled={!draft.trim()}><Send size={17} /></button>
          </div>
        </div>
        <p className="composer-status"><StatusDot state="online" />Studio · Shenzhen · Codex 0.146.0</p>
      </footer>
    </section>
  );
}

function SessionInspector({ session }: { session: Session }) {
  return (
    <aside className="inspector-pane">
      <div className="inspector-header"><h3>会话详情</h3><IconButton label="关闭详情" icon={X} /></div>
      <section className="inspector-section">
        <h4>运行环境</h4>
        <dl className="detail-list">
          <div><dt>主机</dt><dd><StatusDot state="busy" />{session.host}</dd></div>
          <div><dt>模型</dt><dd>GPT-5.6 Terra</dd></div>
          <div><dt>模式</dt><dd>{session.mode}</dd></div>
          <div><dt>权限</dt><dd>按需审批</dd></div>
        </dl>
      </section>
      <section className="inspector-section">
        <h4>Git</h4>
        <div className="branch-row"><GitBranch size={15} /><span>{session.branch}</span><ChevronRight size={14} /></div>
        <div className="git-summary"><span><b>3</b> 已修改</span><span><b>0</b> 未跟踪</span></div>
      </section>
      <section className="inspector-section">
        <h4>上下文</h4>
        <div className="context-meter"><div><span>已使用</span><strong>31%</strong></div><div className="meter-track"><span style={{ width: "31%" }} /></div><small>62k / 200k tokens</small></div>
      </section>
      <section className="inspector-section">
        <h4>本次修改</h4>
        <button type="button" className="inspector-file"><FileCode2 size={15} /><span>replay.rs</span><b>+51 −8</b></button>
        <button type="button" className="inspector-file"><FileCode2 size={15} /><span>commands.rs</span><b>+21 −7</b></button>
        <button type="button" className="inspector-file"><FileCode2 size={15} /><span>reconnect.rs</span><b>+12 −4</b></button>
      </section>
      <section className="inspector-section session-actions-section">
        <button type="button"><Copy size={15} />复制会话 ID</button>
        <button type="button"><Download size={15} />导出会话</button>
        <button type="button" className="danger-text"><Archive size={15} />归档会话</button>
      </section>
    </aside>
  );
}

function SessionsPage({
  selectedId,
  query,
  onSelect,
  mobileThreadOpen,
  setMobileThreadOpen,
  approval,
  onApproval,
  taskRunning,
  setTaskRunning,
  onToast,
}: {
  selectedId: string;
  query: string;
  onSelect: (id: string) => void;
  mobileThreadOpen: boolean;
  setMobileThreadOpen: (open: boolean) => void;
  approval: ApprovalState;
  onApproval: (state: ApprovalState) => void;
  taskRunning: boolean;
  setTaskRunning: (running: boolean) => void;
  onToast: (message: string) => void;
}) {
  const selected = sessions.find((session) => session.id === selectedId) ?? sessions[0];
  return (
    <div className={classNames("sessions-page", mobileThreadOpen && "mobile-thread-open") }>
      <SessionList selected={selected.id} query={query} onSelect={(id) => { onSelect(id); setMobileThreadOpen(true); }} />
      <Conversation
        session={selected}
        onBack={() => setMobileThreadOpen(false)}
        approval={approval}
        onApproval={onApproval}
        taskRunning={taskRunning}
        setTaskRunning={setTaskRunning}
        onToast={onToast}
      />
      <SessionInspector session={selected} />
    </div>
  );
}

function ProjectsPage({ onOpenSession }: { onOpenSession: (id: string) => void }) {
  const [selectedId, setSelectedId] = useState(projects[0].id);
  const selected = projects.find((project) => project.id === selectedId) ?? projects[0];
  return (
    <div className="page split-detail-page projects-page">
      <header className="page-intro compact-intro">
        <div><p className="eyebrow">4 个工作目录</p><h2>项目</h2><p>跨主机查看代码库、分支与关联会话。</p></div>
        <button type="button" className="primary-command"><Plus size={16} />添加项目</button>
      </header>
      <div className="split-detail-layout">
        <section className="entity-list-panel">
          <div className="entity-list-header"><strong>全部项目</strong><IconButton label="排序" icon={ListFilter} /></div>
          {projects.map((project) => (
            <button type="button" key={project.id} className={classNames("project-row", selectedId === project.id && "is-selected") } onClick={() => setSelectedId(project.id)}>
              <span className="project-monogram" style={{ backgroundColor: project.color }}>{project.name.charAt(0)}</span>
              <span className="row-main"><strong>{project.name}</strong><small>{project.path}</small></span>
              <span className="project-row-meta"><b>{project.sessions}</b><small>会话</small></span>
              <ChevronRight size={16} />
            </button>
          ))}
        </section>
        <section className="entity-detail-panel project-detail">
          <header className="entity-detail-header">
            <span className="project-monogram large" style={{ backgroundColor: selected.color }}>{selected.name.charAt(0)}</span>
            <div><h3>{selected.name}</h3><p>{selected.path}</p></div>
            <IconButton label="项目菜单" icon={MoreHorizontal} />
          </header>
          <div className="project-facts">
            <div><small>主机</small><strong><StatusDot state={selected.host.includes("MacBook") ? "offline" : "online"} />{selected.host}</strong></div>
            <div><small>当前分支</small><strong><GitBranch size={14} />{selected.branch}</strong></div>
            <div><small>会话</small><strong>{selected.sessions}</strong></div>
            <div><small>运行中</small><strong>{selected.running}</strong></div>
          </div>
          <div className="project-detail-section">
            <SectionHeader title="最近会话" />
            {sessions.filter((session) => session.project === selected.name).slice(0, 4).map((session) => (
              <button type="button" className="project-session-row" key={session.id} onClick={() => onOpenSession(session.id)}>
                <span className="session-state-icon">{session.state === "running" ? <LoaderCircle size={16} className="spin" /> : session.state === "waiting" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}</span>
                <span className="row-main"><strong>{session.title}</strong><small>{session.preview}</small></span>
                <span className="row-meta">{session.time}<ChevronRight size={15} /></span>
              </button>
            ))}
          </div>
          <div className="project-detail-section">
            <SectionHeader title="快速操作" />
            <div className="quick-actions">
              <button type="button"><MessageSquare size={17} /><span><strong>新建会话</strong><small>使用当前目录</small></span></button>
              <button type="button"><GitBranch size={17} /><span><strong>创建 Worktree</strong><small>隔离并行任务</small></span></button>
              <button type="button"><SquareTerminal size={17} /><span><strong>打开终端</strong><small>{selected.host}</small></span></button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function HostStateLabel({ host }: { host: Host }) {
  const label = host.state === "busy" ? "运行任务" : host.state === "online" ? "在线" : "离线";
  return <span className={`host-state-label host-${host.state}`}><StatusDot state={host.state} />{label}</span>;
}

function HostsPage({ onToast }: { onToast: (message: string) => void }) {
  const [selectedId, setSelectedId] = useState(hosts[0].id);
  const selected = hosts.find((host) => host.id === selectedId) ?? hosts[0];
  const [connecting, setConnecting] = useState(false);

  const reconnect = () => {
    setConnecting(true);
    window.setTimeout(() => {
      setConnecting(false);
      onToast(selected.state === "offline" ? "主机仍未响应，已保留后台重试" : "连接已刷新");
    }, 700);
  };

  return (
    <div className="page split-detail-page hosts-page">
      <header className="page-intro compact-intro">
        <div><p className="eyebrow">Personal Workspace</p><h2>主机</h2><p>3 台在线，所有连接均使用设备密钥加密。</p></div>
        <button type="button" className="primary-command"><Plus size={16} />加入主机</button>
      </header>
      <div className="split-detail-layout">
        <section className="entity-list-panel host-list-panel">
          <div className="entity-list-header"><strong>4 台主机</strong><span className="relay-live"><StatusDot state="online" />Relay 正常</span></div>
          {hosts.map((host) => (
            <button type="button" key={host.id} className={classNames("host-row", selectedId === host.id && "is-selected") } onClick={() => setSelectedId(host.id)}>
              <span className="host-device">{host.platform.includes("macOS") ? <Laptop size={19} /> : <Server size={19} />}</span>
              <span className="row-main"><strong>{host.name}</strong><small>{host.platform}</small></span>
              <span className="host-row-side"><HostStateLabel host={host} />{host.latency !== null && <small>{host.latency}ms</small>}</span>
            </button>
          ))}
        </section>
        <section className="entity-detail-panel host-detail">
          <header className="host-detail-hero">
            <span className="host-device large">{selected.platform.includes("macOS") ? <Laptop size={25} /> : <Server size={25} />}</span>
            <div><div className="host-title-row"><h3>{selected.name}</h3><HostStateLabel host={selected} /></div><p>{selected.platform}</p></div>
            <IconButton label="主机菜单" icon={MoreHorizontal} />
          </header>
          <div className="host-health-strip">
            <div><Cpu size={17} /><span><small>CPU</small><strong>{selected.state === "offline" ? "—" : `${selected.cpu}%`}</strong></span></div>
            <div><Database size={17} /><span><small>内存</small><strong>{selected.state === "offline" ? "—" : `${selected.memory}%`}</strong></span></div>
            <div><Activity size={17} /><span><small>延迟</small><strong>{selected.latency === null ? "—" : `${selected.latency}ms`}</strong></span></div>
            <div><ListTodo size={17} /><span><small>任务</small><strong>{selected.tasks}</strong></span></div>
          </div>
          <section className="host-detail-section">
            <h4>连接</h4>
            <dl className="detail-list host-detail-list">
              <div><dt>路径</dt><dd><LockKeyhole size={14} />{selected.relay}</dd></div>
              <div><dt>Codex</dt><dd>{selected.version}</dd></div>
              <div><dt>Host Agent</dt><dd>0.1.0 · 已是最新</dd></div>
              <div><dt>最后在线</dt><dd>{selected.lastSeen}</dd></div>
            </dl>
          </section>
          <section className="host-detail-section">
            <h4>资源</h4>
            <div className="resource-meter"><div><span>CPU</span><strong>{selected.state === "offline" ? "不可用" : `${selected.cpu}%`}</strong></div><div className="meter-track"><span style={{ width: `${selected.cpu}%` }} /></div></div>
            <div className="resource-meter"><div><span>内存</span><strong>{selected.state === "offline" ? "不可用" : `${selected.memory}%`}</strong></div><div className="meter-track"><span style={{ width: `${selected.memory}%` }} /></div></div>
          </section>
          <section className="host-detail-section host-actions">
            <button type="button" className="secondary-command" onClick={reconnect} disabled={connecting}>{connecting ? <LoaderCircle size={16} className="spin" /> : <RefreshCw size={16} />}重新连接</button>
            <button type="button" className="secondary-command"><SquareTerminal size={16} />打开终端</button>
          </section>
          {selected.state === "offline" && (
            <div className="offline-note"><WifiOff size={17} /><span><strong>主机暂时离线</strong><small>历史会话仍可查看；新的操作会在主机恢复后发送。</small></span></div>
          )}
        </section>
      </div>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="setting-row">
      <span className="setting-icon"><Icon size={18} /></span>
      <span className="row-main"><strong>{title}</strong><small>{description}</small></span>
      <span className="setting-control">{children}</span>
    </div>
  );
}

function SettingsPage({
  onBark,
  onClearCache,
  onToast,
  theme,
  onThemeChange,
}: {
  onBark: () => void;
  onClearCache: () => void;
  onToast: (message: string) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}) {
  const [notifications, setNotifications] = useState(true);
  const [localRelay, setLocalRelay] = useState(true);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [auditLog, setAuditLog] = useState(true);
  const [cacheLimit, setCacheLimit] = useState(5);

  return (
    <div className="page settings-page">
      <header className="page-intro compact-intro settings-intro">
        <div><p className="eyebrow">应用设置</p><h2>设置</h2><p>设备、连接、通知、缓存与更新。</p></div>
      </header>
      <div className="settings-layout">
        <section className="settings-section">
          <div className="settings-section-title"><h3>外观</h3><p>此设备的界面主题</p></div>
          <div className="settings-rows">
            <SettingRow icon={theme === "dark" ? Moon : Sun} title="主题" description="默认使用深色，选择会保存在此设备">
              <span className="segmented-control theme-control">
                <button type="button" className={classNames(theme === "dark" && "is-active")} onClick={() => onThemeChange("dark")}><Moon size={15} />深色</button>
                <button type="button" className={classNames(theme === "light" && "is-active")} onClick={() => onThemeChange("light")}><Sun size={15} />浅色</button>
              </span>
            </SettingRow>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-title"><h3>Workspace</h3><p>设备身份和自建连接</p></div>
          <div className="settings-rows">
            <SettingRow icon={UserRound} title="Personal" description="当前 Workspace · 4 台主机">
              <button type="button" className="setting-link">管理<ChevronRight size={15} /></button>
            </SettingRow>
            <SettingRow icon={KeyRound} title="设备密钥" description="此设备已受信任，密钥存储在 Keychain">
              <span className="verified-label"><CheckCircle2 size={15} />已验证</span>
            </SettingRow>
            <SettingRow icon={Cloud} title="自建 Relay" description="wss://relay.example.com · 延迟 42ms">
              <button type="button" className="setting-link">配置<ChevronRight size={15} /></button>
            </SettingRow>
            <SettingRow icon={Network} title="本地 Relay" description="在这台 Mac 上自动运行，局域网优先直连">
              <Toggle checked={localRelay} onChange={() => setLocalRelay(!localRelay)} label="本地 Relay" />
            </SettingRow>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-title"><h3>通知</h3><p>任务完成和等待审批提醒</p></div>
          <div className="settings-rows">
            <SettingRow icon={Bell} title="后台通知" description="通过 Bark 接收加密的通用提醒">
              <Toggle checked={notifications} onChange={() => setNotifications(!notifications)} label="后台通知" />
            </SettingRow>
            <SettingRow icon={Smartphone} title="Bark" description="iPhone 15 Pro · 上次测试成功">
              <button type="button" className="setting-link" onClick={onBark}>配置<ChevronRight size={15} /></button>
            </SettingRow>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-title"><h3>存储</h3><p>本地缓存和历史数据</p></div>
          <div className="settings-rows storage-settings">
            <div className="storage-summary">
              <div className="storage-heading"><span><HardDrive size={18} /><strong>本地缓存</strong></span><span><b>3.2GB</b> / {cacheLimit}GB</span></div>
              <div className="storage-bar"><span className="storage-messages" style={{ width: "41%" }} /><span className="storage-files" style={{ width: "18%" }} /><span className="storage-media" style={{ width: "5%" }} /></div>
              <div className="storage-legend"><span><i className="legend-messages" />会话 2.1GB</span><span><i className="legend-files" />Diff 0.9GB</span><span><i className="legend-media" />附件 0.2GB</span></div>
            </div>
            <div className="cache-limit-row">
              <span><strong>缓存上限</strong><small>移动端默认 5GB，Mac 可设为全量</small></span>
              <label><input type="range" min="2" max="20" step="1" value={cacheLimit} onChange={(event) => setCacheLimit(Number(event.target.value))} /><b>{cacheLimit}GB</b></label>
            </div>
            <SettingRow icon={Trash2} title="清理缓存" description="不会删除 Host 上的原始会话">
              <button type="button" className="setting-link danger-text" onClick={onClearCache}>清理</button>
            </SettingRow>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-title"><h3>更新与隐私</h3><p>运行时、诊断与本地审计</p></div>
          <div className="settings-rows">
            <SettingRow icon={RefreshCw} title="自动兼容 Codex 更新" description="检测新协议后生成适配并保留可回滚运行时">
              <Toggle checked={autoUpdate} onChange={() => setAutoUpdate(!autoUpdate)} label="自动兼容 Codex 更新" />
            </SettingRow>
            <SettingRow icon={ShieldCheck} title="本地审计日志" description="只记录设备、操作类型、时间和结果，默认保留 30 天">
              <Toggle checked={auditLog} onChange={() => setAuditLog(!auditLog)} label="本地审计日志" />
            </SettingRow>
            <SettingRow icon={LockKeyhole} title="遥测" description="不上传崩溃、性能或使用数据">
              <span className="verified-label"><Check size={15} />已关闭</span>
            </SettingRow>
            <SettingRow icon={Blocks} title="Psyche 版本" description="设计原型 0.1.0 · GPLv3">
              <button type="button" className="setting-link" onClick={() => onToast("当前已是最新版本")}>检查更新<ChevronRight size={15} /></button>
            </SettingRow>
          </div>
        </section>
      </div>
    </div>
  );
}

function SearchOverlay({
  query,
  setQuery,
  onClose,
  onSession,
  onProject,
  onHost,
}: {
  query: string;
  setQuery: (value: string) => void;
  onClose: () => void;
  onSession: (id: string) => void;
  onProject: () => void;
  onHost: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);
  const normalized = query.toLowerCase();
  const matchingSessions = sessions.filter((item) => `${item.title} ${item.project}`.toLowerCase().includes(normalized)).slice(0, 4);
  return (
    <div className="search-overlay">
      <div className="search-dialog">
        <label className="search-dialog-input"><Search size={19} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 Psyche" /><IconButton label="关闭搜索" icon={X} onClick={onClose} /></label>
        <div className="search-results">
          <div className="search-result-label">会话</div>
          {matchingSessions.map((session) => <button type="button" key={session.id} onClick={() => onSession(session.id)}><MessageSquare size={17} /><span><strong>{session.title}</strong><small>{session.project} · {session.preview}</small></span><ChevronRight size={16} /></button>)}
          <div className="search-result-label">快速前往</div>
          <button type="button" onClick={onProject}><Folder size={17} /><span><strong>项目</strong><small>浏览所有工作目录</small></span><ChevronRight size={16} /></button>
          <button type="button" onClick={onHost}><Server size={17} /><span><strong>主机</strong><small>查看 Host Agent 状态</small></span><ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}

function NewTaskModal({ onClose, onCreate }: { onClose: () => void; onCreate: (prompt: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"Plan" | "Code">("Plan");
  return (
    <Modal
      title="新建任务"
      description="选择项目和 Host，然后像在 Codex CLI 中一样开始。"
      onClose={onClose}
      footer={<><button type="button" className="secondary-command" onClick={onClose}>取消</button><button type="button" className="primary-command" disabled={!prompt.trim()} onClick={() => onCreate(prompt)}><Sparkles size={16} />开始任务</button></>}
    >
      <div className="new-task-form">
        <label><span>项目</span><button type="button" className="select-field"><span><span className="project-mini-dot" />Psyche</span><ChevronDown size={16} /></button></label>
        <label><span>主机</span><button type="button" className="select-field"><span><StatusDot state="busy" />Studio · Shenzhen</span><ChevronDown size={16} /></button></label>
        <label><span>模式</span><span className="segmented-control"><button type="button" className={classNames(mode === "Plan" && "is-active") } onClick={() => setMode("Plan")}><ListTodo size={15} />Plan</button><button type="button" className={classNames(mode === "Code" && "is-active") } onClick={() => setMode("Code")}><Code2 size={15} />Code</button></span></label>
        <label><span>任务</span><textarea autoFocus value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="描述你希望 Codex 完成的工作…" rows={5} /></label>
      </div>
    </Modal>
  );
}

function BarkModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [server, setServer] = useState("https://api.day.app");
  const [key, setKey] = useState("demo-device-key");
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);

  const test = () => {
    if (!server.trim() || !key.trim()) return;
    setTesting(true);
    window.setTimeout(() => { setTesting(false); setTested(true); }, 650);
  };

  return (
    <Modal
      title="配置 Bark"
      description="通知只包含通用事件，真实会话状态由 App 重新同步。"
      onClose={onClose}
      footer={<><button type="button" className="secondary-command" onClick={test}>{testing ? <LoaderCircle size={16} className="spin" /> : <Zap size={16} />}测试通知</button><button type="button" className="primary-command" disabled={!server.trim() || !key.trim()} onClick={onSaved}><Check size={16} />保存</button></>}
    >
      <div className="bark-form">
        <label><span>Bark 服务地址</span><input value={server} onChange={(event) => setServer(event.target.value)} /></label>
        <label><span>设备 Key</span><input value={key} onChange={(event) => setKey(event.target.value)} type="password" /></label>
        <div className="privacy-note"><LockKeyhole size={17} /><span><strong>最小通知内容</strong><small>Relay 和 Bark 都不会收到项目名、命令、Diff 或消息正文。</small></span></div>
        {tested && <div className="test-success"><CheckCircle2 size={16} />测试通知已送达</div>}
      </div>
    </Modal>
  );
}

function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialPreview = (params.get("device") as DevicePreview | null) ?? "auto";
  const [section, setSection] = useState<Section>("home");
  const [selectedSession, setSelectedSession] = useState(sessions[0].id);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [preview, setPreview] = useState<DevicePreview>(["auto", "mac", "ipad", "iphone"].includes(initialPreview) ? initialPreview : "auto");
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [barkOpen, setBarkOpen] = useState(false);
  const [clearCacheOpen, setClearCacheOpen] = useState(false);
  const [approval, setApproval] = useState<ApprovalState>("pending");
  const [taskRunning, setTaskRunning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = window.localStorage.getItem("psyche-theme");
      const initial = stored === "light" ? "light" : "dark";
      document.documentElement.dataset.theme = initial;
      return initial;
    } catch {
      document.documentElement.dataset.theme = "dark";
      return "dark";
    }
  });

  useEffect(() => {
    document.documentElement.dataset.preview = preview;
  }, [preview]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#000000" : "#f2f2f7");
    try {
      window.localStorage.setItem("psyche-theme", theme);
    } catch {
      // 浏览器禁用存储时仍保留当前会话内的主题。
    }
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setPreviewMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const changeSection = (next: Section) => {
    setSection(next);
    setPreviewMenuOpen(false);
    if (next === "sessions") setMobileThreadOpen(false);
  };

  const openSession = (id: string) => {
    setSelectedSession(id);
    setSection("sessions");
    setMobileThreadOpen(true);
    setSearchOpen(false);
  };

  const showToast = (message: string) => setToast(message);

  const content = (() => {
    if (section === "home") return <HomePage onOpenSession={openSession} onOpenHosts={() => setSection("hosts")} />;
    if (section === "sessions") return <SessionsPage selectedId={selectedSession} query={query} onSelect={setSelectedSession} mobileThreadOpen={mobileThreadOpen} setMobileThreadOpen={setMobileThreadOpen} approval={approval} onApproval={setApproval} taskRunning={taskRunning} setTaskRunning={setTaskRunning} onToast={showToast} />;
    if (section === "projects") return <ProjectsPage onOpenSession={openSession} />;
    if (section === "hosts") return <HostsPage onToast={showToast} />;
    return <SettingsPage onBark={() => setBarkOpen(true)} onClearCache={() => setClearCacheOpen(true)} onToast={showToast} theme={theme} onThemeChange={setTheme} />;
  })();

  return (
    <div className={classNames("prototype-canvas", preview !== "auto" && "is-device-preview") }>
      {preview !== "auto" && (
        <button type="button" className="preview-exit" onClick={() => setPreview("auto")}><X size={15} />退出{preview === "mac" ? "macOS" : preview === "ipad" ? "iPadOS" : "iOS"}预览</button>
      )}
      <div className="app-shell">
        <Sidebar active={section} onChange={changeSection} onNewTask={() => setNewTaskOpen(true)} />
        <div className="workspace-shell">
          <TopBar section={section} query={query} onQuery={setQuery} onSearchOpen={() => setSearchOpen(true)} onNewTask={() => setNewTaskOpen(true)} previewMenuOpen={previewMenuOpen} setPreviewMenuOpen={setPreviewMenuOpen} onPreview={(next) => { setPreview(next); setPreviewMenuOpen(false); }} theme={theme} onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
          <main className="main-content">{content}</main>
          <BottomNav active={section} onChange={changeSection} />
        </div>
      </div>

      {searchOpen && <SearchOverlay query={query} setQuery={setQuery} onClose={() => setSearchOpen(false)} onSession={openSession} onProject={() => { setSection("projects"); setSearchOpen(false); }} onHost={() => { setSection("hosts"); setSearchOpen(false); }} />}
      {newTaskOpen && <NewTaskModal onClose={() => setNewTaskOpen(false)} onCreate={(prompt) => { setNewTaskOpen(false); setSection("sessions"); setMobileThreadOpen(true); setTaskRunning(true); showToast(`任务已创建：${prompt.slice(0, 24)}`); }} />}
      {barkOpen && <BarkModal onClose={() => setBarkOpen(false)} onSaved={() => { setBarkOpen(false); showToast("Bark 配置已保存"); }} />}
      {clearCacheOpen && (
        <Modal
          title="清理本地缓存？"
          description="只删除此设备上的可重建缓存，不影响 Host 原始会话。"
          onClose={() => setClearCacheOpen(false)}
          footer={<><button type="button" className="secondary-command" onClick={() => setClearCacheOpen(false)}>取消</button><button type="button" className="danger-command" onClick={() => { setClearCacheOpen(false); showToast("已释放 3.2GB 本地缓存"); }}><Trash2 size={16} />清理 3.2GB</button></>}
        >
          <div className="cache-clean-summary"><HardDrive size={22} /><span><strong>3.2GB 可清理</strong><small>下次打开未缓存会话时会按需重新同步。</small></span></div>
        </Modal>
      )}
      {toast && <div className="toast" role="status"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  );
}

export default App;
