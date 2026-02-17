import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ShipmentSyncService } from './shipment-sync.service';

@Controller('accounts/:id/sync')
export class SyncController {
  constructor(private readonly syncService: ShipmentSyncService) {}

  @Post()
  sync(@Param('id', ParseUUIDPipe) id: string) {
    return this.syncService.enqueue(id);
  }
}
