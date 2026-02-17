import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shipment } from './shipment.entity';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Shipment])],
  providers: [ShipmentsService],
  exports: [ShipmentsService],
  controllers: [ShipmentsController]
})
export class ShipmentsModule {}
