import { Request, Response, NextFunction } from 'express';
import { updateMeSchema } from './users.schema';
import { getMe, updateMe, deleteMe, hardDeleteMe } from './users.service';

// GET /api/users/me
export async function getMeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await getMe(req.user!.userId);
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/me
export async function updateMeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto = updateMeSchema.parse(req.body);
    const user = await updateMe(req.user!.userId, dto);
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/users/me
export async function deleteMeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await deleteMe(req.user!.userId);
    res.status(200).json({ success: true, message: 'Cuenta desactivada' });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/users/me/permanent
export async function hardDeleteMeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await hardDeleteMe(req.user!.userId);
    res.status(200).json({ success: true, message: 'Cuenta eliminada permanentemente' });
  } catch (err) {
    next(err);
  }
}
