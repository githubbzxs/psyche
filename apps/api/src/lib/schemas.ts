import { z } from 'zod'

export const idParamSchema = z.object({
  id: z.string().min(1)
})

export const projectCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable()
})

export const agentCreateSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  model: z.string().min(1),
  providerConfigId: z.string().optional().nullable()
})

export const sessionCreateSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1)
})

export const providerConfigSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['openai', 'anthropic', 'custom']),
  baseUrl: z.string().url(),
  defaultModel: z.string().min(1),
  apiKey: z.string().min(1)
})

export const apiMappingSchema = z.object({
  name: z.string().min(1),
  providerType: z.enum(['openai', 'anthropic', 'custom']),
  mappingJson: z.any()
})

export const settingsSchema = z.object({
  language: z.enum(['zh-CN', 'en-US']),
  theme: z.enum(['dark-cyber']),
  streamMode: z.enum(['stream', 'batch']),
  maxTurns: z.number().int().min(1).max(50)
})

export const strategySchema = z.object({
  providerConfigId: z.string().min(1),
  model: z.string().min(1),
  prompt: z.string().min(1)
})

export const debateStepSchema = z.object({
  sessionId: z.string().min(1)
})
