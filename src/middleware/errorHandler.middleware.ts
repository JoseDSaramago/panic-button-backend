import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { logger } from '../utils/logger';

/**
 * Manejador global de errores Express.
 * Debe registrarse como el ÚLTIMO middleware en app.ts (4 parámetros obligatorios).
 *
 * Formatos de respuesta estandarizados:
 *   { success: false, error: string, details?: any }
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // ── 1. Errores de validación Zod ──────────────────────────────────────────
  if (err instanceof ZodError) {
    logger.warn('Validation error', { path: req.path, issues: err.issues });
    res.status(400).json({
      success: false,
      error: 'Datos de entrada inválidos',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // ── 2. Errores de base de datos TypeORM ───────────────────────────────────
  if (err instanceof QueryFailedError) {
    logger.error('Database query failed', { err, path: req.path });

    // Detectar duplicado (MySQL error 1062)
    const mysqlErr = err as QueryFailedError & { code?: string; errno?: number };
    if (mysqlErr.errno === 1062 || mysqlErr.code === 'ER_DUP_ENTRY') {
      res.status(409).json({
        success: false,
        error: 'Ya existe un registro con esos datos únicos',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Error interno de base de datos',
    });
    return;
  }

  if (err instanceof EntityNotFoundError) {
    res.status(404).json({ success: false, error: 'Recurso no encontrado' });
    return;
  }

  // ── 3. Errores HTTP personalizados (con propiedad statusCode) ────────────
  if (err instanceof Error && 'statusCode' in err) {
    const httpErr = err as Error & { statusCode: number };
    logger.warn('HTTP error', { message: err.message, statusCode: httpErr.statusCode });
    res.status(httpErr.statusCode).json({ success: false, error: err.message });
    return;
  }

  // ── 4. Error genérico ─────────────────────────────────────────────────────
  const message = err instanceof Error ? err.message : 'Error interno del servidor';
  logger.error('Unhandled error', { err, path: req.path });

  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'Error interno del servidor'
        : message,
  });
}

/**
 * Middleware para rutas no encontradas (404).
 * Registrar ANTES del errorHandler.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}
