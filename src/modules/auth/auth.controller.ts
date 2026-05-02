import { Request, Response, NextFunction } from 'express';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema';
import { registerUser, loginUser, refreshAccessToken } from './auth.service';

// POST /api/auth/register
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto = registerSchema.parse(req.body);
    await registerUser(dto);
    const result = await loginUser({ phone_number: dto.phone_number, password: dto.password });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto = loginSchema.parse(req.body);
    const result = await loginUser(dto);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/refresh
export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto = refreshSchema.parse(req.body);
    const result = await refreshAccessToken(dto);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
