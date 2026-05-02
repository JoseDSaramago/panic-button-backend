import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { adminMiddleware } from '../../middleware/admin.middleware';
import { hardDeleteUserHandler } from './admin.controller';

const router = Router();

// Todas las rutas admin requieren JWT válido + role ADMIN
router.use(authMiddleware);
router.use(adminMiddleware);

router.delete('/users/:user_uuid', hardDeleteUserHandler);

export default router;
