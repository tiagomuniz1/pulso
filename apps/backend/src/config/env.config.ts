import * as winston from 'winston'

export interface IEnvConfig {
  DB_HOST: string
  DB_PORT: number
  DB_USER: string
  DB_PASS: string
  DB_NAME: string
  DB_SCHEMA: string
  REDIS_HOST: string
  REDIS_PORT: number
  JWT_SECRET: string
  JWT_EXPIRATION: string
  JWT_REFRESH_EXPIRATION: string
  FRONTEND_URL: string
  PUBLIC_API_URL: string
  COOKIE_DOMAIN: string | undefined
  AWS_S3_BUCKET: string | undefined
  AWS_REGION: string | undefined
  EMAIL_PROVIDER: string | undefined
  SMTP_HOST: string | undefined
  SMTP_PORT: number
  SMTP_USER: string | undefined
  SMTP_PASS: string | undefined
  SMTP_FROM: string
  ACCESS_REQUEST_TO_EMAIL: string
  TURNSTILE_SECRET_KEY: string | undefined
  REMINDERS_ENABLED: boolean
  REMINDER_OFFSETS_HOURS: string | undefined
  INFOBIP_BASE_URL: string | undefined
  INFOBIP_API_KEY: string | undefined
  INFOBIP_WHATSAPP_FROM: string | undefined
  INFOBIP_REMINDER_TEMPLATE_NAME: string | undefined
  INFOBIP_REMINDER_TEMPLATE_LANGUAGE: string | undefined
}

export function getEnvConfig(): IEnvConfig {
  const required: (keyof IEnvConfig)[] = [
    'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME', 'DB_SCHEMA',
    'REDIS_HOST', 'REDIS_PORT', 'JWT_SECRET', 'JWT_EXPIRATION',
    'JWT_REFRESH_EXPIRATION', 'FRONTEND_URL',
  ]

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
  }

  return {
    DB_HOST: process.env.DB_HOST!,
    DB_PORT: parseInt(process.env.DB_PORT!, 10),
    DB_USER: process.env.DB_USER!,
    DB_PASS: process.env.DB_PASS!,
    DB_NAME: process.env.DB_NAME!,
    DB_SCHEMA: process.env.DB_SCHEMA!,
    REDIS_HOST: process.env.REDIS_HOST!,
    REDIS_PORT: parseInt(process.env.REDIS_PORT!, 10),
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRATION: process.env.JWT_EXPIRATION!,
    JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION!,
    FRONTEND_URL: process.env.FRONTEND_URL!,
    // Public base URL of this API — used to build clinic branding URLs served by the backend.
    // Falls back to localhost for local/dev; production must set it (Parameter Store).
    PUBLIC_API_URL: process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? '3001'}`,
    // Cookie Domain for auth cookies. Empty in local dev (host-only cookies on
    // localhost); set to `.pulso.center` in prod so the cookie is readable both
    // on slug.pulso.center (middleware) and api.pulso.center (API).
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    AWS_REGION: process.env.AWS_REGION,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: parseInt(process.env.SMTP_PORT ?? '587', 10),
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM ?? 'noreply@pulso.center',
    // Inbox that receives every "solicitar acesso" submission from the institutional
    // website — whoever owns it decides whether to grant the requester a clinic.
    ACCESS_REQUEST_TO_EMAIL: process.env.ACCESS_REQUEST_TO_EMAIL ?? 'contato@pulso.center',
    // Cloudflare Turnstile secret key, used to verify the captcha token required
    // from the 3rd failed login attempt onward. Undefined in local dev falls back
    // to Turnstile's official always-pass test secret in the adapter.
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    // Appointment-reminder cron master switch. Off by default so dev/test never
    // send; production turns it on via Parameter Store.
    REMINDERS_ENABLED: process.env.REMINDERS_ENABLED === 'true',
    // Optional override for how many hours before the appointment reminders fire,
    // comma-separated (e.g. "24,3"). Falls back to the module default when unset.
    REMINDER_OFFSETS_HOURS: process.env.REMINDER_OFFSETS_HOURS,
    // Infobip WhatsApp — appointment reminders are sent as WhatsApp template
    // messages. When any of the first four is unset the adapter skips sending
    // (lets us deploy before the Infobip/Meta onboarding + template approval is
    // done), so none of them belongs in `required` above.
    // Account-specific host handed out at signup, e.g. "xyz123.api.infobip.com".
    INFOBIP_BASE_URL: process.env.INFOBIP_BASE_URL,
    INFOBIP_API_KEY: process.env.INFOBIP_API_KEY,
    // WhatsApp sender in plain E.164, e.g. "5511999999999" — no "whatsapp:" prefix.
    INFOBIP_WHATSAPP_FROM: process.env.INFOBIP_WHATSAPP_FROM,
    // Name of the Meta-approved template for the appointment reminder.
    INFOBIP_REMINDER_TEMPLATE_NAME: process.env.INFOBIP_REMINDER_TEMPLATE_NAME,
    // Template language code. Optional: the adapter defaults to pt_BR. It exists
    // because Meta's codes are easy to get wrong (pt_BR vs pt-BR vs pt), and a
    // mismatch is then fixable in Parameter Store without a deploy.
    INFOBIP_REMINDER_TEMPLATE_LANGUAGE: process.env.INFOBIP_REMINDER_TEMPLATE_LANGUAGE,
  }
}

export function createWinstonConfig(): winston.LoggerOptions {
  const env = process.env.NODE_ENV ?? 'development'
  const level = env === 'production' ? 'warn' : 'debug'

  return {
    level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
    transports: [new winston.transports.Console()],
  }
}
