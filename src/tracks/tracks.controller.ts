import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { TracksService } from './tracks.service';

@Controller('accounts/:id/tracks')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Get()
  findByAccountId(@Param('id', ParseUUIDPipe) id: string) {
    return this.tracksService.findByAccountId(id);
  }
}
