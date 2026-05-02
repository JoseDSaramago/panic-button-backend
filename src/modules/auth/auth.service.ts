import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../../config/database';
import { env } from '../../config/env';
import { User, PlanStatus, UserRole } from '../../entities/User.entity';
import { RegisterDto, LoginDto, RefreshDto } from './auth.schema';
import { logger } from '../../utils/logger';

const BCRYPT_SALT_ROUNDS = 12;
const JWT_EXPIRY = '7d';
const REFRESH_EXPIRY = '30d';

// Hashea el refresh token antes de guardarlo en la BD
// para que un leak de la tabla no exponga tokens activos
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user: User): string {
  return jwt.sign(
    {
      userId: user.user_uuid,
      phoneNumber: user.phone_number,
      planStatus: user.plan_status,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

function signRefreshToken(userUuid: string): string {
  return jwt.sign({ userId: userUuid, jti: uuidv4() }, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRY,
  });
}

export async function registerUser(dto: RegisterDto): Promise<{ userId: string }> {
  const repo = AppDataSource.getRepository(User);

  // Verificar unicidad de teléfono y email
  const existing = await repo.findOne({
    where: [{ phone_number: dto.phone_number }, { email: dto.email }],
    withDeleted: false,
  });

  if (existing) {
    const field =
      existing.phone_number === dto.phone_number ? 'phone_number' : 'email';
    const error = new Error(
      field === 'phone_number'
        ? 'El número de teléfono ya está registrado'
        : 'El email ya está registrado'
    ) as Error & { statusCode: number };
    error.statusCode = 409;
    throw error;
  }

  const password_hash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

  const user = repo.create({
    phone_number: dto.phone_number,
    first_name: dto.first_name,
    last_name: dto.last_name,
    alias: dto.alias,
    email: dto.email,
    password_hash,
    plan_status: PlanStatus.PENDING,
    panic_enabled: true,
  });

  const saved = await repo.save(user);
  logger.info('User registered', { userId: saved.user_uuid });

  return { userId: saved.user_uuid };
}

export async function loginUser(dto: LoginDto): Promise<{
  token: string;
  refreshToken: string;
  user: Partial<User>;
}> {
  const repo = AppDataSource.getRepository(User);

  const user = await repo.findOne({
    where: { phone_number: dto.phone_number },
    select: [
      'user_uuid',
      'phone_number',
      'first_name',
      'last_name',
      'alias',
      'email',
      'plan_status',
      'role',
      'password_hash',
      'panic_enabled',
      'deleted_at',
    ],
    withDeleted: false,
  });

  if (!user) {
    const err = new Error('Credenciales incorrectas') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const passwordOk = await bcrypt.compare(dto.password, user.password_hash);
  if (!passwordOk) {
    const err = new Error('Credenciales incorrectas') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const token = signAccessToken(user);
  const refreshToken = signRefreshToken(user.user_uuid);

  // Guardar hash del refresh token en la columna del usuario (persistente en MySQL)
  await repo.update({ user_uuid: user.user_uuid }, { refresh_token_hash: hashToken(refreshToken) });

  logger.info('User logged in', { userId: user.user_uuid });

  const { password_hash: _, ...safeUser } = user;
  return { token, refreshToken, user: safeUser };
}

export async function refreshAccessToken(dto: RefreshDto): Promise<{
  token: string;
  refreshToken: string;
}> {
  // 1. Verificar firma JWT del refresh token
  let payload: { userId: string };
  try {
    payload = jwt.verify(dto.refresh_token, env.JWT_REFRESH_SECRET) as {
      userId: string;
    };
  } catch {
    const err = new Error('Refresh token inválido o expirado') as Error & {
      statusCode: number;
    };
    err.statusCode = 401;
    throw err;
  }

  // 2. Cargar usuario y verificar que el hash coincida (rotación)
  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({
    where: { user_uuid: payload.userId },
    select: [
      'user_uuid',
      'phone_number',
      'alias',
      'plan_status',
      'refresh_token_hash',
      'deleted_at',
    ],
  });

  if (!user) {
    const err = new Error('Usuario no encontrado') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  if (!user.refresh_token_hash || user.refresh_token_hash !== hashToken(dto.refresh_token)) {
    const err = new Error('Refresh token no válido o ya utilizado') as Error & {
      statusCode: number;
    };
    err.statusCode = 401;
    throw err;
  }

  // 3. Rotar: generar nuevos tokens y actualizar el hash en la BD
  const newToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user.user_uuid);

  await repo.update({ user_uuid: user.user_uuid }, { refresh_token_hash: hashToken(newRefreshToken) });

  logger.info('Access token refreshed', { userId: user.user_uuid });

  return { token: newToken, refreshToken: newRefreshToken };
}
