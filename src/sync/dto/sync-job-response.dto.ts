import { ApiProperty } from '@nestjs/swagger';

export class SyncJobResponseDto {
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'number' }],
    example: '12345',
  })
  jobId?: string | number;
}
