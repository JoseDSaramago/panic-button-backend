import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { User } from './User.entity';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 80, nullable: false })
  name!: string;

  @Column({ type: 'int', nullable: false })
  data_gb!: number;

  @Column({ type: 'int', nullable: false })
  duration_days!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price_mxn!: number;

  @Column({ type: 'varchar', length: 100, nullable: false })
  altan_plan_id!: string;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @OneToMany(() => User, (user) => user.plan)
  users!: User[];
}
