import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { ShipmentResponseDto } from './dto/shipment-response.dto';
import { FindShipmentsQueryDto } from './dto/find-shipments-query.dto';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('shipments')
@ApiBearerAuth()
@Controller('accounts/:id/shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @UseGuards(JwtAuthGuard)
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
