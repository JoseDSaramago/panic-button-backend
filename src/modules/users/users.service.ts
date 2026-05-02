import { AppDataSource } from '../../config/database';
import { User } from '../../entities/User.entity';
import { EmergencyContact } from '../../entities/EmergencyContact.entity';
import { UpdateMeDto } from './users.schema';
import { logger } from '../../utils/logger';

function notFound(): Error & { statusCode: number } {
  const err = new Error('Usuario no encontrado') as Error & { statusCode: number };
  err.statusCode = 404;
  return err;
}

export interface MeResponse {
  user_uuid: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  alias: string;
  email: string;
  panic_enabled: boolean;
  panic_message: string | null;
  contacts_count: number;
}

export async function getMe(userId: string): Promise<MeResponse> {
  const repo = AppDataSource.getRepository(User);

  const user = await repo.findOne({
    where: { user_uuid: userId },
  });

  if (!user) throw notFound();

  const contacts_count = await AppDataSource.getRepository(EmergencyContact).count({
    where: { user_uuid: userId, is_active: true },
  });

  return {
    user_uuid: user.user_uuid,
    phone_number: user.phone_number,
    first_name: user.first_name,
    last_name: user.last_name,
    alias: user.alias,
    email: user.email,
    panic_enabled: user.panic_enabled,
    panic_message: user.panic_message,
    contacts_count,
  };
}

export async function updateMe(userId: string, dto: UpdateMeDto): Promise<MeResponse> {
  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({ where: { user_uuid: userId } });

  if (!user) throw notFound();

  if (dto.phone_number !== undefined) user.phone_number = dto.phone_number;
  if (dto.first_name !== undefined) user.first_name = dto.first_name;
  if (dto.last_name !== undefined) user.last_name = dto.last_name;
  if (dto.alias !== undefined) user.alias = dto.alias;
  if (dto.panic_message !== undefined) user.panic_message = dto.panic_message;

  await repo.save(user);
  logger.info('User updated', { userId });

  const contacts_count = await AppDataSource.getRepository(EmergencyContact).count({
    where: { user_uuid: userId, is_active: true },
  });

  return {
    user_uuid: user.user_uuid,
    phone_number: user.phone_number,
    first_name: user.first_name,
    last_name: user.last_name,
    alias: user.alias,
    email: user.email,
    panic_enabled: user.panic_enabled,
    panic_message: user.panic_message,
    contacts_count,
  };
}

export async function deleteMe(userId: string): Promise<void> {
  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({ where: { user_uuid: userId } });

  if (!user) throw notFound();

  await repo.softDelete({ user_uuid: userId });
  logger.info('User soft-deleted', { userId });
}

export async function hardDeleteMe(userId: string): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const user = await queryRunner.manager.findOne(User, {
      where: { user_uuid: userId },
      withDeleted: true,
    });

    if (!user) throw notFound();

    // Eliminar contactos de emergencia primero (FK constraint)
    await queryRunner.manager.delete(EmergencyContact, { user_uuid: userId });

    // Hard delete del usuario (sin soft delete)
    await queryRunner.manager.delete(User, { user_uuid: userId });

    await queryRunner.commitTransaction();
    logger.info('User hard-deleted', { userId });
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}
