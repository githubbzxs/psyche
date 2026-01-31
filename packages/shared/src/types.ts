export type ProviderType = 'openai' | 'anthropic' | 'custom'
export type Role = 'system' | 'user' | 'assistant'
export type DebateStatus = 'idle' | 'running' | 'paused' | 'done'
export type StreamMode = 'stream' | 'batch'

export interface AgentConfig {
  id: string
  name: string
  role: string
  model: string
  providerConfigId?: string | null
}

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
  providerType: ProviderType
  request: ApiMappingRequest
  response: ApiMappingResponse
}

export interface ProviderConfigDTO {
  id: string
  name: string
  type: ProviderType
  baseUrl: string
  defaultModel: string
}

export interface UserSettingsDTO {
  language: 'zh-CN' | 'en-US'
  theme: 'dark-cyber'
  streamMode: StreamMode
  maxTurns: number
}

export interface MessageDTO {
  id: string
  role: Role
  content: string
  agentId?: string | null
  agentName?: string | null
  createdAt: string
}

export interface ProjectDTO {
  id: string
  name: string
  description?: string | null
  createdAt: string
}

export interface SessionDTO {
  id: string
  title: string
  status: DebateStatus
  maxTurns: number
  currentTurn: number
  createdAt: string
}

export interface MetricsDTO {
  requests: number
  tokensIn: number
  tokensOut: number
}
