import axios, { type AxiosRequestConfig } from 'axios'

export const API_TOKEN_STORAGE_KEY = 'deang-sour-tea:api-token'

export interface ApiHttpResponse<Value = unknown> {
  data: Value
}

export interface ApiHttpClient {
  get<Value = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiHttpResponse<Value>>
  post<Value = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiHttpResponse<Value>>
  put<Value = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiHttpResponse<Value>>
  delete<Value = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiHttpResponse<Value>>
  setToken?(token: string | null): void
}

interface ApiEnvelope<Value> {
  code: number
  message: string
  data: Value
}

export class ApiBusinessError extends Error {
  constructor(
    public readonly code: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiBusinessError'
  }
}

export class ApiUnavailableError extends Error {
  constructor(message = 'API 服务暂时不可用', public readonly cause?: unknown) {
    super(message)
    this.name = 'ApiUnavailableError'
  }
}

function isEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return typeof value === 'object'
    && value !== null
    && 'code' in value
    && typeof value.code === 'number'
    && 'message' in value
    && typeof value.message === 'string'
    && 'data' in value
}

function parseEnvelope<Value>(value: unknown): Value {
  if (!isEnvelope(value)) throw new ApiBusinessError(-1, 'API 响应格式无效')
  if (value.code !== 0) throw new ApiBusinessError(value.code, value.message || 'API 业务请求失败')
  return value.data as Value
}

export async function requestApiData<Value>(request: Promise<ApiHttpResponse<unknown>>): Promise<Value> {
  try {
    const response = await request
    return parseEnvelope<Value>(response.data)
  } catch (error) {
    if (error instanceof ApiBusinessError) throw error
    if (axios.isAxiosError(error)) {
      if (isEnvelope(error.response?.data)) return parseEnvelope<Value>(error.response.data)
      const timeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      throw new ApiUnavailableError(timeout ? 'API 请求超时' : 'API 服务暂时不可用', error)
    }
    throw error
  }
}

export function createApiClient(options: {
  baseURL?: string
  timeout?: number
  storage?: Storage
} = {}): ApiHttpClient {
  const storage = options.storage ?? globalThis.localStorage
  let token = storage.getItem(API_TOKEN_STORAGE_KEY)
  const instance = axios.create({
    baseURL: options.baseURL ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
    timeout: options.timeout ?? 8000,
  })
  instance.interceptors.request.use((config) => {
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })
  return Object.assign(instance, {
    setToken(nextToken: string | null) {
      token = nextToken
      if (nextToken === null) storage.removeItem(API_TOKEN_STORAGE_KEY)
      else storage.setItem(API_TOKEN_STORAGE_KEY, nextToken)
    },
  })
}
