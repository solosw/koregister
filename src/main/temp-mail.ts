/**
 * 临时邮箱 API 服务模块
 * 用于连接外部临时邮箱服务器，获取验证码
 *
 * API 文档参考: API使用文档.md
 */

import { encode, decode } from 'cbor-x'

// 临时邮箱 API 配置
interface TempMailConfig {
  baseUrl: string
  timeout: number
}

interface ApiResponse<T = unknown> {
  code: number
  success: boolean
  message: string
  data: T
}

interface MailboxInfo {
  address: string
  expire_at: string
  access_token: string
  is_active?: boolean
  created_at?: string
}

interface EmailInfo {
  id: number
  mailbox_id: number
  message_id: string
  from: string
  to: string
  subject: string
  text_body: string
  html_body: string
  attachments: string
  size: number
  is_read: boolean
  received_at: string
  created_at: string
}

interface EmailListResponse {
  emails: EmailInfo[]
  total: number
  page: number
  limit: number
}

interface CreateMailboxParams {
  domain?: string
  local_part?: string
  expire_hours?: number
}

interface GetVerificationCodeParams {
  address: string
  senderFilter?: string[]
  timeout?: number
  checkInterval?: number
}

// 验证码正则表达式
const CODE_PATTERNS = [
  /(?:verification\s*code|验证码|Your code is|code is)[：:\s]*(\d{6})/gi,
  /(?:is|为)[：:\s]*(\d{6})\b/gi,
  /^\s*(\d{6})\s*$/gm,
  />\s*(\d{6})\s*</g
]

// 默认 AWS 相关发件人过滤
const AWS_SENDERS = [
  'no-reply@signin.aws',
  'no-reply@login.awsapps.com',
  'noreply@amazon.com',
  'account-update@amazon.com',
  'no-reply@aws.amazon.com',
  'noreply@aws.amazon.com',
  'aws'
]

/**
 * HTML 转文本
 */
function htmlToText(html: string): string {
  if (!html) return ''

  let text = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text
}

/**
 * 从文本提取验证码
 */
function extractCode(text: string): string | null {
  if (!text) return null

  for (const pattern of CODE_PATTERNS) {
    pattern.lastIndex = 0

    let match
    while ((match = pattern.exec(text)) !== null) {
      const code = match[1]
      if (code && /^\d{6}$/.test(code)) {
        const start = Math.max(0, match.index - 20)
        const end = Math.min(text.length, match.index + match[0].length + 20)
        const context = text.slice(start, end)

        if (context.includes('#' + code)) continue
        if (/color[:\s]*[^;]*\d{6}/i.test(context)) continue
        if (/rgb|rgba|hsl/i.test(context)) continue
        if (/\d{7,}/.test(context)) continue

        return code
      }
    }
  }
  return null
}

/**
 * 临时邮箱服务类
 */
export class TempMailService {
  private config: TempMailConfig

  constructor(baseUrl: string, timeout: number = 30000) {
    // 移除末尾斜杠
    this.config = {
      baseUrl: baseUrl.replace(/\/+$/, ''),
      timeout
    }
  }

