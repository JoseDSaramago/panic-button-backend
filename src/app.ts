/**
 * app.ts — Entry point de la aplicación.
 * Orden de arranque:
 *   1. Validar variables de entorno (env.ts se importa primero)
 *   2. Inicializar logger
 *   3. Conectar a MySQL via TypeORM
 *   4. Configurar Express con middlewares de seguridad
 *   5. Montar rutas
 *   6. Escuchar en puerto
 */

// reflect-metadata DEBE importarse antes de cualquier entidad TypeORM
import 'reflect-metadata';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { env } from './config/env';
import { initializeDatabase } from './config/database';
import { logger } from './utils/logger';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import contactsRoutes from './modules/contacts/contacts.routes';
import panicRoutes from './modules/panic/panic.routes';
import adminRoutes from './modules/admin/admin.routes';

import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';

const app = express();

// ── Seguridad ─────────────────────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (Postman, servidores internos)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} no permitido`));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', env: env.NODE_ENV });
});

// ── Rutas de la API ───────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/panic', panicRoutes);
app.use('/api/admin', adminRoutes);

// ── 404 y error handler (siempre al final) ────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    console.log('⏳  conectin to MySQL...');
    await initializeDatabase();
    console.log(`✅  MySQL running → ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);

    app.listen(env.PORT, () => {
      console.log('');
      console.log('🚀  server ok');
      console.log(`    URL:     http://localhost:${env.PORT}`);
      console.log(`    environment: ${env.NODE_ENV}`);
      console.log(`    BD:      ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
      console.log('');
    });
  } catch (err) {
    console.error('❌ Error starting the server:', err);
    process.exit(1);
  }
}

bootstrap();
