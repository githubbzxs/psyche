import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  callOpenAiCompatible,
  type LlmMessage,
  type LlmRuntimeConfig
} from '../lib/llm.js'

const llmConfigSchema = z
  .object({
    apiKey: z.string().trim().min(1, 'llm.apiKey 不能为空').max(300, 'llm.apiKey 过长').optional(),
    baseUrl: z.string().trim().url('llm.baseUrl 必须是合法 URL').optional(),
    model: z.string().trim().min(1, 'llm.model 不能为空').max(200, 'llm.model 过长').optional()
  })
  .strict()

const debateAgentSchema = z
  .object({
    id: z.string().trim().min(1, 'agents[].id 不能为空').max(120, 'agents[].id 过长').optional(),
    name: z.string().trim().min(1, 'agents[].name 不能为空').max(80, 'agents[].name 过长'),
    responsibility: z
      .string()
      .trim()
      .min(1, 'agents[].responsibility 不能为空')
      .max(400, 'agents[].responsibility 过长'),
    llm: llmConfigSchema.optional()
  })
  .strict()

const debateHistoryItemSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z
      .string()
      .trim()
      .min(1, 'history[].content 不能为空')
      .max(4000, 'history[].content 过长')
  })
  .strict()

const debateAnswerSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'question 不能为空')
    .max(4000, 'question 长度不能超过 4000'),
  llm: llmConfigSchema.optional(),
  agents: z
    .array(debateAgentSchema)
    .min(2, 'agents 至少需要 2 个智能体')
    .max(8, 'agents 最多支持 8 个智能体')
    .optional(),
  history: z.array(debateHistoryItemSchema).max(20, 'history 最多保留 20 条').optional()
})

interface DebateRole {
  id: string
  name: string
  responsibility: string
  runtimeConfig?: LlmRuntimeConfig
}

interface DebateTurn {
  round: 1 | 2
  roleId: string
  role: string
  content: string
}

interface ConversationHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

const defaultDebateRoles: DebateRole[] = [
  {
    id: 'analyst',
    name: '分析师',
    responsibility: '拆解问题，给出关键事实、前提和推理路径'
  },
  {
    id: 'challenger',
    name: '质疑者',
    responsibility: '识别漏洞、反例、风险和被忽略的条件'
  },
  {
    id: 'integrator',
    name: '整合者',
    responsibility: '整合冲突观点，形成可执行的折中方案'
  }
]

export async function debateRoutes(app: FastifyInstance) {
  app.post('/debate/answer', async (request) => {
    const body = debateAnswerSchema.parse(request.body)
    const question = body.question.trim()
    const runtimeConfig = normalizeRuntimeConfig(body.llm)
    const history = normalizeConversationHistory(body.history)
    const historyText = formatConversationHistory(history)
    const debateRoles = resolveDebateRoles(body.agents)
    const transcript: DebateTurn[] = []

    for (const role of debateRoles) {
      const roleConfig = mergeRuntimeConfig(role.runtimeConfig, runtimeConfig)
      const content = await callOpenAiCompatible(
        buildRoundOnePrompt(question, role, historyText),
        0.7,
        roleConfig
      )
      transcript.push({
        round: 1,
        roleId: role.id,
        role: role.name,
        content
      })
    }

    for (const role of debateRoles) {
      const roundOneOthers = transcript.filter((item) => item.round === 1 && item.roleId !== role.id)
      const roleConfig = mergeRuntimeConfig(role.runtimeConfig, runtimeConfig)
      const content = await callOpenAiCompatible(
        buildRoundTwoPrompt(question, role, roundOneOthers, historyText),
        0.7,
        roleConfig
      )
      transcript.push({
        round: 2,
        roleId: role.id,
        role: role.name,
        content
      })
    }

    const finalRoleConfig = debateRoles.length > 0 ? debateRoles[debateRoles.length - 1].runtimeConfig : undefined
    const finalRuntimeConfig = mergeRuntimeConfig(finalRoleConfig, runtimeConfig)
    const finalAnswer = await callOpenAiCompatible(
      buildFinalPrompt(question, transcript, historyText),
      0.3,
      finalRuntimeConfig
    )

    return {
      question,
      agents: debateRoles.map((item) => ({
        id: item.id,
        name: item.name,
        responsibility: item.responsibility
      })),
      transcript: transcript.map((item) => ({
        round: item.round,
        role: item.role,
        content: item.content
      })),
      finalAnswer
    }
  })
}

