import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShipmentResponseDto {
  @ApiProperty({ example: '8c7d2c64-9b16-4f2f-9c7a-3b1f7c7b0b6a' })
  id: string;

  @ApiProperty({ example: '4f2c1d88-4c5f-4e6d-9f5c-1f0b6b7f8b9a' })
  accountId: string;

  @ApiProperty({ example: 'EXT-12345' })
  externalId: string;

  @ApiProperty({ example: 'finished' })
  status: string;

  @ApiPropertyOptional({ example: 'INV-98765' })
  invoiceCode?: string | null;

  @ApiProperty({ example: 'Sao Paulo' })
  origin: string;

  @ApiProperty({ example: 'Rio de Janeiro' })
  destination: string;

  @ApiProperty({ example: 1200.5 })
  value: number;

  @ApiPropertyOptional({ example: '2024-06-01T12:34:56.000Z' })
  startedAt?: Date | null;

  @ApiProperty({ example: '15/06/2024' })
  deliveryEstimate: string;

  @ApiPropertyOptional({ example: 'Correios' })
  carrier?: string | null;

  @ApiPropertyOptional({ example: '2024-06-15T00:00:00.000Z' })
  deliveryEstimateDate?: Date | null;

  @ApiProperty({ example: '2024-06-01T12:34:56.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-06-02T08:22:10.000Z' })
  updatedAt: Date;
}
