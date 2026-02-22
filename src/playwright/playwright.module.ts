import { Module } from '@nestjs/common';
import { GoFreteNavigatorService } from './gofrete-navigator.service';

@Module({
  providers: [GoFreteNavigatorService],
  exports: [GoFreteNavigatorService],
})
export class PlaywrightModule {}
