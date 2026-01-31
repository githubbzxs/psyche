
<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <h1>多 Agent 辩论平台</h1>
        <p>项目、代理人与辩论流程一体化管理，数据本地可持久化。</p>
        <div class="status-chip">
          <span>运行模式</span>
          <strong>{{ runtimeLabel }}</strong>
        </div>
      </div>
      <div class="toolbar">
        <button class="btn ghost" type="button" @click="triggerImport">导入数据</button>
        <button class="btn ghost" type="button" @click="exportData">导出数据</button>
        <button class="btn ghost" type="button" @click="seedSample">加载示例</button>
        <button class="btn danger" type="button" @click="clearAll">清空数据</button>
      </div>
    </header>

    <div v-if="notice.text" :class="['notice', noticeClass]">
      {{ notice.text }}
    </div>

    <div class="layout">
      <aside class="panel">
        <div class="section-title">
          <div>
            <h2>项目</h2>
            <div class="panel-sub">组织辩论主题与成员</div>
          </div>
          <span class="pill">{{ state.projects.length }} 个</span>
        </div>

        <form class="list" @submit.prevent="saveProject">
          <div class="field">
            <label>项目名称</label>
            <input v-model="projectForm.name" class="input" required />
          </div>
          <div class="field">
            <label>描述</label>
            <input v-model="projectForm.description" class="input" placeholder="可选" />
          </div>
          <div class="actions">
            <button class="btn primary" type="submit">
              {{ projectEditingId ? '更新项目' : '新建项目' }}
            </button>
            <button class="btn ghost" type="button" @click="resetProjectForm">清空</button>
          </div>
        </form>

        <div class="list">
          <div
            v-for="project in state.projects"
            :key="project.id"
            class="card"
            :class="{ highlight: project.id === state.selectedProjectId }"
          >
            <div class="card-header">
              <div class="card-title">{{ project.name }}</div>
              <span class="badge">{{ countSessions(project.id) }} 场</span>
            </div>
            <div class="small">{{ project.description || '暂无描述' }}</div>
            <div class="actions">
              <button class="btn ghost" type="button" @click="selectProject(project.id)">进入</button>
              <button class="btn ghost" type="button" @click="editProject(project)">编辑</button>
              <button class="btn danger" type="button" @click="removeProject(project.id)">删除</button>
            </div>
          </div>
        </div>
        <div class="section-title">
          <div>
            <h2>会话</h2>
            <div class="panel-sub">聚焦单次辩论流程</div>
          </div>
          <span class="pill">{{ projectSessions.length }} 场</span>
        </div>

        <div v-if="!selectedProject" class="notice warn">请先创建并选择项目。</div>

        <form v-else class="list" @submit.prevent="saveSession">
          <div class="field">
            <label>会话标题</label>
            <input v-model="sessionForm.title" class="input" required />
          </div>
          <div class="grid-2">
            <div class="field">
              <label>最大回合</label>
              <input v-model.number="sessionForm.maxTurns" class="input" type="number" min="1" />
            </div>
            <div class="field">
              <label>状态</label>
              <select v-model="sessionForm.status" class="input">
                <option value="idle">待开始</option>
                <option value="running">进行中</option>
                <option value="paused">已暂停</option>
                <option value="done">已结束</option>
              </select>
            </div>
          </div>
          <div class="actions">
            <button class="btn secondary" type="submit">
              {{ sessionEditingId ? '更新会话' : '新建会话' }}
            </button>
            <button class="btn ghost" type="button" @click="resetSessionForm">清空</button>
          </div>
        </form>

        <div class="list">
          <div
            v-for="session in projectSessions"
            :key="session.id"
            class="card"
            :class="{ highlight: session.id === state.selectedSessionId }"
          >
            <div class="card-header">
              <div class="card-title">{{ session.title }}</div>
              <span class="badge" :class="statusBadge(session.status)">{{ statusLabel(session.status) }}</span>
            </div>
            <div class="small">{{ formatTime(session.createdAt) }}</div>
            <div class="actions">
              <button class="btn ghost" type="button" @click="selectSession(session.id)">打开</button>
              <button class="btn ghost" type="button" @click="editSession(session)">编辑</button>
              <button class="btn ghost" type="button" @click="resetSession(session.id)">重置</button>
              <button class="btn danger" type="button" @click="removeSession(session.id)">删除</button>
            </div>
          </div>
        </div>
      </aside>

      <main class="panel">
        <div class="section-title">
          <div>
            <h2>辩论现场</h2>
            <div class="panel-sub">多代理交替发言，支持自动运行与手动补充</div>
          </div>
          <span class="pill">{{ selectedSession ? statusLabel(selectedSession.status) : '未选择' }}</span>
        </div>

        <div v-if="!selectedSession" class="notice warn">请选择一个会话开始测试。</div>

        <div v-else class="list">
          <div class="kpi-grid">
            <div class="kpi">
              <span>当前回合</span>
              <strong>{{ selectedSession.currentTurn }} / {{ selectedSession.maxTurns }}</strong>
            </div>
            <div class="kpi">
              <span>消息数量</span>
              <strong>{{ messageCount }}</strong>
            </div>
            <div class="kpi">
              <span>预估 Tokens</span>
              <strong>{{ tokenCount }}</strong>
            </div>
          </div>

          <div class="actions">
            <button class="btn primary" type="button" @click="startDebate">开始 / 继续</button>
            <button class="btn secondary" type="button" @click="runOneTurn">运行一回合</button>
            <button class="btn ghost" type="button" @click="toggleAuto">
              {{ state.autoRunning ? '暂停自动' : '自动运行' }}
            </button>
            <button class="btn ghost" type="button" @click="resetSession(selectedSession.id)">重置会话</button>
          </div>

          <div class="message-list">
            <div v-for="message in sessionMessages" :key="message.id" class="message">
              <div class="meta">
                <span class="role">{{ message.agentName || roleLabel(message.role) }}</span>
                <span>{{ formatTime(message.createdAt) }}</span>
                <span class="pill">{{ roleLabel(message.role) }}</span>
              </div>
              <div class="content">{{ message.content }}</div>
            </div>
          </div>

          <form class="list" @submit.prevent="addUserMessage">
            <div class="field">
              <label>手动补充观点</label>
              <textarea v-model="userMessage" placeholder="输入用户观点，会作为本轮补充" required></textarea>
            </div>
            <div class="actions">
              <button class="btn secondary" type="submit">添加用户发言</button>
              <button class="btn ghost" type="button" @click="userMessage = ''">清空</button>
            </div>
          </form>
        </div>
      </main>
      <aside class="panel">
        <div class="section-title">
          <div>
            <h2>代理人配置</h2>
            <div class="panel-sub">为项目配置参与者与角色</div>
          </div>
        </div>

        <div v-if="!selectedProject" class="notice warn">请先选择项目再配置代理人。</div>

        <form v-else class="list" @submit.prevent="saveAgent">
          <div class="field">
            <label>代理人名称</label>
            <input v-model="agentForm.name" class="input" required />
          </div>
          <div class="grid-2">
            <div class="field">
              <label>角色</label>
              <input v-model="agentForm.role" class="input" placeholder="正方 / 反方 / 裁判" required />
            </div>
            <div class="field">
              <label>模型</label>
              <input v-model="agentForm.model" class="input" placeholder="gpt-4o-mini" required />
            </div>
          </div>
          <div class="field">
            <label>绑定供应商</label>
            <select v-model="agentForm.providerConfigId" class="input">
              <option value="">不绑定</option>
              <option v-for="provider in state.providerConfigs" :key="provider.id" :value="provider.id">
                {{ provider.name }}
              </option>
            </select>
          </div>
          <div class="actions">
            <button class="btn primary" type="submit">
              {{ agentEditingId ? '更新代理人' : '添加代理人' }}
            </button>
            <button class="btn ghost" type="button" @click="resetAgentForm">清空</button>
          </div>
        </form>

        <div class="list">
          <div v-for="agent in projectAgents" :key="agent.id" class="card">
            <div class="card-header">
              <div class="card-title">{{ agent.name }}</div>
              <span class="badge">{{ agent.role }}</span>
            </div>
            <div class="small">模型：{{ agent.model }}</div>
            <div class="small">
              供应商：{{ providerName(agent.providerConfigId) || '未绑定' }}
            </div>
            <div class="actions">
              <button class="btn ghost" type="button" @click="editAgent(agent)">编辑</button>
              <button class="btn danger" type="button" @click="removeAgent(agent.id)">删除</button>
            </div>
          </div>
        </div>

        <div class="section-title">
          <div>
            <h2>模型供应商</h2>
            <div class="panel-sub">用于记录 API 配置</div>
          </div>
        </div>

        <form class="list" @submit.prevent="saveProvider">
          <div class="field">
            <label>名称</label>
            <input v-model="providerForm.name" class="input" required />
          </div>
          <div class="grid-2">
            <div class="field">
              <label>类型</label>
              <select v-model="providerForm.type" class="input">
                <option value="openai">OpenAI 兼容</option>
                <option value="anthropic">Anthropic</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            <div class="field">
              <label>默认模型</label>
              <input v-model="providerForm.defaultModel" class="input" required />
            </div>
          </div>
          <div class="field">
            <label>Base URL</label>
            <input v-model="providerForm.baseUrl" class="input" required />
          </div>
          <div class="field">
            <label>API Key</label>
            <input v-model="providerForm.apiKey" class="input" required />
          </div>
          <div class="actions">
            <button class="btn secondary" type="submit">
              {{ providerEditingId ? '更新供应商' : '添加供应商' }}
            </button>
            <button class="btn ghost" type="button" @click="resetProviderForm">清空</button>
          </div>
        </form>

        <div class="list">
          <div v-for="provider in state.providerConfigs" :key="provider.id" class="card">
            <div class="card-header">
              <div class="card-title">{{ provider.name }}</div>
              <span class="badge">{{ provider.type }}</span>
            </div>
            <div class="small">Base：{{ provider.baseUrl }}</div>
            <div class="small">模型：{{ provider.defaultModel }}</div>
            <div class="actions">
              <button class="btn ghost" type="button" @click="editProvider(provider)">编辑</button>
              <button class="btn danger" type="button" @click="removeProvider(provider.id)">删除</button>
            </div>
          </div>
        </div>

        <div class="section-title">
          <div>
            <h2>API 映射</h2>
            <div class="panel-sub">用于描述第三方响应路径</div>
          </div>
        </div>

        <form class="list" @submit.prevent="saveMapping">
          <div class="field">
            <label>名称</label>
            <input v-model="mappingForm.name" class="input" required />
          </div>
          <div class="grid-2">
            <div class="field">
              <label>供应商类型</label>
              <select v-model="mappingForm.providerType" class="input">
                <option value="openai">OpenAI 兼容</option>
                <option value="anthropic">Anthropic</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            <div class="field">
              <label>请求方法</label>
              <select v-model="mappingForm.method" class="input">
                <option value="POST">POST</option>
                <option value="GET">GET</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label>请求路径</label>
            <input v-model="mappingForm.path" class="input" required />
          </div>
          <div class="grid-2">
            <div class="field">
              <label>内容路径</label>
              <input v-model="mappingForm.messagePath" class="input" required />
            </div>
            <div class="field">
              <label>用量路径</label>
              <input v-model="mappingForm.usagePath" class="input" placeholder="可选" />
            </div>
          </div>
          <div class="actions">
            <button class="btn secondary" type="submit">
              {{ mappingEditingId ? '更新映射' : '添加映射' }}
            </button>
            <button class="btn ghost" type="button" @click="resetMappingForm">清空</button>
          </div>
        </form>

        <div class="list">
          <div v-for="mapping in state.apiMappings" :key="mapping.id" class="card">
            <div class="card-header">
              <div class="card-title">{{ mapping.name }}</div>
              <span class="badge">{{ mapping.providerType }}</span>
            </div>
            <div class="small">{{ mapping.request.method }} {{ mapping.request.path }}</div>
            <div class="small">内容路径：{{ mapping.response.messagePath }}</div>
            <div class="actions">
              <button class="btn ghost" type="button" @click="editMapping(mapping)">编辑</button>
              <button class="btn danger" type="button" @click="removeMapping(mapping.id)">删除</button>
            </div>
          </div>
        </div>

        <div class="section-title">
          <div>
            <h2>系统设置</h2>
            <div class="panel-sub">影响新会话的默认参数</div>
          </div>
        </div>

        <div class="list">
          <div class="grid-2">
            <div class="field">
              <label>语言</label>
              <select v-model="state.settings.language" class="input">
                <option value="zh-CN">中文</option>
                <option value="en-US">英文</option>
              </select>
            </div>
            <div class="field">
              <label>流模式</label>
              <select v-model="state.settings.streamMode" class="input">
                <option value="batch">批量</option>
                <option value="stream">流式</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label>默认最大回合</label>
            <input v-model.number="state.settings.maxTurns" class="input" type="number" min="1" />
          </div>
        </div>

        <div class="section-title">
          <div>
            <h2>策略提示词</h2>
            <div class="panel-sub">影响本地模拟生成内容</div>
          </div>
        </div>

        <div class="list">
          <div class="field">
            <label>提示词</label>
            <textarea v-model="state.strategy.prompt" placeholder="例如：强调数据驱动、给出结论" />
          </div>
          <div class="grid-2">
            <div class="field">
              <label>绑定供应商</label>
              <select v-model="state.strategy.providerConfigId" class="input">
                <option value="">未绑定</option>
                <option v-for="provider in state.providerConfigs" :key="provider.id" :value="provider.id">
                  {{ provider.name }}
                </option>
              </select>
            </div>
            <div class="field">
              <label>模型</label>
              <input v-model="state.strategy.model" class="input" placeholder="gpt-4o-mini" />
            </div>
          </div>
        </div>
      </aside>
    </div>

    <footer class="footer">数据仅存于本地浏览器，删除或清空后不可恢复。</footer>

    <input ref="importInput" type="file" accept="application/json" style="display: none" @change="handleImport" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'

