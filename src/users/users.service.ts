import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './user.entity';

type UserResponse = Pick<User, 'id' | 'name' | 'email' | 'admin' | 'createdAt'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    try {
      const user = this.usersRepository.create(createUserDto);
      const saved = await this.usersRepository.save(user);
      return this.withoutPassword(saved);
    } catch (error) {
      if (this.isDuplicateEmailError(error)) {
        throw new ConflictException('Email already exists');
      }

      throw error;
    }
  }

  private withoutPassword(user: User): UserResponse {
    const { id, name, email, admin, createdAt } = user;
    return { id, name, email, admin, createdAt };
  }

  private isDuplicateEmailError(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      typeof (error as QueryFailedError & { code?: string }).code ===
        'string' &&
      (error as QueryFailedError & { code: string }).code === '23505'
    );
  }
}
