import { Request, Response, NextFunction } from 'express';
import { triggerPanicSchema } from './panic.schema';
import { triggerPanic, getPanicHistory } from './panic.service';

// POST /api/panic/trigger
export async function trigger(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto = triggerPanicSchema.parse(req.body);
    const result = await triggerPanic(req.user!.userId, dto, false);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/panic/history?page=1&limit=10
export async function history(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page  = Math.max(1, parseInt(String(req.query.page  ?? '1'),  10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '10'), 10) || 10));

    const result = await getPanicHistory(req.user!.userId, page, limit);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// POST /api/panic/test — igual que trigger pero marca el alias con [TEST]
export async function testPanic(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto = triggerPanicSchema.parse(req.body);
    const result = await triggerPanic(req.user!.userId, dto, true);
    res.status(200).json({ ...result, is_test: true });
  } catch (err) {
    next(err);
  }
}
