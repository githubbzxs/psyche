"use client"

import { useEffect, useMemo, useRef, useState } from "react"

const LLM_CONFIG_KEY = "moa.llm.config.v1"
const AGENT_CONFIG_KEY = "moa.agent.config.v1"
const SESSIONS_KEY = "moa.chat.sessions.v1"
const ACTIVE_SESSION_KEY = "moa.chat.active.v1"

function uid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createMessage(role, content, extra = {}) {
  return {
    id: uid(),
    role,
    content,
    createdAt: Date.now(),
    ...extra
  }
}

function createSession() {
  return {
    id: uid(),
    title: "New chat",
    createdAt: Date.now(),
    messages: [
      createMessage(
        "assistant",
        "Hi, ask anything. I will run multi-agent debate and return one final answer."
      )
    ]
  }
}

const DEFAULT_AGENT_PRESETS = [
  {
    name: "分析师",
    responsibility: "拆解问题并给出关键事实、前提和推理路径"
  },
  {
    name: "质疑者",
    responsibility: "寻找漏洞、反例和风险，挑战已有结论"
  },
  {
    name: "整合者",
    responsibility: "整合多方观点并给出可执行的最终方案"
  }
]

function createAgentConfig(template = {}, defaultModel = "gpt-4o-mini") {
  return {
    id: uid(),
    name: typeof template.name === "string" ? template.name : "",
    responsibility: typeof template.responsibility === "string" ? template.responsibility : "",
    model:
      typeof template.model === "string" && template.model.trim() ? template.model : defaultModel,
    baseUrl: typeof template.baseUrl === "string" ? template.baseUrl : "",
    apiKey: typeof template.apiKey === "string" ? template.apiKey : ""
  }
}

function createDefaultAgents(defaultModel = "gpt-4o-mini") {
  return DEFAULT_AGENT_PRESETS.map((item) => createAgentConfig(item, defaultModel))
}

function normalizeAgents(raw, defaultModel = "gpt-4o-mini") {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null
      }

      const model =
        typeof item.model === "string" && item.model.trim() ? item.model.trim() : defaultModel

      return {
        id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : uid(),
        name: typeof item.name === "string" ? item.name.trim() : "",
        responsibility:
          typeof item.responsibility === "string" ? item.responsibility.trim() : "",
        model,
        baseUrl: typeof item.baseUrl === "string" ? item.baseUrl.trim() : "",
        apiKey: typeof item.apiKey === "string" ? item.apiKey.trim() : ""
      }
    })
    .filter(
      (item) =>
        item &&
        item.name.length > 0 &&
        item.responsibility.length > 0 &&
        item.model.length > 0
    )
}

function parseAnswer(payload) {
  if (typeof payload?.finalAnswer === "string" && payload.finalAnswer.trim()) {
    return {
      text: payload.finalAnswer.trim(),
      transcript: Array.isArray(payload?.transcript) ? payload.transcript : []
    }
  }

  if (typeof payload?.answer === "string" && payload.answer.trim()) {
    return {
      text: payload.answer.trim(),
      transcript: Array.isArray(payload?.transcript) ? payload.transcript : []
    }
  }

  if (Array.isArray(payload?.transcript) && payload.transcript.length > 0) {
    return {
      text: payload.transcript
        .map((item) => {
          const role = typeof item?.role === "string" ? item.role : "agent"
          const content = typeof item?.content === "string" ? item.content : ""
          return `${role}: ${content}`
        })
        .join("\n\n"),
      transcript: payload.transcript
    }
  }

  return {
    text: "Request succeeded, but no readable answer in response.",
    transcript: []
  }
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(timestamp)
}

function LoadingDots() {
  return (
    <span className="cgpt-loading" aria-label="loading">
      <span />
      <span />
      <span />
    </span>
  )
}

function buildRequestUrl() {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/+$/, "")

  if (!base) {
    return "/api/debate/answer"
  }

  if (/\/api$/i.test(base)) {
    return `${base}/debate/answer`
  }

  return `${base}/api/debate/answer`
}

function loadInitialSessions() {
  if (typeof window === "undefined") {
    return [createSession()]
  }

  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    if (!raw) {
      return [createSession()]
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [createSession()]
    }

    return parsed
  } catch {
    return [createSession()]
  }
}

function loadInitialActiveId(sessions) {
  if (typeof window === "undefined") {
    return sessions[0]?.id || ""
  }

  const saved = localStorage.getItem(ACTIVE_SESSION_KEY)
  if (saved && sessions.some((item) => item.id === saved)) {
    return saved
  }

  return sessions[0]?.id || ""
}

