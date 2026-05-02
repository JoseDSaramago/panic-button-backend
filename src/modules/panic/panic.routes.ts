import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { panicRateLimit } from '../../middleware/rateLimit.middleware';
import { trigger, history, testPanic } from './panic.controller';

const router = Router();

router.use(authMiddleware);

// Rate limit solo en /trigger y /test (no en /history)
router.post('/trigger', panicRateLimit, trigger);
router.post('/test', panicRateLimit, testPanic);
router.get('/history', history);

export default router;
