import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { AppointmentLabelColor, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentLabelsRepository } from '../../appointment-labels/repositories/appointment-labels.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { SetAppointmentLabelUseCase } from '../use-cases/set-appointment-label.use-case'

const clinicId = '10000000-0000-4000-8000-000000000000'
const professionalId = 'prof-uuid'
const appointmentId = 'appt-uuid'
const labelId = 'label-uuid'

const adminUser: ICurrentUser = { id: 'admin', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doc-user', role: UserRole.PROFESSIONAL, clinicId }

const makeAppointment = (overrides = {}) => ({
  id: appointmentId,
  clinicId,
  professionalId,
  patientId: 'patient-uuid',
  specialtyId: null,
  scheduleId: 's1',
  date: '2099-01-01',
  startTime: '08:00',
  endTime: '08:30',
  status: 'scheduled',
  insuranceType: null,
  reason: null,
  cancellationReason: null,
  seriesId: null,
  seriesSequence: null,
  series: null,
  labelId: null,
  label: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeLabel = (overrides = {}) => ({
  id: labelId,
  clinicId,
  name: 'Retorno',
  color: AppointmentLabelColor.GREEN,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const mockAppointments = {
  findById: jest.fn(),
  update: jest.fn(),
} as unknown as jest.Mocked<IAppointmentsRepository>

const mockLabels = { findById: jest.fn() } as unknown as jest.Mocked<IAppointmentLabelsRepository>
const mockProfessionals = {
  findByUserId: jest.fn(),
  findById: jest.fn(),
} as unknown as jest.Mocked<IProfessionalsRepository>
const mockCache = { delByPrefix: jest.fn() } as unknown as jest.Mocked<CacheService>

// Os nomes são resolvidos por query crua, como nos demais use-cases deste módulo.
const mockDataSource = {
  createQueryBuilder: () => ({
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([{ fullName: 'Nome', name: 'Especialidade' }]),
  }),
} as unknown as DataSource

describe('SetAppointmentLabelUseCase', () => {
  let useCase: SetAppointmentLabelUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new SetAppointmentLabelUseCase(
      mockDataSource,
      mockAppointments,
      mockLabels,
      mockProfessionals,
      mockCache,
    )
    ;(mockAppointments.findById as jest.Mock).mockResolvedValue(makeAppointment())
    ;(mockAppointments.update as jest.Mock).mockResolvedValue(makeAppointment())
    ;(mockLabels.findById as jest.Mock).mockResolvedValue(makeLabel())
    ;(mockCache.delByPrefix as jest.Mock).mockResolvedValue(undefined)
  })

  it('throws NotFound when the appointment is not in the clinic', async () => {
    ;(mockAppointments.findById as jest.Mock).mockResolvedValue(null)

    await expect(useCase.execute(appointmentId, { labelId }, adminUser)).rejects.toThrow(
      NotFoundException,
    )
  })

  it('lets ADMIN label any appointment of the clinic', async () => {
    await useCase.execute(appointmentId, { labelId }, adminUser)

    expect(mockAppointments.update).toHaveBeenCalledWith(appointmentId, { labelId })
    expect(mockProfessionals.findByUserId).not.toHaveBeenCalled()
  })

  it('lets the appointment professional label their own', async () => {
    ;(mockProfessionals.findByUserId as jest.Mock).mockResolvedValue({ id: professionalId })

    await useCase.execute(appointmentId, { labelId }, doctorUser)

    expect(mockAppointments.update).toHaveBeenCalledWith(appointmentId, { labelId })
  })

  it('throws Forbidden for a professional on someone else appointment', async () => {
    ;(mockProfessionals.findByUserId as jest.Mock).mockResolvedValue({ id: 'outro-prof' })

    await expect(useCase.execute(appointmentId, { labelId }, doctorUser)).rejects.toThrow(
      ForbiddenException,
    )
    expect(mockAppointments.update).not.toHaveBeenCalled()
  })

  // 422 e não 404: o recurso da URL é a consulta, e um id ruim no corpo é
  // entrada inválida para ela. Rótulo inexistente e de outra clínica respondem
  // igual, para não revelar o que existe noutro tenant.
  it('throws 422 when the label does not exist in the clinic', async () => {
    ;(mockLabels.findById as jest.Mock).mockResolvedValue(null)

    await expect(useCase.execute(appointmentId, { labelId }, adminUser)).rejects.toThrow(
      UnprocessableEntityException,
    )
    expect(mockAppointments.update).not.toHaveBeenCalled()
  })

  it('throws 422 for an inactive label', async () => {
    ;(mockLabels.findById as jest.Mock).mockResolvedValue(makeLabel({ isActive: false }))

    await expect(useCase.execute(appointmentId, { labelId }, adminUser)).rejects.toThrow(
      UnprocessableEntityException,
    )
  })

  // `null` é desmarcar: não deve procurar rótulo nenhum.
  it('unsets the label without looking one up', async () => {
    await useCase.execute(appointmentId, { labelId: null }, adminUser)

    expect(mockLabels.findById).not.toHaveBeenCalled()
    expect(mockAppointments.update).toHaveBeenCalledWith(appointmentId, { labelId: null })
  })

  // Reetiquetar consulta concluída é inofensivo e às vezes é o que se quer —
  // por isso não há guarda de status aqui, ao contrário de confirmar/concluir.
  it('labels a completed appointment', async () => {
    ;(mockAppointments.findById as jest.Mock).mockResolvedValue(
      makeAppointment({ status: 'completed' }),
    )

    await expect(useCase.execute(appointmentId, { labelId }, adminUser)).resolves.toBeDefined()
  })

  it('converts an optimistic lock mismatch to Conflict', async () => {
    ;(mockAppointments.update as jest.Mock).mockRejectedValue(
      new OptimisticLockVersionMismatchError('Appointment', 1, 2),
    )

    await expect(useCase.execute(appointmentId, { labelId }, adminUser)).rejects.toThrow(
      ConflictException,
    )
  })

  it('returns the appointment with the label resolved', async () => {
    ;(mockAppointments.findById as jest.Mock)
      .mockResolvedValueOnce(makeAppointment())
      .mockResolvedValueOnce(makeAppointment({ labelId, label: makeLabel() }))

    const result = await useCase.execute(appointmentId, { labelId }, adminUser)

    expect(result.label).toEqual({ id: labelId, name: 'Retorno', color: AppointmentLabelColor.GREEN })
  })

  // Rótulo não muda disponibilidade nem contagem: invalidar availability ou
  // dashboard aqui seria refetch desperdiçado.
  it('invalidates only the appointment listings', async () => {
    await useCase.execute(appointmentId, { labelId }, adminUser)

    expect(mockCache.delByPrefix).toHaveBeenCalledWith(`appointments:list:${clinicId}:`)
    expect(mockCache.delByPrefix).toHaveBeenCalledTimes(1)
  })
})
