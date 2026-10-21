import type { DayOfWeek } from '@app/shared'

export interface ICreateScheduleInput {
  professionalId?: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  slotDurationInMinutes: number
  validFrom?: string
  validUntil?: string
}

export interface IUpdateScheduleInput {
  dayOfWeek?: DayOfWeek
  startTime?: string
  endTime?: string
  slotDurationInMinutes?: number
  validFrom?: string | null
  validUntil?: string | null
}

export interface IScheduleListParams {
  professionalId?: string
  dayOfWeek?: DayOfWeek
  activeOn?: string
  /** Agenda encerrada some da listagem por padrão; isto a traz de volta. */
  includeExpired?: boolean
  page?: number
  limit?: number
}
