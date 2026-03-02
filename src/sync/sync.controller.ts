import {
  Controller,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SyncJobResponseDto } from './dto/sync-job-response.dto';
import { ConsolidatedStatusSyncService } from './consolidated-status-sync.service';
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
    private readonly consolidatedStatusSyncService: ConsolidatedStatusSyncService,
  ) {}

  @ApiOperation({ summary: 'Enqueue shipment sync for an account' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SyncJobResponseDto })
  @Post('shipment')
  async sync(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SyncJobResponseDto> {
    return this.syncService.enqueue(id);
  }

  @ApiOperation({ summary: 'Enqueue tracking sync for an account' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SyncJobResponseDto })
  @Post('tracking')
  async syncTracking(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SyncJobResponseDto> {
    return this.trackingSyncService.enqueue(id);
  }

  @ApiOperation({ summary: 'Enqueue consolidated status sync for an account' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SyncJobResponseDto })
  @UseGuards(JwtAuthGuard)
  @Post('consolidated-status')
  async syncConsolidatedStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('forceAllAccounts', ParseBoolPipe) forceAllAccounts: boolean,
  ): Promise<SyncJobResponseDto> {
    console.log('forceeeee', forceAllAccounts);
    return this.consolidatedStatusSyncService.enqueue(id, forceAllAccounts);
  }
}
