'use client'

import type { FieldErrors, FieldValues, UseFormRegister, Path } from 'react-hook-form'
import { z } from 'zod'
import { Input } from '@/components/ui/atoms/input/input'

export const zipCodeRegex = /^\d{5}-\d{3}$/

/**
 * Schema do endereço, espelhando o `AddressDto` do backend. Fica aqui, junto do
 * componente, porque quem renderiza os campos e quem os valida têm de concordar
 * — separá-los é como as duas metades se desencontram.
 */
export const addressSchema = z.object({
  street: z.string().min(1, 'Logradouro obrigatório').max(255),
  number: z.string().min(1, 'Número obrigatório').max(20),
  complement: z.string().max(100).optional().or(z.literal('')),
  neighborhood: z.string().min(1, 'Bairro obrigatório').max(100),
  city: z.string().min(1, 'Cidade obrigatória').max(100),
  state: z.string().length(2, 'UF deve ter 2 caracteres').toUpperCase(),
  zipCode: z.string().regex(zipCodeRegex, 'CEP inválido. Use o formato 00000-000'),
  country: z.string().length(2).optional(),
})

export type AddressFormValues = z.infer<typeof addressSchema>

interface AddressFieldsProps<T extends FieldValues> {
  register: UseFormRegister<T>
  errors: FieldErrors<AddressFormValues> | undefined
  /** Caminho do objeto de endereço dentro do formulário — hoje sempre `address`. */
  prefix: string
  /** Prefixo dos `data-testid`, para cada formulário manter os seus. */
  testIdPrefix: string
}

/**
 * Os campos de endereço, compartilhados entre o formulário de clínica e o de
 * paciente. Nasceu como função privada dentro de `clinic-form.tsx`; virou
 * molécula quando o paciente passou a ter endereço, para as duas telas não
 * divergirem em rótulo, ordem ou validação.
 */
export function AddressFields<T extends FieldValues>({
  register,
  errors,
  prefix,
  testIdPrefix,
}: AddressFieldsProps<T>) {
  const field = (name: string) => `${prefix}.${name}` as Path<T>

  return (
    <fieldset className="flex flex-col gap-3 rounded border border-line p-4">
      <legend className="px-1 text-sm font-medium text-text">Endereço</legend>

      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            label="Logradouro"
            id={`${prefix}.street`}
            placeholder="Rua das Flores"
            data-testid={`${testIdPrefix}-street`}
            error={errors?.street?.message}
            {...register(field('street'))}
          />
        </div>
        <div className="w-28">
          <Input
            label="Número"
            id={`${prefix}.number`}
            placeholder="123"
            data-testid={`${testIdPrefix}-number`}
            error={errors?.number?.message}
            {...register(field('number'))}
          />
        </div>
      </div>

      <Input
        label="Complemento"
        id={`${prefix}.complement`}
        placeholder="Apto 42 (opcional)"
        data-testid={`${testIdPrefix}-complement`}
        error={errors?.complement?.message}
        {...register(field('complement'))}
      />

      <Input
        label="Bairro"
        id={`${prefix}.neighborhood`}
        placeholder="Centro"
        data-testid={`${testIdPrefix}-neighborhood`}
        error={errors?.neighborhood?.message}
        {...register(field('neighborhood'))}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            label="Cidade"
            id={`${prefix}.city`}
            placeholder="São Paulo"
            data-testid={`${testIdPrefix}-city`}
            error={errors?.city?.message}
            {...register(field('city'))}
          />
        </div>
        <div className="w-20">
          <Input
            label="UF"
            id={`${prefix}.state`}
            placeholder="SP"
            maxLength={2}
            data-testid={`${testIdPrefix}-state`}
            error={errors?.state?.message}
            {...register(field('state'))}
          />
        </div>
      </div>

      <Input
        label="CEP"
        id={`${prefix}.zipCode`}
        placeholder="00000-000"
        data-testid={`${testIdPrefix}-zipcode`}
        error={errors?.zipCode?.message}
        {...register(field('zipCode'))}
      />
    </fieldset>
  )
}

/**
 * Endereço opcional: o bloco inteiro pode ficar em branco, mas preenchido pela
 * metade não passa. É o meio-termo que a clínica precisa — muita paciente é
 * cadastrada sem o CEP em mãos, e recusar o cadastro por isso seria pior do que
 * guardar o endereço depois.
 */
export const partialAddressSchema = z
  .object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  })
  .optional()

export type PartialAddressFormValues = z.infer<typeof partialAddressSchema>

/** Valores em branco de cada campo — o que o formulário usa como default. */
export const EMPTY_ADDRESS: Required<Omit<AddressFormValues, 'complement' | 'country'>> & {
  complement: string
  country: string
} = {
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
}

/** True quando a pessoa digitou qualquer coisa no bloco (ignorando espaços). */
export function hasAnyAddressValue(address: PartialAddressFormValues): boolean {
  if (!address) return false
  return Object.values(address).some((value) => typeof value === 'string' && value.trim() !== '')
}

/**
 * Valida o bloco só quando ele foi tocado, e devolve os erros já ancorados em
 * `address.<campo>` para o react-hook-form pintar o campo certo.
 */
export function validateOptionalAddress(
  address: PartialAddressFormValues,
  ctx: z.RefinementCtx,
  path: string = 'address',
): void {
  if (!hasAnyAddressValue(address)) return

  const result = addressSchema.safeParse({
    ...address,
    country: address?.country?.trim() ? address.country : 'BR',
  })
  if (result.success) return

  for (const issue of result.error.issues) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path, ...issue.path],
      message: issue.message,
    })
  }
}

/** Bloco do formulário → o `address` que vai para a API (ou nada). */
export function toAddressInput(address: PartialAddressFormValues) {
  if (!hasAnyAddressValue(address)) return undefined

  return {
    street: address!.street!.trim(),
    number: address!.number!.trim(),
    complement: address?.complement?.trim() ? address.complement.trim() : null,
    neighborhood: address!.neighborhood!.trim(),
    city: address!.city!.trim(),
    state: address!.state!.trim().toUpperCase(),
    zipCode: address!.zipCode!.trim(),
    country: address?.country?.trim() ? address.country.trim().toUpperCase() : 'BR',
  }
}
