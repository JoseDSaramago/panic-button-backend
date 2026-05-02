import { Request, Response, NextFunction } from 'express';
import { adminHardDeleteUser } from './admin.service';

// DELETE /api/admin/users/:user_uuid
export async function hardDeleteUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const targetUserUuid = String(req.params.user_uuid);
    await adminHardDeleteUser(targetUserUuid);
    res.status(200).json({ success: true, message: 'Usuario eliminado permanentemente' });
  } catch (err) {
    next(err);
  }
}
