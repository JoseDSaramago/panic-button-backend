import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const PANIC_RATE_LIMIT = 3;          // máximo de activaciones por ventana
const PANIC_WINDOW_MS  = 10 * 60 * 1000; // 10 minutos en milisegundos

interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp en ms cuando expira la ventana
}

// Mapa en memoria: userId → { count, resetAt }
// Se limpia automáticamente al expirar cada ventana, sin necesidad de Redis.
const store = new Map<string, RateLimitEntry>();

/**
 * Rate limiter para POST /api/panic/trigger y /api/panic/test.
 * Permite máximo 3 activaciones por userId en 10 minutos.
 */
export function panicRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'No autenticado' });
    return;
  }

  const key = req.user.userId;
  const now = Date.now();

  const entry = store.get(key);

  // Ventana expirada o primera vez: reiniciar contador
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + PANIC_WINDOW_MS });
    next();
    return;
  }

  if (entry.count >= PANIC_RATE_LIMIT) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    logger.warn('Panic rate limit exceeded', {
      userId: key,
      count: entry.count,
      retryAfterSeconds,
    });
    res.status(429).json({
      success: false,
      error: `Límite excedido: máximo ${PANIC_RATE_LIMIT} activaciones cada 10 minutos`,
      retry_after_seconds: retryAfterSeconds,
    });
    return;
  }

  entry.count += 1;
  next();
}
