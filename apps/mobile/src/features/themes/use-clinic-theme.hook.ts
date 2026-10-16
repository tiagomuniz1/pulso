import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getActiveThemeUseCase } from '@app/core'
import type { ClinicTheme } from '../../theme/theme'

/**
 * O tema que a clínica configurou.
 *
 * Só depois do login: o endpoint é autenticado e o `clinicId` sai do JWT. Até
 * lá a tela de login usa o acento padrão, que é o certo — não há clínica para
 * representar antes de alguém dizer qual é.
 *
 * `staleTime` longo porque isto muda quando o ADMIN mexe no backoffice, não
 * durante um atendimento. Refazer a cada foco de tela repintaria o app à toa.
 */
export function useClinicTheme(enabled: boolean): ClinicTheme | undefined {
  const { data } = useQuery({
    queryKey: ['clinic-theme'],
    queryFn: getActiveThemeUseCase,
    enabled,
    staleTime: 1000 * 60 * 30,
  })

  // Memoizado porque o `ThemeProvider` depende da identidade deste objeto:
  // recriá-lo a cada render refaria os tokens e repintaria o app inteiro a
  // cada toque.
  return useMemo(
    () =>
      data
        ? {
            accentColor: data.accentColor,
            accentSoftColor: data.accentSoftColor,
            bgColor: data.bgColor,
            bgDarkColor: data.bgDarkColor,
            borderRadius: data.borderRadius,
          }
        : undefined,
    [data],
  )
}