const STORAGE_KEY = 'moa-web:v1'

const notice = reactive({ text: '', type: 'info' })
const noticeClass = computed(() => (notice.type === 'info' ? '' : notice.type))
let noticeTimer

function showNotice(text, type = 'info') {
  notice.text = text
  notice.type = type
  if (noticeTimer) {
    clearTimeout(noticeTimer)
  }
  noticeTimer = setTimeout(() => {
    notice.text = ''
    notice.type = 'info'
  }, 2400)
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
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

function roleLabel(role) {
  if (role === 'system') return '系统'
  if (role === 'user') return '用户'
  return '代理人'
}

function statusLabel(status) {
  if (status === 'running') return '进行中'
  if (status === 'paused') return '已暂停'
  if (status === 'done') return '已结束'
  return '待开始'
}

function statusBadge(status) {
  if (status === 'running') return ''
  if (status === 'paused') return 'warn'
  if (status === 'done') return 'danger'
  return ''
}

function estimateTokens(text) {
  const length = text.replace(/\s+/g, '').length
  return Math.max(1, Math.ceil(length / 4))
}
const sampleState = () => {
  const projectA = createId()
  const projectB = createId()
  const sessionA = createId()
  const agent1 = createId()
  const agent2 = createId()
  const agent3 = createId()
  const provider1 = createId()
  return {
    projects: [
      {
        id: projectA,
        name: '产品策略辩论',
        description: '验证多 Agent 协作在产品决策中的价值',
        createdAt: nowIso()
      },
      {
        id: projectB,
        name: '技术路线评审',
        description: '围绕架构选型进行多视角讨论',
        createdAt: nowIso()
      }
    ],
    sessions: [
      {
        id: sessionA,
        projectId: projectA,
        title: '是否采用多模型投票策略',
        status: 'idle',
        maxTurns: 6,
        currentTurn: 0,
        createdAt: nowIso()
      }
    ],
    agents: [
      {
        id: agent1,
        projectId: projectA,
        name: '主张者',
        role: '正方',
        model: 'gpt-4o-mini',
        providerConfigId: provider1
      },
      {
        id: agent2,
        projectId: projectA,
        name: '审慎派',
        role: '反方',
        model: 'claude-3.5',
        providerConfigId: provider1
      },
      {
        id: agent3,
        projectId: projectA,
        name: '裁判',
        role: '裁判',
        model: 'gpt-4.1',
        providerConfigId: provider1
      }
    ],
    messages: [
      {
        id: createId(),
        sessionId: sessionA,
        role: 'system',
        content: '本场辩论聚焦于多模型投票策略的可行性与风险，请保持结构化输出。',
        agentId: null,
        agentName: '系统',
        createdAt: nowIso()
      }
    ],
    providerConfigs: [
      {
        id: provider1,
        name: '默认供应商',
        type: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o-mini',
        apiKey: 'sk-xxxxxxxx'
      }
    ],
    apiMappings: [
      {
        id: createId(),
        name: 'OpenAI 兼容',
        providerType: 'openai',
        request: {
          method: 'POST',
          path: '/chat/completions',
          headers: { 'Content-Type': 'application/json' },
          body: { model: 'gpt-4o-mini', messages: [] }
        },
        response: {
          messagePath: 'choices.0.message.content',
          usagePath: 'usage'
        }
      }
    ],
    settings: {
      language: 'zh-CN',
      theme: 'dark-cyber',
      streamMode: 'batch',
      maxTurns: 6
    },
    strategy: {
      providerConfigId: provider1,
      model: 'gpt-4o-mini',
      prompt: '围绕成本、效果与风险给出结构化观点，最后给出建议。'
    },
    selectedProjectId: projectA,
    selectedSessionId: sessionA,
    autoRunning: false
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return sampleState()
    const data = JSON.parse(raw)
    return normalizeState(data)
  } catch (error) {
    return sampleState()
  }
}

function normalizeState(data) {
  const base = sampleState()
  return {
    ...base,
    ...data,
    projects: Array.isArray(data.projects) ? data.projects : base.projects,
    sessions: Array.isArray(data.sessions) ? data.sessions : base.sessions,
    agents: Array.isArray(data.agents) ? data.agents : base.agents,
    messages: Array.isArray(data.messages) ? data.messages : base.messages,
    providerConfigs: Array.isArray(data.providerConfigs) ? data.providerConfigs : base.providerConfigs,
    apiMappings: Array.isArray(data.apiMappings) ? data.apiMappings : base.apiMappings,
    settings: { ...base.settings, ...(data.settings || {}) },
    strategy: { ...base.strategy, ...(data.strategy || {}) },
    selectedProjectId: data.selectedProjectId || base.selectedProjectId,
    selectedSessionId: data.selectedSessionId || base.selectedSessionId,
    autoRunning: false
  }
}

const state = reactive(loadState())

const runtimeLabel = computed(() => '本地模拟')

const selectedProject = computed(() =>
  state.projects.find((project) => project.id === state.selectedProjectId)
)

const projectSessions = computed(() =>
  state.sessions.filter((session) => session.projectId === state.selectedProjectId)
)

const selectedSession = computed(() =>
  state.sessions.find((session) => session.id === state.selectedSessionId)
)

const projectAgents = computed(() =>
  state.agents.filter((agent) => agent.projectId === state.selectedProjectId)
)

const sessionMessages = computed(() =>
  state.messages
    .filter((message) => message.sessionId === state.selectedSessionId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
)

const messageCount = computed(() => sessionMessages.value.length)
const tokenCount = computed(() =>
  sessionMessages.value.reduce((sum, msg) => sum + estimateTokens(msg.content), 0)
)

const projectForm = reactive({ name: '', description: '' })
const projectEditingId = ref('')

const sessionForm = reactive({ title: '', maxTurns: 6, status: 'idle' })
const sessionEditingId = ref('')

const agentForm = reactive({ name: '', role: '', model: '', providerConfigId: '' })
const agentEditingId = ref('')

const providerForm = reactive({
  name: '',
  type: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  defaultModel: '',
  apiKey: ''
})
const providerEditingId = ref('')

const mappingForm = reactive({
  name: '',
  providerType: 'openai',
  method: 'POST',
  path: '/chat/completions',
  messagePath: 'choices.0.message.content',
  usagePath: ''
})
const mappingEditingId = ref('')

const userMessage = ref('')
const importInput = ref(null)
function countSessions(projectId) {
  return state.sessions.filter((session) => session.projectId === projectId).length
}

function selectProject(projectId) {
  state.selectedProjectId = projectId
  const sessions = state.sessions.filter((session) => session.projectId === projectId)
  state.selectedSessionId = sessions[0]?.id || ''
}

function saveProject() {
  if (!projectForm.name.trim()) {
    showNotice('项目名称不能为空', 'warn')
    return
  }
  if (projectEditingId.value) {
    const project = state.projects.find((item) => item.id === projectEditingId.value)
    if (project) {
      project.name = projectForm.name.trim()
      project.description = projectForm.description.trim()
      showNotice('项目已更新')
    }
  } else {
    const id = createId()
    state.projects.push({
      id,
      name: projectForm.name.trim(),
      description: projectForm.description.trim(),
      createdAt: nowIso()
    })
    state.selectedProjectId = id
    showNotice('项目已创建')
  }
  resetProjectForm()
}

function editProject(project) {
  projectEditingId.value = project.id
  projectForm.name = project.name
  projectForm.description = project.description || ''
}

function removeProject(projectId) {
  if (!confirm('确认删除该项目及其相关数据？')) return
  state.projects = state.projects.filter((project) => project.id !== projectId)
  state.sessions = state.sessions.filter((session) => session.projectId !== projectId)
  state.agents = state.agents.filter((agent) => agent.projectId !== projectId)
  state.messages = state.messages.filter((message) => {
    const session = state.sessions.find((item) => item.id === message.sessionId)
    return Boolean(session)
  })
  if (state.selectedProjectId === projectId) {
    state.selectedProjectId = state.projects[0]?.id || ''
    state.selectedSessionId = projectSessions.value[0]?.id || ''
  }
  showNotice('项目已删除', 'warn')
}

function resetProjectForm() {
  projectEditingId.value = ''
  projectForm.name = ''
  projectForm.description = ''
}

function saveSession() {
  if (!selectedProject.value) {
    showNotice('请先选择项目', 'warn')
    return
  }
  if (!sessionForm.title.trim()) {
    showNotice('会话标题不能为空', 'warn')
    return
  }
  if (sessionEditingId.value) {
    const session = state.sessions.find((item) => item.id === sessionEditingId.value)
    if (session) {
      session.title = sessionForm.title.trim()
      session.maxTurns = sessionForm.maxTurns || state.settings.maxTurns
      session.status = sessionForm.status
      showNotice('会话已更新')
    }
  } else {
    const id = createId()
    state.sessions.push({
      id,
      projectId: selectedProject.value.id,
      title: sessionForm.title.trim(),
      status: sessionForm.status,
      maxTurns: sessionForm.maxTurns || state.settings.maxTurns,
      currentTurn: 0,
      createdAt: nowIso()
    })
    state.selectedSessionId = id
    showNotice('会话已创建')
  }
  resetSessionForm()
}

function editSession(session) {
  sessionEditingId.value = session.id
  sessionForm.title = session.title
  sessionForm.maxTurns = session.maxTurns
  sessionForm.status = session.status
}

function selectSession(sessionId) {
  state.selectedSessionId = sessionId
}

function removeSession(sessionId) {
  if (!confirm('确认删除该会话及其消息？')) return
  state.sessions = state.sessions.filter((session) => session.id !== sessionId)
  state.messages = state.messages.filter((message) => message.sessionId !== sessionId)
  if (state.selectedSessionId === sessionId) {
    state.selectedSessionId = projectSessions.value[0]?.id || ''
  }
  showNotice('会话已删除', 'warn')
}

function resetSession(sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId)
  if (!session) return
  session.status = 'idle'
  session.currentTurn = 0
  state.messages = state.messages.filter((message) => message.sessionId !== sessionId)
  showNotice('会话已重置')
}

function resetSessionForm() {
  sessionEditingId.value = ''
  sessionForm.title = ''
  sessionForm.maxTurns = state.settings.maxTurns
  sessionForm.status = 'idle'
}

function saveAgent() {
  if (!selectedProject.value) {
    showNotice('请先选择项目', 'warn')
    return
  }
  if (!agentForm.name.trim()) {
    showNotice('代理人名称不能为空', 'warn')
    return
  }
  if (agentEditingId.value) {
    const agent = state.agents.find((item) => item.id === agentEditingId.value)
    if (agent) {
      agent.name = agentForm.name.trim()
      agent.role = agentForm.role.trim()
      agent.model = agentForm.model.trim()
      agent.providerConfigId = agentForm.providerConfigId || null
      showNotice('代理人已更新')
    }
  } else {
    state.agents.push({
      id: createId(),
      projectId: selectedProject.value.id,
      name: agentForm.name.trim(),
      role: agentForm.role.trim(),
      model: agentForm.model.trim(),
      providerConfigId: agentForm.providerConfigId || null
    })
    showNotice('代理人已添加')
  }
  resetAgentForm()
}

function editAgent(agent) {
  agentEditingId.value = agent.id
  agentForm.name = agent.name
  agentForm.role = agent.role
  agentForm.model = agent.model
  agentForm.providerConfigId = agent.providerConfigId || ''
}

function removeAgent(agentId) {
  if (!confirm('确认删除该代理人？')) return
  state.agents = state.agents.filter((agent) => agent.id !== agentId)
  showNotice('代理人已删除', 'warn')
}

function resetAgentForm() {
  agentEditingId.value = ''
  agentForm.name = ''
  agentForm.role = ''
  agentForm.model = ''
  agentForm.providerConfigId = ''
}

function providerName(providerId) {
  return state.providerConfigs.find((item) => item.id === providerId)?.name
}

function saveProvider() {
  if (!providerForm.name.trim()) {
    showNotice('供应商名称不能为空', 'warn')
    return
  }
  if (providerEditingId.value) {
    const provider = state.providerConfigs.find((item) => item.id === providerEditingId.value)
    if (provider) {
      provider.name = providerForm.name.trim()
      provider.type = providerForm.type
      provider.baseUrl = providerForm.baseUrl.trim()
      provider.defaultModel = providerForm.defaultModel.trim()
      provider.apiKey = providerForm.apiKey.trim()
      showNotice('供应商已更新')
    }
  } else {
    state.providerConfigs.push({
      id: createId(),
      name: providerForm.name.trim(),
      type: providerForm.type,
      baseUrl: providerForm.baseUrl.trim(),
      defaultModel: providerForm.defaultModel.trim(),
      apiKey: providerForm.apiKey.trim()
    })
    showNotice('供应商已添加')
  }
  resetProviderForm()
}

function editProvider(provider) {
  providerEditingId.value = provider.id
  providerForm.name = provider.name
  providerForm.type = provider.type
  providerForm.baseUrl = provider.baseUrl
  providerForm.defaultModel = provider.defaultModel
  providerForm.apiKey = provider.apiKey
}

function removeProvider(providerId) {
  if (!confirm('确认删除该供应商？')) return
  state.providerConfigs = state.providerConfigs.filter((item) => item.id !== providerId)
  state.agents = state.agents.map((agent) => ({
    ...agent,
    providerConfigId: agent.providerConfigId === providerId ? null : agent.providerConfigId
  }))
  if (state.strategy.providerConfigId === providerId) {
    state.strategy.providerConfigId = ''
  }
  showNotice('供应商已删除', 'warn')
}

function resetProviderForm() {
  providerEditingId.value = ''
  providerForm.name = ''
  providerForm.type = 'openai'
  providerForm.baseUrl = 'https://api.openai.com/v1'
  providerForm.defaultModel = ''
  providerForm.apiKey = ''
}

function saveMapping() {
  if (!mappingForm.name.trim()) {
    showNotice('映射名称不能为空', 'warn')
    return
  }
  const mapping = {
    id: mappingEditingId.value || createId(),
    name: mappingForm.name.trim(),
    providerType: mappingForm.providerType,
    request: {
      method: mappingForm.method,
      path: mappingForm.path.trim(),
      headers: { 'Content-Type': 'application/json' },
      body: {}
    },
    response: {
      messagePath: mappingForm.messagePath.trim(),
      usagePath: mappingForm.usagePath.trim()
    }
  }
  if (mappingEditingId.value) {
    const index = state.apiMappings.findIndex((item) => item.id === mappingEditingId.value)
    if (index >= 0) {
      state.apiMappings[index] = mapping
      showNotice('映射已更新')
    }
  } else {
    state.apiMappings.push(mapping)
    showNotice('映射已添加')
  }
  resetMappingForm()
}

function editMapping(mapping) {
  mappingEditingId.value = mapping.id
  mappingForm.name = mapping.name
  mappingForm.providerType = mapping.providerType
  mappingForm.method = mapping.request.method
  mappingForm.path = mapping.request.path
  mappingForm.messagePath = mapping.response.messagePath
  mappingForm.usagePath = mapping.response.usagePath || ''
}

function removeMapping(mappingId) {
  if (!confirm('确认删除该映射？')) return
  state.apiMappings = state.apiMappings.filter((item) => item.id !== mappingId)
  showNotice('映射已删除', 'warn')
}

function resetMappingForm() {
  mappingEditingId.value = ''
  mappingForm.name = ''
  mappingForm.providerType = 'openai'
  mappingForm.method = 'POST'
  mappingForm.path = '/chat/completions'
  mappingForm.messagePath = 'choices.0.message.content'
  mappingForm.usagePath = ''
}
function ensureSystemPrompt(sessionId) {
  const existing = state.messages.find((item) => item.sessionId === sessionId && item.role === 'system')
  if (existing) return
  const prompt = state.strategy.prompt?.trim()
  if (!prompt) return
  state.messages.push({
    id: createId(),
    sessionId,
    role: 'system',
    content: prompt,
    agentId: null,
    agentName: '系统',
    createdAt: nowIso()
  })
}

function createAgentMessage(agent, session, turn, lastMessage) {
  const topic = session.title
  const tip = state.strategy.prompt ? `策略提示：${state.strategy.prompt}` : ''
  const last = lastMessage ? `上一条观点提到“${lastMessage.content.slice(0, 28)}”，` : ''
  const content = `${agent.role}观点（第${turn}回合）：围绕「${topic}」，${last}我建议从目标、成本、风险三方面展开，给出明确结论。${tip}`
  return {
    id: createId(),
    sessionId: session.id,
    role: 'assistant',
    content,
    agentId: agent.id,
    agentName: agent.name,
    createdAt: nowIso()
  }
}

function runOneTurn() {
  const session = selectedSession.value
  if (!session) {
    showNotice('请选择会话', 'warn')
    return
  }
  const agents = projectAgents.value
  if (!agents.length) {
    showNotice('请先配置代理人', 'warn')
    return
  }
  if (session.status === 'done') {
    showNotice('会话已结束', 'warn')
    stopAuto()
    return
  }
  const nextTurn = session.currentTurn + 1
  if (nextTurn > session.maxTurns) {
    session.status = 'done'
    stopAuto()
    return
  }
  ensureSystemPrompt(session.id)
  session.status = 'running'
  session.currentTurn = nextTurn
  const lastMessage = sessionMessages.value[sessionMessages.value.length - 1]
  agents.forEach((agent) => {
    state.messages.push(createAgentMessage(agent, session, nextTurn, lastMessage))
  })
  if (nextTurn >= session.maxTurns) {
    session.status = 'done'
    stopAuto()
    showNotice('会话已完成')
  }
}

function startDebate() {
  if (!selectedSession.value) {
    showNotice('请选择会话', 'warn')
    return
  }
  if (selectedSession.value.status === 'done') {
    showNotice('会话已结束，请重置后再开始', 'warn')
    return
  }
  runOneTurn()
}

function toggleAuto() {
  if (state.autoRunning) {
    stopAuto()
    return
  }
  startAuto()
}

let autoTimer
function startAuto() {
  if (!selectedSession.value) {
    showNotice('请选择会话', 'warn')
    return
  }
  state.autoRunning = true
  autoTimer = setInterval(() => {
    runOneTurn()
  }, 1600)
}

function stopAuto() {
  state.autoRunning = false
  if (autoTimer) {
    clearInterval(autoTimer)
    autoTimer = null
  }
}

function addUserMessage() {
  if (!selectedSession.value) {
    showNotice('请选择会话', 'warn')
    return
  }
  if (!userMessage.value.trim()) {
    showNotice('请输入内容', 'warn')
    return
  }
  state.messages.push({
    id: createId(),
    sessionId: selectedSession.value.id,
    role: 'user',
    content: userMessage.value.trim(),
    agentId: null,
    agentName: '用户',
    createdAt: nowIso()
  })
  userMessage.value = ''
  showNotice('用户观点已加入')
}

function seedSample() {
  const data = sampleState()
  applyState(data)
  showNotice('已加载示例数据')
}

function clearAll() {
  if (!confirm('确认清空全部本地数据？')) return
  applyState({
    projects: [],
    sessions: [],
    agents: [],
    messages: [],
    providerConfigs: [],
    apiMappings: [],
    settings: {
      language: 'zh-CN',
      theme: 'dark-cyber',
      streamMode: 'batch',
      maxTurns: 6
    },
    strategy: { providerConfigId: '', model: '', prompt: '' },
    selectedProjectId: '',
    selectedSessionId: '',
    autoRunning: false
  })
  showNotice('数据已清空', 'warn')
}

function applyState(data) {
  const normalized = normalizeState(data)
  state.projects = normalized.projects
  state.sessions = normalized.sessions
  state.agents = normalized.agents
  state.messages = normalized.messages
  state.providerConfigs = normalized.providerConfigs
  state.apiMappings = normalized.apiMappings
  state.settings = normalized.settings
  state.strategy = normalized.strategy
  state.selectedProjectId = normalized.selectedProjectId
  state.selectedSessionId = normalized.selectedSessionId
  state.autoRunning = false
}

function exportData() {
  const payload = JSON.stringify({
    projects: state.projects,
    sessions: state.sessions,
    agents: state.agents,
    messages: state.messages,
    providerConfigs: state.providerConfigs,
    apiMappings: state.apiMappings,
    settings: state.settings,
    strategy: state.strategy,
    selectedProjectId: state.selectedProjectId,
    selectedSessionId: state.selectedSessionId
  })
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `moa-data-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
  showNotice('数据已导出')
}

function triggerImport() {
  importInput.value?.click()
}

function handleImport(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result)
      applyState(data)
      showNotice('数据已导入')
    } catch (error) {
      showNotice('导入失败，请检查文件格式', 'error')
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

watch(
  state,
  () => {
    const payload = JSON.stringify({
      projects: state.projects,
      sessions: state.sessions,
      agents: state.agents,
      messages: state.messages,
      providerConfigs: state.providerConfigs,
      apiMappings: state.apiMappings,
      settings: state.settings,
      strategy: state.strategy,
      selectedProjectId: state.selectedProjectId,
      selectedSessionId: state.selectedSessionId
    })
    localStorage.setItem(STORAGE_KEY, payload)
  },
  { deep: true }
)

watch(
  () => state.settings.maxTurns,
  (value) => {
    if (!sessionEditingId.value) {
      sessionForm.maxTurns = value
    }
  }
)

onBeforeUnmount(() => {
  stopAuto()
  if (noticeTimer) clearTimeout(noticeTimer)
})
</script>
