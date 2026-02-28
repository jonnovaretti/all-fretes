import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SyncJobResponseDto } from './dto/sync-job-response.dto';
import { ShipmentSyncService } from './shipment-sync.service';
import { TrackingSyncService } from './tracking-sync.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('sync')
@ApiBearerAuth()
@Controller('accounts/:id/sync')
export class SyncController {
  constructor(
    private readonly syncService: ShipmentSyncService,
    private readonly trackingSyncService: TrackingSyncService,
  ) {}

  @ApiOperation({ summary: 'Enqueue shipment sync for an account' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SyncJobResponseDto })
  @UseGuards(JwtAuthGuard)
  @Post('shipment')
  async sync(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SyncJobResponseDto> {
    return this.syncService.enqueue(id);
  }

  @ApiOperation({ summary: 'Enqueue tracking sync for an account' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SyncJobResponseDto })
  @UseGuards(JwtAuthGuard)
  @Post('tracking')
  async syncTracking(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SyncJobResponseDto> {
    return this.trackingSyncService.enqueue(id);
  }
}
