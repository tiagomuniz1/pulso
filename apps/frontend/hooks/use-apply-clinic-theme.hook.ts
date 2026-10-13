'use client'

import { useEffect } from 'react'
import {
  computeBgDark,
  computeBgLight,
  computeDarkAccent,
  computeDarkSoft,
  THEME_RADIUS_PRESETS,
  ThemeBorderRadius,
} from '@app/shared'
import { useActiveTheme } from '@/components/features/themes/hooks/use-active-theme.hook'

export const CLINIC_THEME_STORAGE_KEY = 'clinic-theme-vars'

const CSS_VARS = [
  '--accentLight', '--accentSoftLight', '--accentDark', '--accentSoftDark',
  '--bgLight', '--bgDark',
  '--radius-sm', '--radius', '--radius-md', '--radius-lg', '--radius-xl',
] as const

export function useApplyClinicTheme(): void {
  const { data: theme } = useActiveTheme()

  useEffect(() => {
    const root = document.documentElement

    if (theme) {
      const radii = THEME_RADIUS_PRESETS[theme.borderRadius ?? ThemeBorderRadius.DEFAULT]
      const vars: Record<string, string> = {
        '--accentLight': theme.accentColor,
        '--accentSoftLight': theme.accentSoftColor,
        '--accentDark': computeDarkAccent(theme.accentColor),
        '--accentSoftDark': computeDarkSoft(theme.accentColor),
        '--bgLight': theme.bgColor ?? computeBgLight(theme.accentColor),
        '--bgDark': theme.bgDarkColor ?? computeBgDark(theme.accentColor),
        '--radius-sm': radii.sm,
        '--radius': radii.default,
        '--radius-md': radii.md,
        '--radius-lg': radii.lg,
        '--radius-xl': radii.xl,
      }

      for (const [key, value] of Object.entries(vars)) {
        root.style.setProperty(key, value)
      }

      try {
        localStorage.setItem(CLINIC_THEME_STORAGE_KEY, JSON.stringify(vars))
      } catch {}
    } else {
      CSS_VARS.forEach((v) => root.style.removeProperty(v))

      try {
        localStorage.removeItem(CLINIC_THEME_STORAGE_KEY)
      } catch {}
    }
  }, [theme])
}
