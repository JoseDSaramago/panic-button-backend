import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from './User.entity';

/**
 * PanicEvent es inmutable: solo se permiten INSERTs.
 * Nunca actualices ni borres registros de esta tabla.
 * Cada activación del botón de pánico genera un nuevo registro.
 */
@Entity('panic_events')
export class PanicEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 36, unique: true, nullable: false })
  event_uuid!: string;

  @BeforeInsert()
  generateEventUuid() {
    this.event_uuid = uuidv4();
  }

  @Column({ type: 'varchar', nullable: false })
  user_uuid!: string;

  @Column({ type: 'datetime', nullable: false })
  triggered_at!: Date;

  // Coordenadas GPS — nullable porque el usuario puede denegar ubicación
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  latitude!: number | null;

  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  longitude!: number | null;

  @Column({ type: 'text', nullable: true })
  maps_url!: string | null;

  @Column({ type: 'int', nullable: false })
  contacts_attempted!: number;

  @Column({ type: 'int', nullable: false })
  contacts_delivered!: number;

  // IDs de mensaje devueltos por la API de Brevo (array serializado como JSON)
  @Column({ type: 'json', nullable: true })
  brevo_message_ids!: object | null;

  @Column({ type: 'text', nullable: true })
  error_detail!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  device_os!: string | null;

  @ManyToOne(() => User, (user) => user.panic_events, { nullable: false })
  @JoinColumn({ name: 'user_uuid', referencedColumnName: 'user_uuid' })
  user!: User;
}
