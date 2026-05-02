import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from './User.entity';

@Entity('emergency_contacts')
export class EmergencyContact {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 36, unique: true, nullable: false })
  contact_uuid!: string;

  @BeforeInsert()
  generateContactUuid() {
    this.contact_uuid = uuidv4();
  }

  @Column({ type: 'varchar', nullable: false })
  user_uuid!: string;

  @Column({ type: 'varchar', length: 60, nullable: false })
  first_name!: string;

  @Column({ type: 'varchar', length: 60, nullable: false })
  last_name!: string;

  @Column({ type: 'varchar', length: 60, nullable: false })
  alias!: string;

  // Parentesco: ej. "Mamá", "Hermano", "Amigo", "Pareja", etc.
  @Column({ type: 'varchar', length: 60, nullable: true })
  relationship!: string | null;

  @Column({ type: 'varchar', length: 15, nullable: false })
  whatsapp_number!: string;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  // Orden de notificación: 1 es el primero en recibir el pánico
  @Column({ type: 'int', nullable: false })
  notify_order!: number;

  @Column({ type: 'datetime', nullable: true })
  last_notified_at!: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  brevo_contact_id!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => User, (user) => user.emergency_contacts, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'user_uuid', referencedColumnName: 'user_uuid' })
  user!: User;
}
