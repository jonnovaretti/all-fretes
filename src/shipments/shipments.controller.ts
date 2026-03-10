import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ShipmentResponseDto } from './dto/shipment-response.dto';
import { FindShipmentsQueryDto } from './dto/find-shipments-query.dto';
import { UpdateCheckedDto } from './dto/update-checked.dto';
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

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update checked status of a shipment' })
  @ApiParam({ name: 'shipmentId', format: 'uuid' })
  @ApiNoContentResponse()
  @HttpCode(204)
  @Patch(':shipmentId/checked')
  async updateChecked(
    @Param('shipmentId', ParseUUIDPipe) shipmentId: string,
    @Body() body: UpdateCheckedDto,
  ): Promise<void> {
    await this.shipmentsService.updateChecked(shipmentId, body.checked);
  }
}
