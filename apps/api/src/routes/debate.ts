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

const debateAnswerSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'question 不能为空')
    .max(4000, 'question 长度不能超过 4000'),
  llm: llmConfigSchema.optional()
})

type DebateRoleId = 'analyst' | 'challenger' | 'integrator'

interface DebateRole {
  id: DebateRoleId
  name: string
  responsibility: string
}

interface DebateTurn {
  round: 1 | 2
  roleId: DebateRoleId
  role: string
  content: string
}

const debateRoles: DebateRole[] = [
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
    const transcript: DebateTurn[] = []

    for (const role of debateRoles) {
      const content = await callOpenAiCompatible(
        buildRoundOnePrompt(question, role),
        0.7,
        runtimeConfig
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
      const content = await callOpenAiCompatible(
        buildRoundTwoPrompt(question, role, roundOneOthers),
        0.7,
        runtimeConfig
      )
      transcript.push({
        round: 2,
        roleId: role.id,
        role: role.name,
        content
      })
    }

    const finalAnswer = await callOpenAiCompatible(
      buildFinalPrompt(question, transcript),
      0.3,
      runtimeConfig
    )

    return {
      question,
      transcript: transcript.map((item) => ({
        round: item.round,
        role: item.role,
        content: item.content
      })),
      finalAnswer
    }
  })
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

function buildRoundOnePrompt(question: string, role: DebateRole): LlmMessage[] {
  return [
    {
      role: 'system',
      content: `你是多角色辩论中的「${role.name}」，职责：${role.responsibility}。请用简洁、结构化中文回答。`
    },
    {
      role: 'user',
      content: [
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

function buildRoundTwoPrompt(question: string, role: DebateRole, roundOneOthers: DebateTurn[]): LlmMessage[] {
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

function buildFinalPrompt(question: string, transcript: DebateTurn[]): LlmMessage[] {
  return [
    {
      role: 'system',
      content: '你是最终裁决模型。请基于完整讨论记录，输出清晰、可执行的最终结论。'
    },
    {
      role: 'user',
      content: [
        `问题：${question}`,
        '讨论记录：',
        formatTranscript(transcript),
        '请输出：',
        '1) 最终答案（先给结论）；',
        '2) 关键依据（2-4 条）；',
        '3) 适用边界与风险提示（1-2 条）。'
      ].join('\n')
    }
  ]
}

function formatTranscript(transcript: DebateTurn[]): string {
  return transcript
    .map((item) => `第${item.round}轮 ${item.role}：\n${item.content}`)
    .join('\n\n')
}