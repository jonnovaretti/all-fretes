import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('accounts/:id/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  sync(@Param('id', ParseUUIDPipe) id: string) {
    return this.syncService.enqueue(id);
  }
}
