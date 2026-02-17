import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './account.entity';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { ShipmentsModule } from '../shipments/shipments.module';

@Module({
  imports: [TypeOrmModule.forFeature([Account]), ShipmentsModule],
  providers: [AccountsService],
  exports: [AccountsService],
  controllers: [AccountsController]
})
export class AccountsModule {}