export default function Page() {
  const [sessions, setSessions] = useState([createSession()])
  const [activeSessionId, setActiveSessionId] = useState("")
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [llmConfig, setLlmConfig] = useState({
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini"
  })
  const [agentConfigs, setAgentConfigs] = useState(() =>
    createDefaultAgents("gpt-4o-mini")
  )

  const endRef = useRef(null)
  const textareaRef = useRef(null)

  const requestUrl = useMemo(() => buildRequestUrl(), [])

  const activeSession = useMemo(() => {
    if (sessions.length === 0) {
      return null
    }
    return sessions.find((item) => item.id === activeSessionId) || sessions[0]
  }, [activeSessionId, sessions])

  const currentMessages = useMemo(() => activeSession?.messages || [], [activeSession])
  const isWelcomeOnly = useMemo(() => {
    if (currentMessages.length !== 1) {
      return false
    }

    const only = currentMessages[0]
    return Boolean(only && only.role === "assistant" && !only.loading && !only.isError)
  }, [currentMessages])

  useEffect(() => {
    const initialSessions = loadInitialSessions()
    const initialActiveId = loadInitialActiveId(initialSessions)
    setSessions(initialSessions)
    setActiveSessionId(initialActiveId)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
    } catch {
      // ignore local storage write failure
    }
  }, [sessions])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    if (!activeSessionId) {
      return
    }

    localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId)
  }, [activeSessionId])

  useEffect(() => {
    const media = window.matchMedia("(max-width: 960px)")
    const sync = () => {
      setIsMobile(media.matches)
      if (!media.matches) {
        setMobileSidebarOpen(false)
      }
    }

    sync()

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync)
      return () => media.removeEventListener("change", sync)
    }

    media.addListener(sync)
    return () => media.removeListener(sync)
  }, [])

  useEffect(() => {
    const fallbackConfig = {
      apiKey: "",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini"
    }

    try {
      let nextConfig = fallbackConfig
      const storedLlm = localStorage.getItem(LLM_CONFIG_KEY)
      if (storedLlm) {
        const parsedLlm = JSON.parse(storedLlm)
        nextConfig = {
          apiKey:
            typeof parsedLlm?.apiKey === "string" ? parsedLlm.apiKey : fallbackConfig.apiKey,
          baseUrl:
            typeof parsedLlm?.baseUrl === "string" ? parsedLlm.baseUrl : fallbackConfig.baseUrl,
          model:
            typeof parsedLlm?.model === "string" && parsedLlm.model.trim()
              ? parsedLlm.model.trim()
              : fallbackConfig.model
        }
      }
      setLlmConfig(nextConfig)

      const storedAgents = localStorage.getItem(AGENT_CONFIG_KEY)
      if (!storedAgents) {
        setAgentConfigs(createDefaultAgents(nextConfig.model))
        return
      }

      const parsedAgents = JSON.parse(storedAgents)
      const normalizedAgents = normalizeAgents(parsedAgents, nextConfig.model)
      if (normalizedAgents.length >= 2) {
        setAgentConfigs(normalizedAgents)
      } else {
        setAgentConfigs(createDefaultAgents(nextConfig.model))
      }
    } catch {
      localStorage.removeItem(LLM_CONFIG_KEY)
      localStorage.removeItem(AGENT_CONFIG_KEY)
      setLlmConfig(fallbackConfig)
      setAgentConfigs(createDefaultAgents(fallbackConfig.model))
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(llmConfig))
    } catch {
      // ignore local storage write failure
    }
  }, [llmConfig])

  useEffect(() => {
    try {
      localStorage.setItem(AGENT_CONFIG_KEY, JSON.stringify(agentConfigs))
    } catch {
      // ignore local storage write failure
    }
  }, [agentConfigs])

  useEffect(() => {
    if (isWelcomeOnly) {
      return
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [activeSessionId, currentMessages.length, isWelcomeOnly])

  useEffect(() => {
    const input = textareaRef.current
    if (!input) {
      return
    }

    input.style.height = "0px"
    input.style.height = `${Math.min(input.scrollHeight, 180)}px`
  }, [draft])

  const stats = useMemo(() => {
    const filtered = currentMessages.filter((item) => !item.loading)
    const userCount = filtered.filter((item) => item.role === "user").length
    const assistantCount = filtered.filter((item) => item.role === "assistant").length
    const totalCount = filtered.length
    const totalLength = filtered.reduce((sum, item) => sum + item.content.length, 0)
    const avgLength = totalCount > 0 ? Math.round(totalLength / totalCount) : 0

    const timeline = filtered.slice(-8).map((item) => ({
      role: item.role,
      value: Math.max(item.content.length, 1)
    }))

    const maxValue = Math.max(...timeline.map((item) => item.value), 1)
    const points = timeline.map((item, index) => {
      const x = timeline.length === 1 ? 120 : (index / (timeline.length - 1)) * 240
      const y = 64 - (item.value / maxValue) * 52
      return { role: item.role, x, y }
    })

    return {
      userCount,
      assistantCount,
      totalCount,
      avgLength,
      userRatio: totalCount > 0 ? Math.round((userCount / totalCount) * 100) : 0,
      assistantRatio: totalCount > 0 ? Math.round((assistantCount / totalCount) * 100) : 0,
      polyline: points.map((item) => `${item.x},${item.y}`).join(" "),
      points
    }
  }, [currentMessages])

  const patchSession = (sessionId, updater) => {
    setSessions((prev) => prev.map((session) => (session.id === sessionId ? updater(session) : session)))
  }

  const patchAgent = (agentId, updater) => {
    setAgentConfigs((prev) =>
      prev.map((item) => (item.id === agentId ? updater(item) : item))
    )
  }

  const handleAddAgent = () => {
    const nextIndex = agentConfigs.length + 1
    setAgentConfigs((prev) => [
      ...prev,
      createAgentConfig(
        {
          name: `智能体${nextIndex}`,
          responsibility: "补充新的分析视角",
          model: llmConfig.model.trim() || "gpt-4o-mini"
        },
        llmConfig.model.trim() || "gpt-4o-mini"
      )
    ])
  }

  const handleRemoveAgent = (agentId) => {
    setAgentConfigs((prev) => {
      if (prev.length <= 2) {
        return prev
      }
      return prev.filter((item) => item.id !== agentId)
    })
  }

  const handleCreateSession = () => {
    const next = createSession()
    setSessions((prev) => [next, ...prev])
    setActiveSessionId(next.id)
    setDraft("")
    if (isMobile) {
      setMobileSidebarOpen(false)
    }
  }

  const handleDeleteSession = (sessionId) => {
    setSessions((prev) => {
      const next = prev.filter((item) => item.id !== sessionId)

      if (next.length === 0) {
        const fallback = createSession()
        setActiveSessionId(fallback.id)
        return [fallback]
      }

      if (sessionId === activeSessionId) {
        setActiveSessionId(next[0].id)
      }

      return next
    })
  }

  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileSidebarOpen((prev) => !prev)
      return
    }

    setSidebarCollapsed((prev) => !prev)
  }

  const handleSend = async () => {
    const text = draft.trim()
    if (!text || sending || !activeSession) {
      return
    }

    const sessionId = activeSession.id
    const userMessage = createMessage("user", text)
    const loadingMessage = createMessage("assistant", "", { loading: true })

    setDraft("")
    setSending(true)

    patchSession(sessionId, (session) => ({
      ...session,
      title: session.title === "New chat" ? text.slice(0, 22) : session.title,
      messages: [...session.messages, userMessage, loadingMessage]
    }))

    try {
      if (agentConfigs.length < 2) {
        throw new Error("至少需要 2 个智能体")
      }

      const preparedAgents = agentConfigs.map((item, index) => ({
        id: item.id || `agent_${index + 1}`,
        name: item.name.trim(),
        responsibility: item.responsibility.trim(),
        model: item.model.trim() || llmConfig.model.trim(),
        baseUrl: item.baseUrl.trim(),
        apiKey: item.apiKey.trim()
      }))

      const invalidIndex = preparedAgents.findIndex(
        (item) => !item.name || !item.responsibility || !item.model
      )
      if (invalidIndex >= 0) {
        throw new Error(`请完善第 ${invalidIndex + 1} 个智能体的名称、职责和模型`)
      }

      const payload = {
        question: text,
        llm: {
          apiKey: llmConfig.apiKey.trim(),
          baseUrl: llmConfig.baseUrl.trim(),
          model: llmConfig.model.trim()
        },
        agents: preparedAgents.map((item, index) => ({
          id: item.id || `agent_${index + 1}`,
          name: item.name,
          responsibility: item.responsibility,
          llm: {
            model: item.model,
            ...(item.baseUrl ? { baseUrl: item.baseUrl } : {}),
            ...(item.apiKey ? { apiKey: item.apiKey } : {})
          }
        }))
      }

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      const rawText = await response.text()
      let data = {}

      if (rawText) {
        try {
          data = JSON.parse(rawText)
        } catch {
          throw new Error("Response is not valid JSON")
        }
      }

      if (!response.ok) {
        throw new Error(data?.message || `HTTP ${response.status}`)
      }

      const parsed = parseAnswer(data)

      patchSession(sessionId, (session) => ({
        ...session,
        messages: session.messages.map((item) =>
          item.id === loadingMessage.id
            ? {
                ...item,
                content: parsed.text,
                transcript: parsed.transcript,
                loading: false,
                isError: false
              }
            : item
        )
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error"

      patchSession(sessionId, (session) => ({
        ...session,
        messages: session.messages.map((item) =>
          item.id === loadingMessage.id
            ? {
                ...item,
                content: `Request failed: ${message}`,
                loading: false,
                isError: true
              }
            : item
        )
      }))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="cgpt-shell">
      <aside
        className={[
          "cgpt-sidebar",
          sidebarCollapsed ? "collapsed" : "",
          mobileSidebarOpen ? "mobile-open" : ""
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="cgpt-sidebar-head">
          <button className="cgpt-primary-btn" type="button" onClick={handleCreateSession}>
            <span className="cgpt-icon">+</span>
            <span className="cgpt-text">New chat</span>
          </button>
          <button className="cgpt-ghost-btn" type="button" onClick={handleToggleSidebar} aria-label="toggle sidebar">
            {isMobile ? "\u00D7" : sidebarCollapsed ? "\u203A" : "\u2039"}
          </button>
        </div>

        {!sidebarCollapsed || isMobile ? (
          <div className="cgpt-session-list">
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                className={`cgpt-session-item ${session.id === activeSession?.id ? "active" : ""}`}
                onClick={() => {
                  setActiveSessionId(session.id)
                  if (isMobile) {
                    setMobileSidebarOpen(false)
                  }
                }}
                title={session.title}
              >
                <span className="cgpt-session-title">{session.title}</span>
                <span className="cgpt-session-time">{formatTime(session.createdAt)}</span>
                <span
                  className="cgpt-session-delete"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleDeleteSession(session.id)
                  }}
                >
                  Delete
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <section className="cgpt-config">
          <div className="cgpt-agent-toolbar">
            <h3 className="cgpt-panel-title">多智能体配置</h3>
            <button type="button" className="cgpt-mini-btn" onClick={handleAddAgent}>
              新增
            </button>
          </div>
          <label className="cgpt-field">
            <span>默认 apiKey</span>
            <input
              type="password"
              value={llmConfig.apiKey}
              onChange={(event) =>
                setLlmConfig((prev) => ({
                  ...prev,
                  apiKey: event.target.value
                }))
              }
              placeholder="sk-..."
              autoComplete="off"
            />
          </label>
          <label className="cgpt-field">
            <span>默认 baseUrl</span>
            <input
              type="url"
              value={llmConfig.baseUrl}
              onChange={(event) =>
                setLlmConfig((prev) => ({
                  ...prev,
                  baseUrl: event.target.value
                }))
              }
              placeholder="https://api.openai.com/v1"
              autoComplete="off"
            />
          </label>
          <label className="cgpt-field">
            <span>默认 model</span>
            <input
              type="text"
              value={llmConfig.model}
              onChange={(event) =>
                setLlmConfig((prev) => ({
                  ...prev,
                  model: event.target.value
                }))
              }
              placeholder="gpt-4o-mini"
              autoComplete="off"
            />
          </label>

          <div className="cgpt-agent-list">
            {agentConfigs.map((agent, index) => (
              <div className="cgpt-agent-card" key={agent.id}>
                <div className="cgpt-agent-head">
                  <strong>智能体 {index + 1}</strong>
                  <button
                    type="button"
                    className="cgpt-link-btn"
                    onClick={() => handleRemoveAgent(agent.id)}
                    disabled={agentConfigs.length <= 2}
                  >
                    删除
                  </button>
                </div>
                <label className="cgpt-field">
                  <span>名称</span>
                  <input
                    type="text"
                    value={agent.name}
                    onChange={(event) =>
                      patchAgent(agent.id, (prev) => ({
                        ...prev,
                        name: event.target.value
                      }))
                    }
                    placeholder="例如：分析师"
                    autoComplete="off"
                  />
                </label>
                <label className="cgpt-field">
                  <span>职责</span>
                  <textarea
                    value={agent.responsibility}
                    onChange={(event) =>
                      patchAgent(agent.id, (prev) => ({
                        ...prev,
                        responsibility: event.target.value
                      }))
                    }
                    placeholder="描述该智能体应负责的思考方向"
                    rows={2}
                  />
                </label>
                <label className="cgpt-field">
                  <span>模型</span>
                  <input
                    type="text"
                    value={agent.model}
                    onChange={(event) =>
                      patchAgent(agent.id, (prev) => ({
                        ...prev,
                        model: event.target.value
                      }))
                    }
                    placeholder="例如：gpt-4o-mini"
                    autoComplete="off"
                  />
                </label>
                <label className="cgpt-field">
                  <span>独立 baseUrl（可选）</span>
                  <input
                    type="url"
                    value={agent.baseUrl}
                    onChange={(event) =>
                      patchAgent(agent.id, (prev) => ({
                        ...prev,
                        baseUrl: event.target.value
                      }))
                    }
                    placeholder="留空则使用默认 baseUrl"
                    autoComplete="off"
                  />
                </label>
                <label className="cgpt-field">
                  <span>独立 apiKey（可选）</span>
                  <input
                    type="password"
                    value={agent.apiKey}
                    onChange={(event) =>
                      patchAgent(agent.id, (prev) => ({
                        ...prev,
                        apiKey: event.target.value
                      }))
                    }
                    placeholder="留空则使用默认 apiKey"
                    autoComplete="off"
                  />
                </label>
              </div>
            ))}
          </div>
          <p className="cgpt-config-tip">
            配置会保存到浏览器本地。每个智能体可独立覆盖 model/baseUrl/apiKey，留空时继承默认配置。
          </p>
        </section>

        <section className="cgpt-stats">
          <h3 className="cgpt-panel-title">Conversation chart</h3>
          <div className="cgpt-bar-row">
            <span>User</span>
            <div className="cgpt-bar-track">
              <div className="cgpt-bar-fill user" style={{ width: `${stats.userRatio}%` }} />
            </div>
            <strong>{stats.userCount}</strong>
          </div>
          <div className="cgpt-bar-row">
            <span>AI</span>
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
            <span>Total {stats.totalCount}</span>
            <span>Avg len {stats.avgLength}</span>
          </div>
        </section>
      </aside>

      {isMobile && mobileSidebarOpen ? (
        <button type="button" className="cgpt-backdrop" aria-label="close sidebar" onClick={() => setMobileSidebarOpen(false)} />
      ) : null}

      <main className="cgpt-main">
        <header className="cgpt-main-head">
          {isMobile ? (
            <button className="cgpt-ghost-btn" type="button" onClick={handleToggleSidebar} aria-label="menu">
              {"\u2630"}
            </button>
          ) : null}
          <div className="cgpt-main-title">
            <h1>psyche</h1>
          </div>
        </header>

        <section className={`cgpt-messages ${isWelcomeOnly ? "empty" : ""}`}>
          <div className="cgpt-thread">
            {currentMessages.map((message, index) => (
              <article
                key={message.id}
                className={[
                  "cgpt-message-row",
                  message.role,
                  message.isError ? "error" : "",
                  message.loading ? "loading" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <div className="cgpt-message-bubble">
                  {message.loading ? <LoadingDots /> : <p>{message.content}</p>}

                  {Array.isArray(message.transcript) && message.transcript.length > 0 ? (
                    <details className="cgpt-transcript">
                      <summary>Show debate transcript</summary>
                      <ul>
                        {message.transcript.map((turn, turnIndex) => (
                          <li key={`${message.id}-${turnIndex}`}>
                            <strong>
                              Round {turn?.round || "?"} - {turn?.role || "agent"}
                            </strong>
                            <p>{typeof turn?.content === "string" ? turn.content : ""}</p>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              </article>
            ))}
            <div ref={endRef} />
          </div>
        </section>

        <footer className="cgpt-composer-wrap">
          <form
            className="cgpt-composer"
            onSubmit={(event) => {
              event.preventDefault()
              handleSend()
            }}
          >
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Type your message and press Enter"
              rows={1}
              disabled={sending}
            />
            <button type="submit" disabled={!draft.trim() || sending}>
              {sending ? "Sending" : "Send"}
            </button>
          </form>
        </footer>
      </main>
    </div>
  )
}

