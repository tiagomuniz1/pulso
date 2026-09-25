jest.mock('axios')
jest.mock('opossum')
jest.mock('../../../config/env.config')

import axios from 'axios'
import * as CircuitBreakerModule from 'opossum'
import { getEnvConfig } from '../../../config/env.config'
import { ISendWhatsAppReminderParams } from './whatsapp-reminder.adapter.interface'
import { InfobipWhatsAppAdapter } from './infobip-whatsapp.adapter'

const mockGetEnvConfig = getEnvConfig as jest.Mock
const mockAxios = axios as jest.Mocked<typeof axios>

const fullConfig = {
  INFOBIP_BASE_URL: 'xyz123.api.infobip.com',
  INFOBIP_API_KEY: 'key-1',
  INFOBIP_WHATSAPP_FROM: '+5511999998888',
  INFOBIP_REMINDER_TEMPLATE_NAME: 'pulso_appointment_reminder',
  INFOBIP_REMINDER_TEMPLATE_LANGUAGE: undefined,
}

const params: ISendWhatsAppReminderParams = {
  toE164: '+5511998877665',
  variables: ['Maria', 'Dra. Ana', '14/09', '09:00'],
}

const TEMPLATE_PATH = 'https://xyz123.api.infobip.com/whatsapp/1/message/template'

function makePassThroughBreaker(sendFn: (p: ISendWhatsAppReminderParams) => Promise<unknown>) {
  return { fire: jest.fn().mockImplementation((p: ISendWhatsAppReminderParams) => sendFn(p)) }
}

