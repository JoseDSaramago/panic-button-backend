import { Request, Response, NextFunction } from 'express';
import {
  createContactSchema,
  updateContactSchema,
  reorderSchema,
} from './contacts.schema';
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  reorderContacts,
} from './contacts.service';

// GET /api/contacts
export async function listContacts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const contacts = await getContacts(req.user!.userId);
    res.status(200).json({ success: true, contacts });
  } catch (err) {
    next(err);
  }
}

// POST /api/contacts
export async function addContact(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto = createContactSchema.parse(req.body);
    const contact = await createContact(req.user!.userId, dto);
    res.status(201).json({ success: true, contact });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/contacts/:user_uuid/:contact_uuid
export async function editContact(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userUuid    = String(req.params.user_uuid);
    const contactUuid = String(req.params.contact_uuid);
    const dto         = updateContactSchema.parse(req.body);

    const contact = await updateContact(req.user!.userId, userUuid, contactUuid, dto);
    res.status(200).json({ success: true, contact });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/contacts/:user_uuid/:contact_uuid
export async function removeContact(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userUuid    = String(req.params.user_uuid);
    const contactUuid = String(req.params.contact_uuid);

    await deleteContact(req.user!.userId, userUuid, contactUuid);
    res.status(200).json({ success: true, message: 'Contacto eliminado' });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/contacts/reorder
export async function reorder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dto = reorderSchema.parse(req.body);
    const contacts = await reorderContacts(req.user!.userId, dto);
    res.status(200).json({ success: true, contacts });
  } catch (err) {
    next(err);
  }
}
