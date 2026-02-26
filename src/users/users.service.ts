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
    const saved = await this.createUser(createUserDto);
    return this.toUserResponse(saved);
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    try {
      const user = this.usersRepository.create(createUserDto);
      return await this.usersRepository.save(user);
    } catch (error) {
      if (this.isDuplicateEmailError(error)) {
        throw new ConflictException('Email already exists');
      }

      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.usersRepository.update(
      { id: userId },
      { refreshTokenHash },
    );
  }

  toUserResponse(user: User): UserResponse {
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
