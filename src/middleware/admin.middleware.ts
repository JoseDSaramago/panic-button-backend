import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../entities/User.entity';

/**
 * Middleware de autorización para rutas exclusivas de administrador.
 * Debe usarse después de authMiddleware.
 */
export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== UserRole.ADMIN) {
    res.status(403).json({ success: false, error: 'Acceso restringido a administradores' });
    return;
  }
  next();
}
