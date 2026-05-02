import path from 'path';
import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Ruta absoluta al directorio de logs (siempre relativa a este archivo)
const LOG_DIR = path.join(__dirname, '..', '..', 'logs');

// Formato legible para consola en desarrollo
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] ${level}: ${message}${stack ? `\n${stack}` : ''}${metaStr}`;
  })
);

// Formato JSON para producción (Sentry, log aggregators, etc.)
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    // Archivo de errores siempre activo
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 5_242_880, // 5 MB
      maxFiles: 5,
    }),
  ],
});
