<template>
  <div class="chat-shell">
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-head">
        <button class="new-chat-btn" type="button" @click="createNewConversation">
          + 新对话
        </button>
      </div>

      <div class="conversation-list">
        <button
          v-for="conversation in conversations"
          :key="conversation.id"
          class="conversation-item"
          :class="{ active: conversation.id === activeConversationId }"
          type="button"
          @click="selectConversation(conversation.id)"
        >
          <span class="conversation-title">{{ conversation.title }}</span>
          <span class="conversation-time">{{ formatTime(conversation.updatedAt) }}</span>
          <span
            class="delete-conversation"
            @click.stop="removeConversation(conversation.id)"
          >删除</span>
        </button>
      </div>

      <details class="api-config-panel" open>
        <summary>API 配置</summary>

        <label class="config-label">
          <span>API Key</span>
          <div class="api-key-row">
            <input
              v-model.trim="llmConfig.apiKey"
              :type="showApiKey ? 'text' : 'password'"
              class="config-input"
              placeholder="sk-..."
              autocomplete="off"
              :disabled="isSending"
            >
            <button class="ghost-btn" type="button" @click="showApiKey = !showApiKey">
              {{ showApiKey ? '隐藏' : '显示' }}
            </button>
          </div>
        </label>

        <label class="config-label">
          <span>Base URL</span>
          <input
            v-model.trim="llmConfig.baseUrl"
            class="config-input"
            placeholder="https://api.openai.com/v1"
            autocomplete="off"
            :disabled="isSending"
          >
        </label>

        <label class="config-label">
          <span>Model</span>
          <input
            v-model.trim="llmConfig.model"
            class="config-input"
            placeholder="gpt-4o-mini"
            autocomplete="off"
            :disabled="isSending"
          >
        </label>

        <div class="config-actions">
          <span class="config-state">{{ configStateText }}</span>
          <button class="ghost-btn" type="button" @click="clearLlmConfig" :disabled="isSending">
            清空
          </button>
        </div>
      </details>
    </aside>

    <main class="main-panel">
      <header class="main-header">
        <button class="mobile-menu-btn" type="button" @click="sidebarOpen = !sidebarOpen">
          菜单
        </button>
        <div class="header-title-wrap">
          <h1>Chat</h1>
          <span class="header-model">{{ currentModelLabel }}</span>
        </div>
      </header>

      <section ref="messageViewport" class="message-viewport">
        <div v-if="showWelcome" class="welcome-panel">
          <h2>今天想聊点什么？</h2>
          <p>输入问题后，系统会执行多智能体讨论并给出综合答案。</p>
          <div class="suggestion-grid">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion"
              class="suggestion-btn"
              type="button"
              @click="useSuggestion(suggestion)"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>

        <div v-else class="message-list">
          <article
            v-for="message in activeMessages"
            :key="message.id"
            class="message-row"
            :class="message.role"
          >
            <div class="avatar">{{ message.role === 'user' ? '你' : 'AI' }}</div>
            <div class="message-body">
              <p class="message-content">{{ message.content }}</p>

              <div v-if="message.pending" class="typing-dots" aria-label="AI 正在思考">
                <span></span>
                <span></span>
                <span></span>
              </div>

              <details v-if="message.transcript?.length" class="transcript-panel">
                <summary>查看多智能体讨论过程</summary>
                <ul>
                  <li
                    v-for="(turn, index) in message.transcript"
                    :key="`${message.id}-${index}`"
                  >
                    <strong>第 {{ turn.round }} 轮 · {{ turn.role }}</strong>
                    <p>{{ turn.content }}</p>
                  </li>
                </ul>
              </details>
            </div>
          </article>
        </div>
      </section>

      <footer class="composer-wrap">
        <form class="composer" @submit.prevent="sendMessage">
          <textarea
            v-model.trim="composerText"
            class="composer-input"
            placeholder="给 Chat 发送消息..."
            rows="1"
            :disabled="isSending"
            @keydown.enter.exact.prevent="sendMessage"
          ></textarea>
          <button class="send-btn" type="submit" :disabled="!canSend">
            {{ isSending ? '发送中' : '发送' }}
          </button>
        </form>
        <p v-if="requestError" class="error-tip">{{ requestError }}</p>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'

