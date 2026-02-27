import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ShipmentResponseDto } from './dto/shipment-response.dto';
import { FindShipmentsQueryDto } from './dto/find-shipments-query.dto';
import { ShipmentsService } from './shipments.service';

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
    @Query() query: FindShipmentsQueryDto,
  ): Promise<ShipmentResponseDto[]> {
    return this.shipmentsService.findByAccountId(id, query);
  }
}
