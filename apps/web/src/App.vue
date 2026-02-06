<template>
  <div class="debate-page">
    <main class="debate-card">
      <header class="page-header">
        <h1>多智能体讨论助手</h1>
        <p>输入问题后，系统会向后端发起讨论并返回综合答案。</p>
        <p class="endpoint">
          请求地址：{{ requestUrl }}
        </p>
      </header>

      <form
        class="question-form"
        @submit.prevent="startDebate"
      >
        <label
          class="form-label"
          for="question-input"
        >问题内容</label>
        <textarea
          id="question-input"
          v-model.trim="question"
          class="question-input"
          :disabled="isLoading"
          placeholder="例如：中小团队下一季度应优先投入性能优化还是功能迭代？"
          rows="4"
        />

        <div class="form-actions">
          <button
            class="submit-btn"
            type="submit"
            :disabled="isLoading || !question"
          >
            {{ isLoading ? '讨论中...' : '开始讨论' }}
          </button>
          <span
            class="state-tag"
            :class="`state-${requestState}`"
          >{{ stateText }}</span>
        </div>
      </form>

      <section
        v-if="isLoading"
        class="panel loading-panel"
        aria-live="polite"
      >
        <h2>处理中</h2>
        <p>正在调用后端讨论接口，请稍候。</p>
      </section>

      <section
        v-else-if="requestState === 'error'"
        class="panel error-panel"
        role="alert"
      >
        <h2>请求失败</h2>
        <p>{{ errorMessage }}</p>
      </section>

      <template v-else-if="requestState === 'success'">
        <section class="panel records-panel">
          <h2>多智能体讨论记录</h2>
          <ul
            v-if="debateRecords.length"
            class="record-list"
          >
            <li
              v-for="(record, index) in debateRecords"
              :key="record.id"
              class="record-item"
            >
              <div class="record-meta">
                <strong>{{ record.agent }}</strong>
                <span v-if="record.round">第 {{ record.round }} 轮</span>
                <span v-else>记录 {{ index + 1 }}</span>
              </div>
              <p class="record-content">
                {{ record.content }}
              </p>
            </li>
          </ul>
          <p
            v-else
            class="empty-text"
          >
            本次返回未包含讨论记录。
          </p>
        </section>

        <section class="panel answer-panel">
          <h2>最终综合答案</h2>
          <p class="answer-text">
            {{ finalAnswer }}
          </p>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const question = ref('')
const requestState = ref('idle')
const errorMessage = ref('')
const debateRecords = ref([])
const finalAnswer = ref('')

const requestUrl = buildDebateUrl(import.meta.env.VITE_API_BASE_URL)

const isLoading = computed(() => requestState.value === 'loading')

const stateText = computed(() => {
  if (requestState.value === 'loading') return '加载中'
  if (requestState.value === 'success') return '已完成'
  if (requestState.value === 'error') return '失败'
  return '待开始'
})

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

function pickText(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || ''
  }
  if (typeof value === 'number') {
    return String(value)
  }
  return ''
}

function pickFirstText(candidates) {
  for (const candidate of candidates) {
    const value = pickText(candidate)
    if (value) {
      return value
    }
  }
  return ''
}

function unwrapPayload(payload) {
  if (payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object') {
    return payload.data
  }
  return payload
}

function normalizeRecord(rawRecord, index) {
  if (typeof rawRecord === 'string') {
    return {
      id: `record-${index + 1}`,
      agent: '智能体',
      round: null,
      content: rawRecord.trim()
    }
  }

  if (!rawRecord || typeof rawRecord !== 'object') {
    return {
      id: `record-${index + 1}`,
      agent: `智能体${index + 1}`,
      round: null,
      content: ''
    }
  }

  const roundValue = rawRecord.round ?? rawRecord.turn ?? rawRecord.step ?? rawRecord.index

  return {
    id: pickFirstText([rawRecord.id]) || `record-${index + 1}`,
    agent:
      pickFirstText([rawRecord.agent, rawRecord.agentName, rawRecord.speaker, rawRecord.role, rawRecord.name]) ||
      `智能体${index + 1}`,
    round: typeof roundValue === 'number' && Number.isFinite(roundValue) ? roundValue : null,
    content: pickFirstText([
      rawRecord.content,
      rawRecord.text,
      rawRecord.message,
      rawRecord.answer,
      rawRecord.opinion
    ])
  }
}

function normalizeResponse(payload) {
  const root = unwrapPayload(payload)

  const recordsSource = [
    root?.debateRecords,
    root?.records,
    root?.discussionRecords,
    root?.discussion,
    root?.messages,
    root?.history,
    payload?.debateRecords,
    payload?.records,
    payload?.discussion,
    payload?.messages
  ].find((item) => Array.isArray(item))

  const records = (Array.isArray(recordsSource) ? recordsSource : [])
    .map((item, index) => normalizeRecord(item, index))
    .filter((item) => item.content)

  const answer = pickFirstText([
    root?.finalAnswer,
    root?.answer,
    root?.result,
    root?.summary,
    payload?.finalAnswer,
    payload?.answer,
    payload?.result,
    payload?.summary
  ])

  return {
    records,
    answer
  }
}

