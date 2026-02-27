import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ShipmentsService } from './shipments.service';
import { ShipmentResponseDto } from './dto/shipment-response.dto';

@ApiTags('shipments')
@Controller('accounts/:id/shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @ApiOperation({ summary: 'List shipments for an account' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: [ShipmentResponseDto] })
  @Get()
  async findByAccountId(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ShipmentResponseDto[]> {
    return this.shipmentsService.findByAccountId(id);
  }
}
