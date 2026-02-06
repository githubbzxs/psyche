"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

type MessageRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  loading?: boolean;
  isError?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
}

interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface ResponsePayload {
  finalAnswer?: unknown;
  answer?: unknown;
  transcript?: Array<{
    role?: unknown;
    content?: unknown;
  }>;
}

const LLM_CONFIG_KEY = "moa.llm.config.v1";

function uid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createMessage(role: MessageRole, content: string, extra?: Partial<ChatMessage>): ChatMessage {
  return {
    id: uid(),
    role,
    content,
    createdAt: Date.now(),
    ...extra,
  };
}

function createSession(): ChatSession {
  return {
    id: uid(),
    title: "新对话",
    createdAt: Date.now(),
    messages: [
      createMessage("assistant", "你好，我是辩论助手。输入问题后我会调用 /api/debate/answer 返回结果。"),
    ],
  };
}

function parseAnswer(payload: ResponsePayload): string {
  if (typeof payload.finalAnswer === "string" && payload.finalAnswer.trim()) {
    return payload.finalAnswer.trim();
  }

  if (typeof payload.answer === "string" && payload.answer.trim()) {
    return payload.answer.trim();
  }

  if (Array.isArray(payload.transcript) && payload.transcript.length > 0) {
    return payload.transcript
      .map((item) => {
        const role = typeof item.role === "string" ? item.role : "角色";
        const content = typeof item.content === "string" ? item.content : "";
        return `${role}：${content}`;
      })
      .join("\n\n");
  }

  return "请求成功，但响应中没有可展示的文本内容。";
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function LoadingDots() {
  return (
    <span className="cgpt-loading" aria-label="加载中">
      <span />
      <span />
      <span />
    </span>
  );
}

const initialSession = createSession();

export default function Page() {
  const [sessions, setSessions] = useState<ChatSession[]>([initialSession]);
  const [activeSessionId, setActiveSessionId] = useState<string>(initialSession.id);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LlmConfig>({
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  });

  const endRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const activeSession = useMemo(() => {
    if (sessions.length === 0) {
      return null;
    }
    return sessions.find((item) => item.id === activeSessionId) ?? sessions[0];
  }, [activeSessionId, sessions]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 960px)");
    const sync = () => {
      setIsMobile(media.matches);
      if (!media.matches) {
        setMobileSidebarOpen(false);
      }
    };

    sync();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }

    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LLM_CONFIG_KEY);
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored) as Partial<LlmConfig>;
      setLlmConfig((prev) => ({
        apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : prev.apiKey,
        baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : prev.baseUrl,
        model: typeof parsed.model === "string" ? parsed.model : prev.model,
      }));
    } catch {
      localStorage.removeItem(LLM_CONFIG_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(llmConfig));
    } catch {
      // ignore
    }
  }, [llmConfig]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSessionId, activeSession?.messages.length]);

  useEffect(() => {
    const input = textareaRef.current;
    if (!input) {
      return;
    }
    input.style.height = "0px";
    input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
  }, [draft]);

  const currentMessages = activeSession?.messages ?? [];

  const stats = useMemo(() => {
    const filtered = currentMessages.filter((item) => !item.loading);
    const userCount = filtered.filter((item) => item.role === "user").length;
    const assistantCount = filtered.filter((item) => item.role === "assistant").length;
    const totalCount = filtered.length;
    const totalLength = filtered.reduce((sum, item) => sum + item.content.length, 0);
    const avgLength = totalCount > 0 ? Math.round(totalLength / totalCount) : 0;
    const timeline = filtered.slice(-8).map((item) => ({
      role: item.role,
      value: Math.max(item.content.length, 1),
    }));
    const maxValue = Math.max(...timeline.map((item) => item.value), 1);
    const points = timeline.map((item, index) => {
      const x = timeline.length === 1 ? 120 : (index / (timeline.length - 1)) * 240;
      const y = 64 - (item.value / maxValue) * 52;
      return {
        role: item.role,
        x,
        y,
      };
    });

    return {
      userCount,
      assistantCount,
      totalCount,
      avgLength,
      userRatio: totalCount > 0 ? Math.round((userCount / totalCount) * 100) : 0,
      assistantRatio: totalCount > 0 ? Math.round((assistantCount / totalCount) * 100) : 0,
      polyline: points.map((item) => `${item.x},${item.y}`).join(" "),
      points,
    };
  }, [currentMessages]);

  const patchSession = (sessionId: string, updater: (session: ChatSession) => ChatSession) => {
    setSessions((prev) => prev.map((session) => (session.id === sessionId ? updater(session) : session)));
  };

  const handleCreateSession = () => {
    const next = createSession();
    setSessions((prev) => [next, ...prev]);
    setActiveSessionId(next.id);
    setDraft("");
    if (isMobile) {
      setMobileSidebarOpen(false);
    }
  };

  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileSidebarOpen((prev) => !prev);
      return;
    }
    setSidebarCollapsed((prev) => !prev);
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending || !activeSession) {
      return;
    }

    const sessionId = activeSession.id;
    const userMessage = createMessage("user", text);
    const loadingMessage = createMessage("assistant", "", { loading: true });

    setDraft("");
    setSending(true);

    patchSession(sessionId, (session) => ({
      ...session,
      title: session.title === "新对话" ? text.slice(0, 18) : session.title,
      messages: [...session.messages, userMessage, loadingMessage],
    }));

    try {
      const response = await fetch("/api/debate/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: text,
          llm: {
            apiKey: llmConfig.apiKey.trim(),
            baseUrl: llmConfig.baseUrl.trim(),
            model: llmConfig.model.trim(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as ResponsePayload;
      const answer = parseAnswer(payload);

      patchSession(sessionId, (session) => ({
        ...session,
        messages: session.messages.map((item) =>
          item.id === loadingMessage.id
            ? {
                ...item,
                content: answer,
                loading: false,
                isError: false,
              }
            : item,
        ),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      patchSession(sessionId, (session) => ({
        ...session,
        messages: session.messages.map((item) =>
          item.id === loadingMessage.id
            ? {
                ...item,
                content: `请求失败：${message}`,
                loading: false,
                isError: true,
              }
            : item,
        ),
      }));
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleSend();
  };

  const handleKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleSend();
    }
  };

  return (
    <div className="cgpt-shell">
      <aside
        className={[
          "cgpt-sidebar",
          sidebarCollapsed ? "collapsed" : "",
          mobileSidebarOpen ? "mobile-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="cgpt-sidebar-head">
          <button className="cgpt-primary-btn" type="button" onClick={handleCreateSession}>
            <span className="cgpt-icon">+</span>
            <span className="cgpt-text">新建会话</span>
          </button>
          <button
            className="cgpt-ghost-btn"
            type="button"
            onClick={handleToggleSidebar}
            aria-label="切换侧栏"
          >
            {isMobile ? "×" : sidebarCollapsed ? "→" : "←"}
          </button>
        </div>

        <div className="cgpt-session-list">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              className={`cgpt-session-item ${session.id === activeSession?.id ? "active" : ""}`}
              onClick={() => {
                setActiveSessionId(session.id);
                if (isMobile) {
                  setMobileSidebarOpen(false);
                }
              }}
              title={session.title}
            >
              <span className="cgpt-session-title">{session.title}</span>
              <span className="cgpt-session-time">{formatTime(session.createdAt)}</span>
            </button>
          ))}
        </div>

        <section className="cgpt-config">
          <h3 className="cgpt-panel-title">API 配置</h3>
          <label className="cgpt-field">
            <span>apiKey</span>
            <input
              type="password"
              value={llmConfig.apiKey}
              onChange={(event) =>
                setLlmConfig((prev) => ({
                  ...prev,
                  apiKey: event.target.value,
                }))
              }
              placeholder="sk-..."
              autoComplete="off"
            />
          </label>
          <label className="cgpt-field">
            <span>baseUrl</span>
            <input
              type="url"
              value={llmConfig.baseUrl}
              onChange={(event) =>
                setLlmConfig((prev) => ({
                  ...prev,
                  baseUrl: event.target.value,
                }))
              }
              placeholder="https://api.openai.com/v1"
              autoComplete="off"
            />
          </label>
          <label className="cgpt-field">
            <span>model</span>
            <input
              type="text"
              value={llmConfig.model}
              onChange={(event) =>
                setLlmConfig((prev) => ({
                  ...prev,
                  model: event.target.value,
                }))
              }
              placeholder="gpt-4o-mini"
              autoComplete="off"
            />
          </label>
          <p className="cgpt-config-tip">配置会保存在当前浏览器本地存储。</p>
        </section>

        <section className="cgpt-stats">
          <h3 className="cgpt-panel-title">对话统计图</h3>
          <div className="cgpt-bar-row">
            <span>用户</span>
            <div className="cgpt-bar-track">
              <div className="cgpt-bar-fill user" style={{ width: `${stats.userRatio}%` }} />
            </div>
            <strong>{stats.userCount}</strong>
          </div>
          <div className="cgpt-bar-row">
            <span>助手</span>
            <div className="cgpt-bar-track">
              <div className="cgpt-bar-fill assistant" style={{ width: `${stats.assistantRatio}%` }} />
            </div>
            <strong>{stats.assistantCount}</strong>
          </div>
          <svg className="cgpt-line-chart" viewBox="0 0 240 72" preserveAspectRatio="none">
            <line x1="0" y1="64" x2="240" y2="64" className="axis" />
            {stats.points.length > 0 ? <polyline points={stats.polyline} className="trend" /> : null}
            {stats.points.map((item, index) => (
              <circle
                key={`${item.x}-${item.y}-${index}`}
                cx={item.x}
                cy={item.y}
                r="3"
                className={item.role === "user" ? "dot user" : "dot assistant"}
              />
            ))}
          </svg>
          <div className="cgpt-stats-foot">
            <span>总消息 {stats.totalCount}</span>
            <span>平均长度 {stats.avgLength}</span>
          </div>
        </section>
      </aside>

      {isMobile && mobileSidebarOpen ? (
        <button
          type="button"
          className="cgpt-backdrop"
          aria-label="关闭侧栏"
          onClick={() => setMobileSidebarOpen(false)}
        />
      ) : null}

      <main className="cgpt-main">
        <header className="cgpt-main-head">
          <button className="cgpt-ghost-btn" type="button" onClick={handleToggleSidebar} aria-label="菜单">
            ☰
          </button>
          <div className="cgpt-main-title">
            <h1>Debate Chat</h1>
            <p>ChatGPT 风格布局 + 本地可配 LLM + 对话统计</p>
          </div>
        </header>

        <section className="cgpt-messages">
          {currentMessages.map((message, index) => (
            <article
              key={message.id}
              className={[
                "cgpt-message-row",
                message.role,
                message.isError ? "error" : "",
                message.loading ? "loading" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <div className="cgpt-message-bubble">
                {message.loading ? <LoadingDots /> : <p>{message.content}</p>}
              </div>
            </article>
          ))}
          <div ref={endRef} />
        </section>

        <footer className="cgpt-composer-wrap">
          <form className="cgpt-composer" onSubmit={handleSubmit}>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题，回车发送，Shift + 回车换行"
              rows={1}
              disabled={sending}
            />
            <button type="submit" disabled={!draft.trim() || sending}>
              {sending ? "生成中" : "发送"}
            </button>
          </form>
        </footer>
      </main>
    </div>
  );
}
