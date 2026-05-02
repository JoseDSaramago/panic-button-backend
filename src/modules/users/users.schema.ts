import { z } from 'zod';

export const updateMeSchema = z.object({
  phone_number: z.string().regex(/^\d{10,15}$/, 'Número de teléfono inválido (10-15 dígitos)').optional(),
  first_name: z.string().min(2).max(60).optional(),
  last_name: z.string().min(2).max(60).optional(),
  alias: z.string().min(2).max(60).optional(),
  panic_message: z.string().max(500).nullable().optional(),
});

export type UpdateMeDto = z.infer<typeof updateMeSchema>;
