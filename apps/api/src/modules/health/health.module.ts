import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService, CloudinaryService],
})
export class HealthModule {}
