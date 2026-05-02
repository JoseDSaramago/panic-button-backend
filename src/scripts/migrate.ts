/**
 * migrate.ts — Crea o sincroniza todas las tablas en la base de datos.
 * Uso: npx ts-node src/scripts/migrate.ts
 * En producción (desde el contenedor): node dist/scripts/migrate.js
 *
 * Seguro de correr múltiples veces: solo crea columnas/tablas faltantes,
 * nunca elimina datos existentes.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../entities/User.entity';
import { EmergencyContact } from '../entities/EmergencyContact.entity';
import { PanicEvent } from '../entities/PanicEvent.entity';
import { Plan } from '../entities/Plan.entity';

config(); // carga .env si existe

const MigrateDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT ?? '3306'),
  username: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  charset: 'utf8mb4',
  timezone: 'Z',
  synchronize: false,
  logging: true,
  entities: [User, EmergencyContact, PanicEvent, Plan],
});

async function migrate(): Promise<void> {
  console.log('⏳  Conectando a MySQL...');
  await MigrateDataSource.initialize();
  console.log('✅  Conexión establecida.');

  console.log('⏳  Sincronizando esquema (creando tablas y columnas faltantes)...');
  await MigrateDataSource.synchronize();
  console.log('✅  Esquema sincronizado correctamente.');

  await MigrateDataSource.destroy();
  console.log('✅  Migración completada.');
}

migrate().catch((err) => {
  console.error('❌  Error durante la migración:', err);
  process.exit(1);
});
