import { AppDataSource } from '../../config/database';
import { User } from '../../entities/User.entity';
import { EmergencyContact } from '../../entities/EmergencyContact.entity';
import { logger } from '../../utils/logger';

function notFound(): Error & { statusCode: number } {
  const err = new Error('Usuario no encontrado') as Error & { statusCode: number };
  err.statusCode = 404;
  return err;
}

export async function adminHardDeleteUser(targetUserUuid: string): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const user = await queryRunner.manager.findOne(User, {
      where: { user_uuid: targetUserUuid },
      withDeleted: true,
    });

    if (!user) throw notFound();

    // Eliminar contactos de emergencia primero (FK constraint)
    await queryRunner.manager.delete(EmergencyContact, { user_uuid: targetUserUuid });

    // Hard delete del usuario
    await queryRunner.manager.delete(User, { user_uuid: targetUserUuid });

    await queryRunner.commitTransaction();
    logger.info('Admin hard-deleted user', { targetUserUuid });
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}
