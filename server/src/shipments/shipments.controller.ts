import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';

@Controller('accounts/:id/shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get()
  findByAccountId(@Param('id', ParseUUIDPipe) id: string) {
    return this.shipmentsService.findByAccountId(id);
  }
}
