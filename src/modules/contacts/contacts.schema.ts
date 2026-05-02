import { z } from 'zod';

export const createContactSchema = z.object({
  first_name: z.string().min(2).max(60),
  last_name: z.string().min(2).max(60),
  alias: z.string().min(2).max(60),
  relationship: z.string().max(60).nullable().optional(),
  whatsapp_number: z
    .string()
    .regex(
      /^\d{10,15}$/,
      'El número debe incluir código de país, ej. 521XXXXXXXXXX'
    ),
  notify_order: z.number().int().min(1).max(5),
});

export const updateContactSchema = z.object({
  first_name: z.string().min(2).max(60).optional(),
  last_name: z.string().min(2).max(60).optional(),
  alias: z.string().min(2).max(60).optional(),
  relationship: z.string().max(60).nullable().optional(),
  whatsapp_number: z
    .string()
    .regex(/^\d{10,15}$/)
    .optional(),
  notify_order: z.number().int().min(1).max(5).optional(),
  is_active: z.boolean().optional(),
});

// Para el reorder: array de pares {contact_uuid, notify_order}
export const reorderSchema = z.array(
  z.object({
    contact_uuid: z.string().uuid('contact_uuid inválido'),
    notify_order: z.number().int().min(1).max(5),
  })
).min(1).max(5);

export type CreateContactDto = z.infer<typeof createContactSchema>;
export type UpdateContactDto = z.infer<typeof updateContactSchema>;
export type ReorderDto = z.infer<typeof reorderSchema>;