function resolveDebateRoles(agents?: z.infer<typeof debateAgentSchema>[]): DebateRole[] {
  if (!agents || agents.length === 0) {
    return defaultDebateRoles
  }

  return agents.map((item, index) => ({
    id: item.id?.trim() || `agent_${index + 1}`,
    name: item.name.trim(),
    responsibility: item.responsibility.trim(),
    runtimeConfig: normalizeRuntimeConfig(item.llm)
  }))
}

function normalizeRuntimeConfig(llm?: z.infer<typeof llmConfigSchema>): LlmRuntimeConfig | undefined {
  if (!llm) {
    return undefined
  }

  const config: LlmRuntimeConfig = {
    apiKey: llm.apiKey,
    baseUrl: llm.baseUrl,
    model: llm.model
  }

  if (!config.apiKey && !config.baseUrl && !config.model) {
    return undefined
  }

  return config
}

function mergeRuntimeConfig(
  primary?: LlmRuntimeConfig,
  fallback?: LlmRuntimeConfig
): LlmRuntimeConfig | undefined {
  const merged: LlmRuntimeConfig = {
    apiKey: primary?.apiKey ?? fallback?.apiKey,
    baseUrl: primary?.baseUrl ?? fallback?.baseUrl,
    model: primary?.model ?? fallback?.model
  }

  if (!merged.apiKey && !merged.baseUrl && !merged.model) {
    return undefined
  }

  return merged
}

function normalizeConversationHistory(
  history?: z.infer<typeof debateHistoryItemSchema>[]
): ConversationHistoryItem[] {
  if (!history || history.length === 0) {
    return []
  }

  return history
    .map((item) => ({
      role: item.role,
      content: item.content.trim()
    }))
    .filter((item) => item.content.length > 0)
    .slice(-12)
}

function formatConversationHistory(history: ConversationHistoryItem[]): string {
  if (history.length === 0) {
    return '（无）'
  }

  return history
    .map((item) => `${item.role === 'user' ? '用户' : '助手'}：${item.content}`)
    .join('\n')
}

function buildRoundOnePrompt(question: string, role: DebateRole, historyText: string): LlmMessage[] {
  return [
    {
      role: 'system',
      content: `你是多角色辩论中的「${role.name}」，职责：${role.responsibility}。请用简洁、结构化中文回答，并优先理解对话上下文中的指代关系。`
    },
    {
      role: 'user',
      content: [
        `历史对话（按时间顺序）：\n${historyText}`,
        '请进行第 1 轮发言。',
        `问题：${question}`,
        '要求：',
        '1) 先给出核心观点；',
        '2) 再给出 2-4 条理由；',
        '3) 最后列出你仍不确定的 1 个点。'
      ].join('\n')
    }
  ]
}

function buildRoundTwoPrompt(
  question: string,
  role: DebateRole,
  roundOneOthers: DebateTurn[],
  historyText: string
): LlmMessage[] {
  const referenceText = roundOneOthers
    .map((item) => `- ${item.role}：${item.content}`)
    .join('\n')

  return [
    {
      role: 'system',
      content: `你是多角色辩论中的「${role.name}」，职责：${role.responsibility}。请继续完成第 2 轮发言。`
    },
    {
      role: 'user',
      content: [
        `历史对话（按时间顺序）：\n${historyText}`,
        `问题：${question}`,
        '以下是第 1 轮其他角色观点，请你回应：',
        referenceText,
        '第 2 轮要求：',
        '1) 必须引用至少 1 条其他角色观点，格式用「引用[角色名]: ...」；',
        '2) 明确说明你同意或反对的点；',
        '3) 给出你修正后的结论。'
      ].join('\n')
    }
  ]
}

function buildFinalPrompt(question: string, transcript: DebateTurn[], historyText: string): LlmMessage[] {
  return [
    {
      role: 'system',
      content:
        '你是最终裁决模型。请基于历史对话与完整讨论记录，给出准确、自然、可执行的最终回复。若用户是追问（如“那btc吧”“多少钱”），必须先结合上下文确定对象后再作答。'
    },
    {
      role: 'user',
      content: [
        `问题：${question}`,
        `历史对话（按时间顺序）：\n${historyText}`,
        '讨论记录：',
        formatTranscript(transcript),
        '请按以下要求直接输出完整答复：',
        '1) 先直接回答用户当前问题，不要重复用户原话；',
        '2) 使用自然中文，禁止 Markdown 标记与模板化标题；',
        '3) 已有上下文足够时不要反问；仅在关键信息缺失时，最多补 1 个澄清问题；',
        '4) 保持专业、简洁，优先给可执行建议。'
      ].join('\n')
    }
  ]
}

function formatTranscript(transcript: DebateTurn[]): string {
  return transcript
    .map((item) => `第${item.round}轮 ${item.role}：\n${item.content}`)
    .join('\n\n')
}
