import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from './env';
import { User } from '../entities/User.entity';
import { EmergencyContact } from '../entities/EmergencyContact.entity';
import { PanicEvent } from '../entities/PanicEvent.entity';
import { Plan } from '../entities/Plan.entity';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  charset: 'utf8mb4',
  timezone: 'Z',

  // Solo sincronizar en development — en producción usar migraciones
  synchronize: env.NODE_ENV === 'development',
  // Solo logear queries de error, no todas las queries de synchronize
  logging: ['error'],

  entities: [User, EmergencyContact, PanicEvent, Plan],
  migrations: [],
  subscribers: [],

  extra: {
    connectionLimit: 10,
  },
});

/**
 * Inicializa la conexión a MySQL.
 * Llama esta función UNA sola vez al arrancar la aplicación.
 */
export async function initializeDatabase(): Promise<void> {
  await AppDataSource.initialize();
}
