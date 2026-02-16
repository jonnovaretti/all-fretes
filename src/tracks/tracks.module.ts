import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from './track.entity';
import { TracksService } from './tracks.service';
import { TracksController } from './tracks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Track])],
  providers: [TracksService],
  exports: [TracksService],
  controllers: [TracksController]
})
export class TracksModule {}
