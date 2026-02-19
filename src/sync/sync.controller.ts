import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ShipmentSyncService } from './shipment-sync.service';
import { TrackingSyncService } from './tracking-sync.service';

@Controller('accounts/:id/sync')
export class SyncController {
  constructor(
    private readonly syncService: ShipmentSyncService,
    private readonly trackingSyncService: TrackingSyncService
  ) {}

  @Post()
  sync(@Param('id', ParseUUIDPipe) id: string) {
    return this.syncService.enqueue(id);
  }

  @Post('tracking')
  syncTracking(@Param('id', ParseUUIDPipe) id: string) {
    return this.trackingSyncService.enqueue(id);
  }
}
