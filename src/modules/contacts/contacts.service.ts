import { AppDataSource } from '../../config/database';
import { EmergencyContact } from '../../entities/EmergencyContact.entity';
import {
  CreateContactDto,
  UpdateContactDto,
  ReorderDto,
} from './contacts.schema';
import { logger } from '../../utils/logger';

const MAX_CONTACTS = 5;

function notFound(): Error & { statusCode: number } {
  const err = new Error('Contacto no encontrado') as Error & { statusCode: number };
  err.statusCode = 404;
  return err;
}

function forbidden(): Error & { statusCode: number } {
  const err = new Error('No tienes permiso para modificar este contacto') as Error & {
    statusCode: number;
  };
  err.statusCode = 403;
  return err;
}

export async function getContacts(userId: string): Promise<EmergencyContact[]> {
  return AppDataSource.getRepository(EmergencyContact).find({
    where: { user_uuid: userId },
    order: { notify_order: 'ASC' },
  });
}

export async function createContact(
  userId: string,
  dto: CreateContactDto
): Promise<EmergencyContact> {
  const repo = AppDataSource.getRepository(EmergencyContact);

  const count = await repo.count({ where: { user_uuid: userId } });
  if (count >= MAX_CONTACTS) {
    const err = new Error(
      `Máximo ${MAX_CONTACTS} contactos de emergencia permitidos`
    ) as Error & { statusCode: number };
    err.statusCode = 422;
    throw err;
  }

  const contact = repo.create({ ...dto, user_uuid: userId });
  const saved = await repo.save(contact);
  logger.info('Contact created', { userId, contactId: saved.contact_uuid });
  return saved;
}

export async function updateContact(
  authUserId: string,
  userUuid: string,
  contactUuid: string,
  dto: UpdateContactDto
): Promise<EmergencyContact> {
  // El user_uuid del parámetro debe coincidir con el token JWT
  if (authUserId !== userUuid) throw forbidden();

  const repo = AppDataSource.getRepository(EmergencyContact);

  // Busca el contacto asegurando que pertenece al user_uuid indicado
  const contact = await repo.findOne({
    where: { contact_uuid: contactUuid, user_uuid: userUuid },
  });
  if (!contact) throw notFound();

  Object.assign(contact, dto);
  const saved = await repo.save(contact);
  logger.info('Contact updated', { userUuid, contactUuid });
  return saved;
}

export async function deleteContact(
  authUserId: string,
  userUuid: string,
  contactUuid: string
): Promise<void> {
  // El user_uuid del parámetro debe coincidir con el token JWT
  if (authUserId !== userUuid) throw forbidden();

  const repo = AppDataSource.getRepository(EmergencyContact);

  // Busca el contacto asegurando que pertenece al user_uuid indicado
  const contact = await repo.findOne({
    where: { contact_uuid: contactUuid, user_uuid: userUuid },
  });
  if (!contact) throw notFound();

  await repo.delete({ contact_uuid: contactUuid });
  logger.info('Contact deleted', { userUuid, contactUuid });
}

/**
 * Reordena los contactos en una sola transacción atómica.
 * Verifica que cada contacto pertenezca al usuario antes de actualizar.
 */
export async function reorderContacts(
  userId: string,
  dto: ReorderDto
): Promise<EmergencyContact[]> {
  const repo = AppDataSource.getRepository(EmergencyContact);
  const queryRunner = AppDataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    for (const { contact_uuid, notify_order } of dto) {
      const contact = await queryRunner.manager.findOne(EmergencyContact, {
        where: { contact_uuid },
      });

      if (!contact) {
        throw Object.assign(new Error(`Contacto ${contact_uuid} no encontrado`), {
          statusCode: 404,
        });
      }
      if (contact.user_uuid !== userId) throw forbidden();

      await queryRunner.manager.update(EmergencyContact, { contact_uuid }, { notify_order });
    }

    await queryRunner.commitTransaction();
    logger.info('Contacts reordered', { userId });
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }

  // Devolver lista actualizada
  return repo.find({ where: { user_uuid: userId }, order: { notify_order: 'ASC' } });
}