const CONVERSATION_STORAGE_KEY = 'moa-chat-conversations:v1'
const ACTIVE_STORAGE_KEY = 'moa-chat-active:v1'
const LLM_CONFIG_STORAGE_KEY = 'moa-chat-llm-config:v1'

const suggestions = [
  '帮我制定一个可执行的学习计划',
  '分析这个产品方向的风险和机会',
  '给我一个从 0 到 1 的项目推进方案',
  '如何在资源有限时做技术取舍'
]

const requestUrl = buildDebateUrl(import.meta.env.VITE_API_BASE_URL)

const conversations = ref(loadConversations())
const activeConversationId = ref(loadActiveConversationId(conversations.value))
const composerText = ref('')
const isSending = ref(false)
const requestError = ref('')
const sidebarOpen = ref(false)
const showApiKey = ref(false)
const messageViewport = ref(null)

const llmConfig = reactive(loadLlmConfig())

const activeConversation = computed(() =>
  conversations.value.find((item) => item.id === activeConversationId.value) || null
)

const activeMessages = computed(() => activeConversation.value?.messages || [])

const showWelcome = computed(() => !activeMessages.value.length)

const canSend = computed(() => Boolean(composerText.value.trim()) && !isSending.value)

const currentModelLabel = computed(() => llmConfig.model?.trim() || 'gpt-4o-mini')

const configStateText = computed(() => {
  if (buildLlmPayload()) {
    return '使用前端填写配置'
  }
  return '使用后端环境变量'
})

watch(
  conversations,
  (value) => {
    localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(value))
  },
  { deep: true }
)

watch(activeConversationId, (value) => {
  localStorage.setItem(ACTIVE_STORAGE_KEY, value || '')
})

watch(
  llmConfig,
  (value) => {
    localStorage.setItem(LLM_CONFIG_STORAGE_KEY, JSON.stringify(value))
  },
  { deep: true }
)

watch(
  () => activeMessages.value.length,
  async () => {
    await nextTick()
    scrollToBottom()
  }
)

function buildDebateUrl(base) {
  const normalizedBase = String(base || '').trim().replace(/\/+$/, '')
  if (!normalizedBase) {
    return '/api/debate/answer'
  }
  if (/\/api$/i.test(normalizedBase)) {
    return `${normalizedBase}/debate/answer`
  }
  return `${normalizedBase}/api/debate/answer`
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function nowIso() {
  return new Date().toISOString()
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  } catch {
    return ''
  }
}

function buildTitle(text) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) {
    return '新对话'
  }
  return clean.length > 26 ? `${clean.slice(0, 26)}...` : clean
}

