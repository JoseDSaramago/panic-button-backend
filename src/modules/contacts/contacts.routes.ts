import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import {
  listContacts,
  addContact,
  editContact,
  removeContact,
  reorder,
} from './contacts.controller';

const router = Router();

router.use(authMiddleware);

// IMPORTANTE: /reorder debe ir ANTES de /:user_uuid para evitar colisión
router.patch('/reorder', reorder);

router.get('/', listContacts);
router.post('/', addContact);

// Update y delete identifican el contacto por user_uuid + contact_uuid
router.patch('/:user_uuid/:contact_uuid', editContact);
router.delete('/:user_uuid/:contact_uuid', removeContact);

export default router;