describe('InfobipWhatsAppAdapter', () => {
  let mockBreaker: ReturnType<typeof makePassThroughBreaker>
  let breakerOptions: Record<string, unknown>
  let mockPost: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockPost = jest.fn().mockResolvedValue({ data: { messageId: 'MID-1' } })
    mockAxios.create.mockReturnValue({ post: mockPost } as never)
    // The adapter only enriches errors that axios itself produced.
    mockAxios.isAxiosError.mockImplementation(
      (error: unknown) => (error as { isAxiosError?: boolean })?.isAxiosError === true,
    )
    mockGetEnvConfig.mockReturnValue({ ...fullConfig })
  })

  function buildAdapter() {
    ;(CircuitBreakerModule as unknown as jest.Mock).mockImplementation((fn: any, opts: any) => {
      breakerOptions = opts
      mockBreaker = makePassThroughBreaker(fn)
      return mockBreaker
    })
    return new InfobipWhatsAppAdapter()
  }

  it('fires the circuit breaker with the params', async () => {
    const adapter = buildAdapter()
    await adapter.sendReminder(params)
    expect(mockBreaker.fire).toHaveBeenCalledWith(params)
  })

  it('posts a template message with the placeholders in order', async () => {
    const adapter = buildAdapter()

    const result = await adapter.sendReminder(params)

    expect(mockPost).toHaveBeenCalledWith(
      TEMPLATE_PATH,
      {
        messages: [
          {
            from: '5511999998888',
            to: '5511998877665',
            content: {
              templateName: 'pulso_appointment_reminder',
              templateData: {
                body: { placeholders: ['Maria', 'Dra. Ana', '14/09', '09:00'] },
              },
              language: 'pt_BR',
            },
          },
        ],
      },
      { headers: { Authorization: 'App key-1' } },
    )
    expect(result).toEqual({ status: 'sent', providerMessageId: 'MID-1' })
  })

  // Infobip's own examples carry bare digits, and "whatsapp:" is a Twilio-ism.
  // A "+" reaching the API is the kind of thing that fails once, in production.
  it('strips the leading + and any whatsapp: prefix from both numbers', async () => {
    mockGetEnvConfig.mockReturnValue({ ...fullConfig, INFOBIP_WHATSAPP_FROM: 'whatsapp:+5511999998888' })
    const adapter = buildAdapter()

    await adapter.sendReminder(params)

    const [, payload] = mockPost.mock.calls[0]
    expect(payload.messages[0].from).toBe('5511999998888')
    expect(payload.messages[0].to).toBe('5511998877665')
  })

  it('uses the configured template language over the pt_BR default', async () => {
    mockGetEnvConfig.mockReturnValue({ ...fullConfig, INFOBIP_REMINDER_TEMPLATE_LANGUAGE: 'pt-BR' })
    const adapter = buildAdapter()

    await adapter.sendReminder(params)

    expect(mockPost.mock.calls[0][1].messages[0].content.language).toBe('pt-BR')
  })

  it.each([
    ['a host without a scheme', 'xyz123.api.infobip.com'],
    ['a full https URL', 'https://xyz123.api.infobip.com'],
    ['a trailing slash', 'https://xyz123.api.infobip.com/'],
  ])('builds the endpoint from %s', async (_label, baseUrl) => {
    mockGetEnvConfig.mockReturnValue({ ...fullConfig, INFOBIP_BASE_URL: baseUrl })
    const adapter = buildAdapter()

    await adapter.sendReminder(params)

    expect(mockPost.mock.calls[0][0]).toBe(TEMPLATE_PATH)
  })

  it('reads the message id from the batch shape when there is no top-level one', async () => {
    mockPost.mockResolvedValue({ data: { messages: [{ messageId: 'MID-2' }] } })
    const adapter = buildAdapter()
    expect(await adapter.sendReminder(params)).toEqual({ status: 'sent', providerMessageId: 'MID-2' })
  })

  it('returns null providerMessageId when the response carries none', async () => {
    mockPost.mockResolvedValue({ data: {} })
    const adapter = buildAdapter()
    expect(await adapter.sendReminder(params)).toEqual({ status: 'sent', providerMessageId: null })
  })

  it.each([
    ['INFOBIP_BASE_URL'],
    ['INFOBIP_API_KEY'],
    ['INFOBIP_WHATSAPP_FROM'],
    ['INFOBIP_REMINDER_TEMPLATE_NAME'],
  ])('skips (does not call Infobip) when %s is missing', async (missingKey) => {
    mockGetEnvConfig.mockReturnValue({ ...fullConfig, [missingKey]: undefined })
    const adapter = buildAdapter()

    const result = await adapter.sendReminder(params)

    expect(result).toEqual({ status: 'skipped', providerMessageId: null })
    expect(mockPost).not.toHaveBeenCalled()
  })

  // The language is the one optional setting: missing it must still send.
  it('sends when only the template language is missing', async () => {
    const adapter = buildAdapter()
    const result = await adapter.sendReminder(params)
    expect(result.status).toBe('sent')
  })

  it('propagates provider errors so the caller can record the failure', async () => {
    mockPost.mockRejectedValue(new Error('infobip 500'))
    const adapter = buildAdapter()
    await expect(adapter.sendReminder(params)).rejects.toThrow('infobip 500')
  })

  // Without this the reminder row stores "Request failed with status code 400",
  // which says nothing about what to fix.
  it("appends Infobip's own reason to the error message", async () => {
    mockPost.mockRejectedValue({
      isAxiosError: true,
      message: 'Request failed with status code 400',
      response: { data: { requestError: { serviceException: { text: 'Template not found' } } } },
    })
    const adapter = buildAdapter()

    await expect(adapter.sendReminder(params)).rejects.toMatchObject({
      message: 'Request failed with status code 400: Template not found',
    })
  })

  it('leaves the error untouched when the body carries no reason', async () => {
    mockPost.mockRejectedValue({ isAxiosError: true, message: 'socket hang up', response: undefined })
    const adapter = buildAdapter()

    await expect(adapter.sendReminder(params)).rejects.toMatchObject({ message: 'socket hang up' })
  })

  // A send is not idempotent: a timeout that actually delivered would, on retry,
  // message the patient twice. One failure must mean exactly one HTTP call.
  it('does not retry a failed send', async () => {
    mockPost.mockRejectedValue(new Error('infobip 503'))
    const adapter = buildAdapter()

    await expect(adapter.sendReminder(params)).rejects.toThrow()
    expect(mockPost).toHaveBeenCalledTimes(1)
  })

  it('configures the http client and breaker with a timeout and reset window', () => {
    buildAdapter()
    expect(mockAxios.create).toHaveBeenCalledWith({ timeout: 10000 })
    expect(breakerOptions).toMatchObject({
      timeout: 10000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    })
  })
})
