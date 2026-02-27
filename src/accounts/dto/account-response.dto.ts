import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentResponseDto } from '../../shipments/dto/shipment-response.dto';

export class AccountResponseDto {
  @ApiProperty({ example: '8c7d2c64-9b16-4f2f-9c7a-3b1f7c7b0b6a' })
  id: string;

  @ApiProperty({ example: 'Main Account' })
  name: string;

  @ApiProperty({ example: 'http://localhost:3000/mock/login' })
  baseUrl: string;

  @ApiProperty({ example: 'gofrete-user' })
  username: string;

  @ApiPropertyOptional({ type: [ShipmentResponseDto] })
  shipments?: ShipmentResponseDto[];

  @ApiProperty({ example: '2024-06-01T12:34:56.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-06-02T08:22:10.000Z' })
  updatedAt: Date;
}
