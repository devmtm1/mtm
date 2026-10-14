import { Module } from '@nestjs/common';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';

/** Ce qui attend chacun, pour les pastilles du menu du back-office. */
@Module({
  controllers: [NavigationController],
  providers: [NavigationService],
})
export class NavigationModule {}