function loadConversations() {
  try {
    const raw = localStorage.getItem(CONVERSATION_STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.map((item) => ({
      id: item.id || createId(),
      title: item.title || '新对话',
      createdAt: item.createdAt || nowIso(),
      updatedAt: item.updatedAt || nowIso(),
      messages: Array.isArray(item.messages) ? item.messages : []
    }))
  } catch {
    return []
  }
}

function loadActiveConversationId(conversationList) {
  const stored = localStorage.getItem(ACTIVE_STORAGE_KEY)
  if (stored && conversationList.some((item) => item.id === stored)) {
    return stored
  }
  return conversationList[0]?.id || ''
}

function loadLlmConfig() {
  try {
    const raw = localStorage.getItem(LLM_CONFIG_STORAGE_KEY)
    if (!raw) {
      return {
        apiKey: '',
        baseUrl: '',
        model: ''
      }
    }
    const parsed = JSON.parse(raw)
    return {
      apiKey: typeof parsed?.apiKey === 'string' ? parsed.apiKey : '',
      baseUrl: typeof parsed?.baseUrl === 'string' ? parsed.baseUrl : '',
      model: typeof parsed?.model === 'string' ? parsed.model : ''
    }
  } catch {
    return {
      apiKey: '',
      baseUrl: '',
      model: ''
    }
  }
}

function buildLlmPayload() {
  const payload = {}
  const apiKey = llmConfig.apiKey.trim()
  const baseUrl = llmConfig.baseUrl.trim()
  const model = llmConfig.model.trim()

  if (apiKey) {
    payload.apiKey = apiKey
  }
  if (baseUrl) {
    payload.baseUrl = baseUrl
  }
  if (model) {
    payload.model = model
  }

  return Object.keys(payload).length ? payload : undefined
}

function createNewConversation() {
  const id = createId()
  const time = nowIso()
  conversations.value.unshift({
    id,
    title: '新对话',
    createdAt: time,
    updatedAt: time,
    messages: []
  })
  activeConversationId.value = id
  composerText.value = ''
  requestError.value = ''
  sidebarOpen.value = false
}

function selectConversation(id) {
  activeConversationId.value = id
  requestError.value = ''
  sidebarOpen.value = false
}

function removeConversation(id) {
  const nextList = conversations.value.filter((item) => item.id !== id)
  conversations.value = nextList
  if (activeConversationId.value === id) {
    activeConversationId.value = nextList[0]?.id || ''
  }
}

function clearLlmConfig() {
  llmConfig.apiKey = ''
  llmConfig.baseUrl = ''
  llmConfig.model = ''
}

function useSuggestion(text) {
  composerText.value = text
  sendMessage()
}

function ensureActiveConversation(seedText) {
  if (activeConversation.value) {
    return activeConversation.value
  }

  const id = createId()
  const time = nowIso()
  const item = {
    id,
    title: buildTitle(seedText),
    createdAt: time,
    updatedAt: time,
    messages: []
  }
  conversations.value.unshift(item)
  activeConversationId.value = id
  return item
}

function createMessage(role, content, extra = {}) {
  return {
    id: createId(),
    role,
    content,
    createdAt: nowIso(),
    ...extra
  }
}

function scrollToBottom() {
  if (!messageViewport.value) {
    return
  }
  messageViewport.value.scrollTop = messageViewport.value.scrollHeight
}

async function sendMessage() {
  const text = composerText.value.trim()
  if (!text || isSending.value) {
    return
  }

  const conversation = ensureActiveConversation(text)
  const userMessage = createMessage('user', text)
  const pendingMessage = createMessage('assistant', '正在组织多智能体讨论...', { pending: true })

  conversation.messages.push(userMessage)
  conversation.messages.push(pendingMessage)
  conversation.updatedAt = nowIso()
  if (conversation.title === '新对话') {
    conversation.title = buildTitle(text)
  }

  composerText.value = ''
  requestError.value = ''
  isSending.value = true

  try {
    const body = { question: text }
    const llm = buildLlmPayload()
    if (llm) {
      body.llm = llm
    }

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const rawText = await response.text()
    const payload = rawText ? JSON.parse(rawText) : {}

    if (!response.ok) {
      throw new Error(payload?.message || `请求失败（HTTP ${response.status}）`)
    }

    const transcript = Array.isArray(payload?.transcript)
      ? payload.transcript.map((item) => ({
          round: Number(item?.round) || 0,
          role: String(item?.role || '智能体'),
          content: String(item?.content || '')
        }))
      : []

    const finalAnswer = String(payload?.finalAnswer || '').trim()
    if (!finalAnswer) {
      throw new Error('接口返回成功，但未提供最终答案')
    }

    const index = conversation.messages.findIndex((item) => item.id === pendingMessage.id)
    if (index >= 0) {
      conversation.messages[index] = createMessage('assistant', finalAnswer, {
        transcript
      })
    } else {
      conversation.messages.push(
        createMessage('assistant', finalAnswer, {
          transcript
        })
      )
    }

    conversation.updatedAt = nowIso()
  } catch (error) {
    requestError.value = error instanceof Error ? error.message : '请求失败，请稍后重试'
    const index = conversation.messages.findIndex((item) => item.id === pendingMessage.id)
    if (index >= 0) {
      conversation.messages.splice(index, 1)
    }
  } finally {
    isSending.value = false
  }
}
</script>

<style scoped>
.chat-shell {
  height: 100vh;
  display: grid;
  grid-template-columns: 280px 1fr;
  background: #0f1115;
  color: #e8eaed;
}

.sidebar {
  background: #171a21;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sidebar-head {
  padding: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.new-chat-btn {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 10px;
  background: transparent;
  color: #e8eaed;
  padding: 10px 12px;
  cursor: pointer;
}

.new-chat-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.conversation-list {
  flex: 1;
  overflow: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.conversation-item {
  width: 100%;
  text-align: left;
  background: #20242d;
  border: 1px solid transparent;
  color: #e8eaed;
  border-radius: 10px;
  padding: 10px;
  display: grid;
  gap: 4px;
  cursor: pointer;
}

.conversation-item.active {
  border-color: rgba(255, 255, 255, 0.3);
  background: #2a313d;
}

.conversation-title {
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-time {
  font-size: 0.75rem;
  color: #a4adba;
}

.delete-conversation {
  font-size: 0.74rem;
  color: #f7a7a7;
  justify-self: end;
}

.api-config-panel {
  margin: 10px;
  padding: 10px;
  border-radius: 10px;
  background: #20242d;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.api-config-panel summary {
  cursor: pointer;
  font-size: 0.86rem;
  color: #b9c3d2;
}

.config-label {
  display: grid;
  gap: 6px;
  margin-top: 10px;
  font-size: 0.82rem;
  color: #b9c3d2;
}

.api-key-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.config-input {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  padding: 8px 10px;
  background: #11151d;
  color: #e8eaed;
}

.config-input:focus {
  outline: none;
  border-color: #85b4ff;
}

.config-actions {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.config-state {
  font-size: 0.74rem;
  color: #9aa4b4;
}

.ghost-btn {
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 8px;
  background: transparent;
  color: #e8eaed;
  padding: 6px 10px;
  cursor: pointer;
}

.main-panel {
  min-height: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: #0f1115;
}

.main-header {
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  gap: 12px;
}

.mobile-menu-btn {
  display: none;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 8px;
  background: transparent;
  color: #e8eaed;
  padding: 6px 10px;
}

.header-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title-wrap h1 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.header-model {
  font-size: 0.78rem;
  color: #9aa4b4;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  padding: 3px 8px;
}

.message-viewport {
  overflow: auto;
  padding: 22px 20px;
}

.welcome-panel {
  max-width: 760px;
  margin: 40px auto;
  text-align: center;
}

.welcome-panel h2 {
  margin: 0;
  font-size: 1.8rem;
}

.welcome-panel p {
  color: #a7b1bf;
  margin-top: 12px;
}

.suggestion-grid {
  margin-top: 20px;
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.suggestion-btn {
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  background: #1a1f28;
  color: #d7dce5;
  padding: 12px;
  text-align: left;
  cursor: pointer;
}

.suggestion-btn:hover {
  background: #222938;
}

.message-list {
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-row {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 10px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 0.78rem;
  background: #273245;
  color: #d5dded;
}

.message-row.user .avatar {
  background: #2f5bb6;
}

.message-body {
  background: #171c24;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px;
}

.message-row.user .message-body {
  background: #1f2e4f;
}

.message-content {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.68;
}

.typing-dots {
  margin-top: 10px;
  display: inline-flex;
  gap: 5px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #b3bccb;
  animation: blink 1.1s infinite ease-in-out;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

.transcript-panel {
  margin-top: 10px;
  border-top: 1px dashed rgba(255, 255, 255, 0.2);
  padding-top: 8px;
}

.transcript-panel summary {
  cursor: pointer;
  color: #aeb8c7;
  font-size: 0.85rem;
}

.transcript-panel ul {
  margin: 10px 0 0;
  padding-left: 16px;
  display: grid;
  gap: 8px;
}

.transcript-panel li {
  color: #c7d0dd;
}

.transcript-panel li p {
  margin: 6px 0 0;
  white-space: pre-wrap;
  color: #dde3ee;
}

.composer-wrap {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 16px 18px 18px;
  background: #0f1115;
}

.composer {
  max-width: 860px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}

.composer-input {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 12px;
  background: #141922;
  color: #e8eaed;
  padding: 12px;
  resize: none;
  min-height: 52px;
  max-height: 200px;
}

.composer-input:focus {
  outline: none;
  border-color: #85b4ff;
}

.send-btn {
  border: none;
  border-radius: 10px;
  background: #2f67ff;
  color: white;
  padding: 0 16px;
  min-width: 84px;
  cursor: pointer;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-tip {
  max-width: 860px;
  margin: 8px auto 0;
  color: #ff9b9b;
  font-size: 0.85rem;
}

@media (max-width: 960px) {
  .chat-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: fixed;
    z-index: 30;
    inset: 0 auto 0 0;
    width: min(82vw, 320px);
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0);
  }

  .sidebar.open {
    transform: translateX(0);
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
  }

  .mobile-menu-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .suggestion-grid {
    grid-template-columns: 1fr;
  }
}
</style>