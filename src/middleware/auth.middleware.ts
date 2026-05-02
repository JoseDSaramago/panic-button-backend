import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User.entity';

// Extiende el tipo Request de Express para incluir el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        phoneNumber: string;
        planStatus: string;
        role: string;
      };
    }
  }
}

interface JwtPayload {
  userId: string;
  phoneNumber: string;
  planStatus: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Middleware de autenticación JWT.
 * Verifica el header `Authorization: Bearer <token>`.
 * Adjunta req.user con el payload decodificado si el token es válido.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Token de autenticación requerido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    res.status(401).json({ success: false, error: 'Token inválido o expirado' });
    return;
  }

  // Verificar que el usuario no esté soft-deleted
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({
    where: { user_uuid: payload.userId },
    withDeleted: true, // incluir soft-deleted para detectarlos
  });

  if (!user) {
    res.status(401).json({ success: false, error: 'Usuario no encontrado' });
    return;
  }

  if (user.deleted_at !== null) {
    res.status(401).json({ success: false, error: 'Cuenta desactivada' });
    return;
  }

  req.user = {
    userId: payload.userId,
    phoneNumber: payload.phoneNumber,
    planStatus: payload.planStatus,
    role: payload.role,
  };

  next();
}
