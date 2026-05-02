import { z } from 'zod';

export const registerSchema = z.object({
  phone_number: z
    .string()
    .regex(/^\d{10,15}$/, 'Número de teléfono inválido (10-15 dígitos)'),
  first_name: z.string().min(2).max(60),
  last_name: z.string().min(2).max(60),
  alias: z.string().min(2).max(60),
  email: z.string().email('Email inválido').max(100),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72), // bcrypt max
});

export const loginSchema = z.object({
  phone_number: z.string().min(1, 'Número de teléfono requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token requerido'),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;
