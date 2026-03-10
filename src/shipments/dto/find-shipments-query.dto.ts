import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ConsolidatedShipmentStatus } from '../shipment.entity';

export enum ShipmentOrderBy {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class FindShipmentsQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalItems?: number = 10;

  @ApiPropertyOptional({ enum: ShipmentOrderBy, default: ShipmentOrderBy.DESC })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(ShipmentOrderBy)
  orderBy?: ShipmentOrderBy = ShipmentOrderBy.DESC;

  @ApiPropertyOptional({ example: 'EXT-12345' })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({ example: 'INV-98765' })
  @IsOptional()
  @IsString()
  invoiceCode?: string;

  @ApiPropertyOptional({ example: 'finished' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'Objeto em transporte' })
  @IsOptional()
  @IsString()
  carrierStatus?: string;

  @ApiPropertyOptional({ enum: ConsolidatedShipmentStatus })
  @IsOptional()
  @IsEnum(ConsolidatedShipmentStatus)
  consolidatedStatus?: ConsolidatedShipmentStatus;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  checked?: boolean = false;
}
