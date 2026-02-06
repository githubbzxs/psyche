import { z } from 'zod'

export type LlmRole = 'system' | 'user' | 'assistant'

export interface LlmMessage {
  role: LlmRole
  content: string
}

export interface LlmRuntimeConfig {
  apiKey?: string
  baseUrl?: string
  model?: string
}

const llmResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional()
        })
      })
    )
    .min(1)
})

class HttpStatusError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

/**
 * 调用 OpenAI 兼容接口，统一处理超时、错误码和返回格式校验。
 */
export async function callOpenAiCompatible(
  messages: LlmMessage[],
  temperature = 0.6,
  runtimeConfig?: LlmRuntimeConfig
): Promise<string> {
  const apiKey = runtimeConfig?.apiKey?.trim() || process.env.LLM_API_KEY?.trim()
  if (!apiKey) {
    throw new HttpStatusError(500, '服务端未配置 LLM_API_KEY')
  }

  const baseUrl = (
    runtimeConfig?.baseUrl?.trim() || process.env.LLM_BASE_URL?.trim() || 'https://api.openai.com/v1'
  ).replace(/\/+$/, '')

  const model = runtimeConfig?.model?.trim() || process.env.LLM_MODEL?.trim() || 'gpt-4o-mini'

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60_000)

  let response: Response
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature
      }),
      signal: controller.signal
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new HttpStatusError(504, 'LLM 请求超时，请稍后重试')
    }
    throw new HttpStatusError(502, 'LLM 请求失败，请检查网络或服务配置')
  } finally {
    clearTimeout(timer)
  }

  const payload = await readJsonSafe(response)

  if (!response.ok) {
    const detail = extractErrorMessage(payload)
    throw new HttpStatusError(
      502,
      detail ? `LLM 调用失败: ${detail}` : `LLM 调用失败: HTTP ${response.status}`
    )
  }

  const parsed = llmResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new HttpStatusError(502, 'LLM 返回格式不符合预期')
  }

  const content = parsed.data.choices[0]?.message?.content?.trim()
  if (!content) {
    throw new HttpStatusError(502, 'LLM 返回了空内容')
  }

  return content
}

async function readJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

function extractErrorMessage(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim()
  }

  if (!payload || typeof payload !== 'object') {
    return null
  }

  const openAiShape = z
    .object({
      error: z.object({
        message: z.string()
      })
    })
    .safeParse(payload)

  if (openAiShape.success) {
    return openAiShape.data.error.message
  }

  const messageShape = z
    .object({
      message: z.string()
    })
    .safeParse(payload)

  if (messageShape.success) {
    return messageShape.data.message
  }

  const rawShape = z
    .object({
      raw: z.string()
    })
    .safeParse(payload)

  if (rawShape.success) {
    return rawShape.data.raw.slice(0, 300)
  }

  return null
}