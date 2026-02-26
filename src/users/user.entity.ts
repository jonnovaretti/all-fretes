import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import * as bcrypt from 'bcrypt';

const BCRYPT_HASH_REGEX = /^\$2[aby]\$/;

function isBcryptHash(value: string): boolean {
  return BCRYPT_HASH_REGEX.test(value);
}

function getSaltRounds(): number {
  const raw = process.env.USER_PASSWORD_SALT_ROUNDS;
  const parsed = Number(raw ?? 10);

  if (!Number.isInteger(parsed) || parsed < 4 || parsed > 31) {
    return 10;
  }

  return parsed;
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: false, unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: false })
  password: string;

  @Column({ type: 'boolean', nullable: false, default: false })
  admin: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (!this.password || isBcryptHash(this.password)) {
      return;
    }
    this.password = await bcrypt.hash(this.password, getSaltRounds());
  }
}
