import { decryptSecret } from './crypto.js'

export type LlmRole = 'system' | 'user' | 'assistant'

export interface ApiMappingRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  headers: Record<string, string>
  body: any
}

export interface ApiMappingStream {
  eventFormat: 'sse'
  deltaPath: string
  doneSignal?: string
}

export interface ApiMappingResponse {
  messagePath: string
  usagePath?: string
  stream?: ApiMappingStream
}

export interface ApiMapping {
  id?: string
  name: string
  providerType: 'openai' | 'anthropic' | 'custom'
  request: ApiMappingRequest
  response: ApiMappingResponse
}

export interface ProviderRuntime {
  baseUrl: string
  apiKey: string
  mapping: ApiMapping
}

export interface LlmMessage {
  role: LlmRole
  content: string
}

export interface LlmResult {
  content: string
  tokensIn: number
  tokensOut: number
}

export async function callProvider(
  runtime: ProviderRuntime,
  messages: LlmMessage[],
  streamMode: 'stream' | 'batch'
): Promise<LlmResult> {
  const { baseUrl, apiKey, mapping } = runtime
  const endpoint = new URL(mapping.request.path, baseUrl).toString()
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    ...mapping.request.headers
  }

  const requestBody = mapping.request.body
  const payload = typeof requestBody === 'function' ? requestBody(messages) : requestBody

  const response = await fetch(endpoint, {
    method: mapping.request.method,
    headers,
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`模型请求失败: ${response.status} ${text}`)
  }

  if (streamMode === 'stream' && mapping.response.stream) {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('流式响应不可用')
    }
    let content = ''
    const decoder = new TextDecoder('utf8')
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      content += chunk
      if (mapping.response.stream.doneSignal && chunk.includes(mapping.response.stream.doneSignal)) {
        break
      }
    }
    return { content, tokensIn: 0, tokensOut: 0 }
  }

  const data = await response.json()
  const messagePath = mapping.response.messagePath
  const content = readPath(data, messagePath)
  const usagePath = mapping.response.usagePath
  const usage = usagePath ? readPath(data, usagePath) : null
  const tokensIn = usage?.prompt_tokens ?? usage?.input_tokens ?? 0
  const tokensOut = usage?.completion_tokens ?? usage?.output_tokens ?? 0

  return { content: String(content ?? ''), tokensIn, tokensOut }
}

export function resolveApiKey(encrypted: string) {
  return decryptSecret(encrypted)
}

function readPath(obj: any, path: string) {
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj)
}
