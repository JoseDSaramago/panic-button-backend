import 'dotenv/config';
import { z } from 'zod';

// Define y valida todas las variables de entorno al arrancar.
// Si falta alguna obligatoria, el proceso falla de inmediato con un mensaje claro.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  // MySQL
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  // Brevo
  BREVO_API_KEY: z.string().min(1),
  BREVO_WHATSAPP_TEMPLATE: z.string().min(1),
  BREVO_SENDER_NUMBER: z.string().min(1),
  BREVO_SMS_SENDER: z.string().min(1),

  // Sentry (opcional)
  SENTRY_DSN: z.string().optional(),

  // CORS — coma separados
  CORS_ORIGINS: z.string().default('http://localhost:3001'),

  // Retención GPS en días
  GPS_RETENTION_DAYS: z.coerce.number().default(90),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('❌  Variables de entorno inválidas o faltantes:');
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
