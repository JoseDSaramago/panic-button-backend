import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { EmergencyContact } from './EmergencyContact.entity';
import { PanicEvent } from './PanicEvent.entity';
import { Plan } from './Plan.entity';

export enum PlanStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
}

export enum EsimStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  PORTING = 'PORTING',
  SUSPENDED = 'SUSPENDED',
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 36, unique: true, nullable: false })
  user_uuid!: string;

  @BeforeInsert()
  generateUuid() {
    this.user_uuid = uuidv4();
  }

  @Column({ type: 'varchar', length: 15, unique: true, nullable: false })
  phone_number!: string;

  @Column({ type: 'varchar', length: 60, nullable: false })
  first_name!: string;

  @Column({ type: 'varchar', length: 60, nullable: false })
  last_name!: string;

  @Column({ type: 'varchar', length: 60, nullable: false })
  alias!: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  email!: string;

  @Column({ type: 'boolean', default: false })
  email_verified!: boolean;

  @Column({
    type: 'enum',
    enum: PlanStatus,
    default: PlanStatus.PENDING,
  })
  plan_status!: PlanStatus;

  @Column({ type: 'date', nullable: true })
  plan_start_date!: Date | null;

  @Column({ type: 'int', nullable: true })
  plan_cut_day!: number | null;

  @Column({ type: 'varchar', length: 22, unique: true, nullable: true })
  esim_iccid!: string | null;

  @Column({
    type: 'enum',
    enum: EsimStatus,
    default: EsimStatus.PENDING,
  })
  esim_status!: EsimStatus;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  altan_line_id!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  portability_pin!: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @Column({ type: 'boolean', default: true })
  panic_enabled!: boolean;

  @Column({ type: 'text', nullable: true })
  panic_message!: string | null;

  @Column({ type: 'varchar', nullable: false })
  password_hash!: string;

  // Refresh token rotativo — se actualiza en cada login/refresh y se borra al invalidar
  @Column({ type: 'varchar', length: 512, nullable: true })
  refresh_token_hash!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Soft delete — cuando deleted_at tiene valor el usuario está eliminado
  @DeleteDateColumn({ nullable: true })
  deleted_at!: Date | null;

  // FK a Plan (nullable — usuario sin plan asignado)
  @Column({ type: 'varchar', nullable: true })
  plan_id!: string | null;

  @ManyToOne(() => Plan, (plan) => plan.users, { nullable: true, eager: false })
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan | null;

  @OneToMany(() => EmergencyContact, (contact) => contact.user, {
    cascade: true,
  })
  emergency_contacts!: EmergencyContact[];

  @OneToMany(() => PanicEvent, (event) => event.user)
  panic_events!: PanicEvent[];
}