  /**
   * 发送 API 请求
   */
  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    useCbor: boolean = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}/api${path}`

    const headers: Record<string, string> = {
      'Accept': useCbor ? 'application/cbor' : 'application/json',
      'Content-Type': useCbor ? 'application/cbor' : 'application/json'
    }

    let fetchOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeout)
    }

    if (body) {
      if (useCbor) {
        fetchOptions.body = Buffer.from(encode(body))
      } else {
        fetchOptions.body = JSON.stringify(body)
      }
    }

    const response = await fetch(url, fetchOptions)
    const buffer = await response.arrayBuffer()

    if (useCbor) {
      return decode(Buffer.from(buffer)) as ApiResponse<T>
    } else {
      return JSON.parse(Buffer.from(buffer).toString('utf-8')) as ApiResponse<T>
    }
  }

  /**
   * 获取可用域名列表
   */
  async getDomains(): Promise<string[]> {
    const response = await this.request<string[]>('GET', '/mailbox/domains')
    if (!response.success) {
      throw new Error(response.message || '获取域名列表失败')
    }
    return response.data || []
  }

  /**
   * 创建临时邮箱
   */
  async createMailbox(params: CreateMailboxParams = {}): Promise<MailboxInfo> {
    const response = await this.request<MailboxInfo>('POST', '/mailbox/create', {
      domain: params.domain || null,
      local_part: params.local_part || null,
      expire_hours: params.expire_hours || 2
    })

    if (!response.success) {
      throw new Error(response.message || '创建临时邮箱失败')
    }
    return response.data
  }

  /**
   * 获取邮箱信息
   */
  async getMailboxInfo(address: string): Promise<MailboxInfo> {
    const encodedAddress = encodeURIComponent(address)
    const response = await this.request<MailboxInfo>('GET', `/mailbox/${encodedAddress}`)

    if (!response.success) {
      throw new Error(response.message || '获取邮箱信息失败')
    }
    return response.data
  }

  /**
   * 删除邮箱
   */
  async deleteMailbox(address: string): Promise<boolean> {
    const encodedAddress = encodeURIComponent(address)
    const response = await this.request<boolean>('DELETE', `/mailbox/${encodedAddress}`)

    if (!response.success) {
      throw new Error(response.message || '删除邮箱失败')
    }
    return response.data
  }

  /**
   * 获取邮件列表（分页）
   */
  async getEmails(address: string, page: number = 1, limit: number = 20): Promise<EmailListResponse> {
    const encodedAddress = encodeURIComponent(address)
    const response = await this.request<EmailListResponse>(
      'GET',
      `/emails/${encodedAddress}?page=${page}&limit=${limit}`
    )

    if (!response.success) {
      throw new Error(response.message || '获取邮件列表失败')
    }
    return response.data
  }

  /**
   * 获取最新一封邮件
   */
  async getLatestEmail(address: string): Promise<EmailInfo | null> {
    const encodedAddress = encodeURIComponent(address)

    try {
      const response = await this.request<EmailInfo>('GET', `/emails/${encodedAddress}/latest`)

      if (!response.success) {
        if (response.code === 404) {
          return null
        }
        throw new Error(response.message || '获取最新邮件失败')
      }
      return response.data
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  /**
   * 获取邮件详情
   */
  async getEmailDetail(emailId: number): Promise<EmailInfo> {
    const response = await this.request<EmailInfo>('GET', `/email/${emailId}`)

    if (!response.success) {
      throw new Error(response.message || '获取邮件详情失败')
    }
    return response.data
  }

  /**
   * 删除邮件
   */
  async deleteEmail(emailId: number): Promise<boolean> {
    const response = await this.request<boolean>('DELETE', `/email/${emailId}`)

    if (!response.success) {
      throw new Error(response.message || '删除邮件失败')
    }
    return response.data
  }

  /**
   * 标记邮件为已读
   */
  async markAsRead(emailId: number): Promise<boolean> {
    const response = await this.request<boolean>('PATCH', `/email/${emailId}/read`)

    if (!response.success) {
      throw new Error(response.message || '标记已读失败')
    }
    return response.data
  }

  /**
   * 获取验证码 - 轮询最新邮件
   */
  async getVerificationCode(
    params: GetVerificationCodeParams
  ): Promise<string | null> {
    const {
      address,
      timeout = 120,
      checkInterval = 5000,
      senderFilter = AWS_SENDERS
    } = params

    const startTime = Date.now()
    const checkedIds = new Set<number>()

    while (Date.now() - startTime < timeout * 1000) {
      try {
        // 获取最新邮件
        const latestEmail = await this.getLatestEmail(address)

        if (latestEmail && !checkedIds.has(latestEmail.id)) {
          checkedIds.add(latestEmail.id)

          const fromEmail = latestEmail.from?.toLowerCase() || ''
          const subject = latestEmail.subject || ''

          // 检查发件人是否匹配
          const senderMatch = senderFilter.some(s =>
            fromEmail.includes(s.toLowerCase()) ||
            subject.toLowerCase().includes(s.toLowerCase())
          )

          if (senderMatch) {
            // 尝试提取验证码
            let code: string | null = null

            // 从纯文本正文提取
            const bodyText = htmlToText(latestEmail.text_body || '')
            if (bodyText) {
              code = extractCode(bodyText)
            }

            // 从 HTML 正文提取
            if (!code && latestEmail.html_body) {
              code = extractCode(latestEmail.html_body)
            }

            if (code) {
              return code
            }
          }
        }

        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, checkInterval))
      } catch (error) {
        console.error('[TempMail] 获取验证码出错:', error)
        await new Promise(resolve => setTimeout(resolve, checkInterval))
      }
    }

    return null
  }
}

// 日志回调类型
export type LogCallback = (message: string) => void

/**
 * 使用临时邮箱进行 AWS 注册的便捷函数
 */
export async function autoRegisterWithTempMail(
  baseUrl: string,
  log: LogCallback,
  params: {
    expireHours?: number
    senderFilter?: string[]
    codeTimeout?: number
    checkInterval?: number
    proxyUrl?: string
  } = {}
): Promise<{
  success: boolean
  email?: string
  accessToken?: string
  error?: string
}> {
  const {
    expireHours = 2,
    senderFilter: _senderFilter = AWS_SENDERS,
    codeTimeout: _codeTimeout = 120,
    checkInterval: _checkInterval = 5000,
    proxyUrl: _proxyUrl
  } = params

  const tempMail = new TempMailService(baseUrl)

  try {
    // 1. 获取可用域名
    log('========== 使用临时邮箱注册 ==========')
    log('正在获取可用域名...')

    let domains: string[] = []
    try {
      domains = await tempMail.getDomains()
    } catch {
      // 如果获取域名失败，使用默认域名
      log('获取域名列表失败，使用默认域名')
    }

    if (domains.length > 0) {
      log(`可用域名: ${domains.join(', ')}`)
    }

    // 2. 创建临时邮箱
    log('正在创建临时邮箱...')
    const domain = domains[0] || 'example.com'
    const localPart = `user${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`

    const mailbox = await tempMail.createMailbox({
      domain,
      local_part: localPart,
      expire_hours: expireHours
    })

    const email = mailbox.address
    log(`✓ 临时邮箱创建成功: ${email}`)
    log(`过期时间: ${mailbox.expire_at}`)

    // 3. 返回创建的信息，供外部使用
    return {
      success: true,
      email,
      accessToken: mailbox.access_token
    }

  } catch (error) {
    log(`✗ 临时邮箱创建失败: ${error}`)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 从临时邮箱获取验证码（轮询）
 */
export async function getVerificationCodeFromTempMail(
  baseUrl: string,
  email: string,
  _accessToken: string,
  log: LogCallback,
  params: {
    senderFilter?: string[]
    timeout?: number
    checkInterval?: number
  } = {}
): Promise<string | null> {
  const {
    senderFilter = AWS_SENDERS,
    timeout = 120,
    checkInterval = 5000
  } = params

  const tempMail = new TempMailService(baseUrl)
  const startTime = Date.now()
  const checkedIds = new Set<number>()

  log(`开始监控邮箱 ${email} 的验证码...`)
  log(`超时时间: ${timeout}秒`)

  while (Date.now() - startTime < timeout * 1000) {
    try {
      // 获取最新邮件
      const latestEmail = await tempMail.getLatestEmail(email)

      if (latestEmail && !checkedIds.has(latestEmail.id)) {
        checkedIds.add(latestEmail.id)

        const fromEmail = latestEmail.from?.toLowerCase() || ''
        const subject = latestEmail.subject || ''

        log(`收到邮件 - 发件人: ${fromEmail}, 主题: ${subject.substring(0, 50)}`)

        // 检查发件人是否匹配
        const senderMatch = senderFilter.some(s =>
          fromEmail.includes(s.toLowerCase()) ||
          subject.toLowerCase().includes(s.toLowerCase())
        )

        if (senderMatch) {
          log('检测到 AWS 相关邮件，正在提取验证码...')

          // 尝试提取验证码
          let code: string | null = null

          // 从纯文本正文提取
          const bodyText = htmlToText(latestEmail.text_body || '')
          if (bodyText) {
            code = extractCode(bodyText)
            if (code) {
              log(`✓ 从文本正文提取验证码: ${code}`)
            }
          }

          // 从 HTML 正文提取
          if (!code && latestEmail.html_body) {
            code = extractCode(latestEmail.html_body)
            if (code) {
              log(`✓ 从HTML正文提取验证码: ${code}`)
            }
          }

          if (code) {
            log(`========== 找到验证码: ${code} ==========`)
            return code
          } else {
            log('此邮件中未找到验证码')
          }
        } else {
          log(`跳过邮件 - 发件人不匹配`)
        }
      } else {
        log(`检查中... (${Math.floor((Date.now() - startTime) / 1000)}s/${timeout}s)`)
      }

      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, checkInterval))
    } catch (error) {
      log(`获取验证码出错: ${error}`)
      await new Promise(resolve => setTimeout(resolve, checkInterval))
    }
  }

  log('获取验证码超时')
  return null
}
