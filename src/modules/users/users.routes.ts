import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { getMeHandler, updateMeHandler, deleteMeHandler, hardDeleteMeHandler } from './users.controller';

const router = Router();

// Todos los endpoints de usuarios requieren JWT
router.use(authMiddleware);

router.get('/me', getMeHandler);
router.patch('/me', updateMeHandler);
router.delete('/me', deleteMeHandler);
router.delete('/me/permanent', hardDeleteMeHandler);

export default router;
