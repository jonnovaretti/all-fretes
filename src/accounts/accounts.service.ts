import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAccountDto } from './dto/create-account.dto';
import { Account } from './account.entity';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountsRepository: Repository<Account>,
  ) {}

  async create(
    createAccountDto: CreateAccountDto,
  ): Promise<Omit<Account, 'password'>> {
    const account = this.accountsRepository.create({
      ...createAccountDto,
      baseUrl: createAccountDto.baseUrl ?? 'http://localhost:3000/mock/login',
    });

    const saved = await this.accountsRepository.save(account);
    return this.withoutPassword(saved);
  }

  async findAll(): Promise<Pick<Account, 'id' | 'name' | 'username'>[]> {
    return this.accountsRepository.find({
      select: ['id', 'name', 'username'],
    });
  }

  async findOneOrFail(id: string): Promise<Account> {
    const account = await this.accountsRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Account ${id} not found`);
    }

    return account;
  }

  async findOne(id: string): Promise<Omit<Account, 'password'>> {
    const account = await this.findOneOrFail(id);
    return this.withoutPassword(account);
  }

  private withoutPassword(account: Account): Omit<Account, 'password'> {
    const { id, name, baseUrl, username, createdAt, updatedAt, shipments } =
      account;
    return { id, name, baseUrl, username, createdAt, updatedAt, shipments };
  }
}