async function startDebate() {
  const input = question.value.trim()
  if (!input || isLoading.value) {
    return
  }

  requestState.value = 'loading'
  errorMessage.value = ''
  debateRecords.value = []
  finalAnswer.value = ''

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ question: input })
    })

    const rawText = await response.text()
    let payload = {}

    if (rawText) {
      try {
        payload = JSON.parse(rawText)
      } catch (error) {
        throw new Error('服务返回了无法解析的 JSON 数据。')
      }
    }

    if (!response.ok) {
      const backendMessage = pickFirstText([payload?.message, payload?.error])
      throw new Error(backendMessage || `请求失败（HTTP ${response.status}）。`)
    }

    const normalized = normalizeResponse(payload)

    if (!normalized.answer) {
      throw new Error('接口返回成功，但缺少最终综合答案。')
    }

    debateRecords.value = normalized.records
    finalAnswer.value = normalized.answer
    requestState.value = 'success'
  } catch (error) {
    requestState.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : '请求失败，请稍后重试。'
  }
}
</script>

<style scoped>
.debate-page {
  min-height: 100vh;
  padding: 24px 16px 40px;
  display: flex;
  justify-content: center;
}

.debate-card {
  width: min(920px, 100%);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border: 1px solid rgba(10, 26, 36, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 12px 40px rgba(26, 44, 58, 0.1);
}

.page-header h1 {
  margin: 0;
  font-size: clamp(1.5rem, 2.4vw, 2rem);
}

.page-header p {
  margin: 8px 0 0;
  color: #3b4d57;
  line-height: 1.6;
}

.endpoint {
  font-size: 0.86rem;
  color: #5c707b;
  word-break: break-all;
}

.question-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1d2a30;
}

.question-input {
  width: 100%;
  border: 1px solid rgba(10, 26, 36, 0.2);
  border-radius: 12px;
  padding: 12px;
  font: inherit;
  color: #102028;
  background: #ffffff;
  resize: vertical;
  min-height: 110px;
}

.question-input:focus {
  outline: none;
  border-color: #2c7da0;
  box-shadow: 0 0 0 2px rgba(44, 125, 160, 0.2);
}

.question-input:disabled {
  background: #f5f8fa;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.submit-btn {
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  background: linear-gradient(120deg, #2c7da0, #3ba99c);
  color: #f9fdff;
  font-weight: 700;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.state-tag {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.84rem;
  border: 1px solid transparent;
}

.state-idle {
  background: rgba(99, 110, 114, 0.12);
  color: #54616a;
  border-color: rgba(99, 110, 114, 0.25);
}

.state-loading {
  background: rgba(44, 125, 160, 0.12);
  color: #1d5e78;
  border-color: rgba(44, 125, 160, 0.3);
}

.state-success {
  background: rgba(46, 139, 87, 0.14);
  color: #216240;
  border-color: rgba(46, 139, 87, 0.3);
}

.state-error {
  background: rgba(214, 40, 40, 0.12);
  color: #8e1a1a;
  border-color: rgba(214, 40, 40, 0.28);
}

.panel {
  border: 1px solid rgba(10, 26, 36, 0.1);
  border-radius: 14px;
  padding: 14px;
  background: #ffffff;
}

.panel h2 {
  margin: 0;
  font-size: 1.04rem;
}

.panel p {
  margin: 10px 0 0;
  color: #2a3d47;
  line-height: 1.6;
}

.loading-panel {
  border-color: rgba(44, 125, 160, 0.25);
  background: rgba(44, 125, 160, 0.06);
}

.error-panel {
  border-color: rgba(214, 40, 40, 0.3);
  background: rgba(214, 40, 40, 0.06);
}

.record-list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.record-item {
  border: 1px solid rgba(10, 26, 36, 0.12);
  border-radius: 10px;
  padding: 10px;
  background: #f9fbfc;
}

.record-meta {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 0.86rem;
  color: #425862;
}

.record-content {
  margin: 8px 0 0;
  white-space: pre-wrap;
  color: #172b34;
}

.empty-text {
  margin-top: 12px;
  color: #51646e;
}

.answer-panel {
  border-color: rgba(46, 139, 87, 0.26);
  background: rgba(46, 139, 87, 0.06);
}

.answer-text {
  white-space: pre-wrap;
  font-size: 1rem;
}

@media (max-width: 640px) {
  .debate-page {
    padding: 16px 12px 24px;
  }

  .debate-card {
    padding: 14px;
    border-radius: 12px;
  }

  .form-actions {
    align-items: stretch;
  }

  .submit-btn {
    width: 100%;
    text-align: center;
  }
}
</style>
