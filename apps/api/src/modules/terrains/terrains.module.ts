import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TerrainsController } from './terrains.controller';
import { TerrainsService } from './terrains.service';

@Module({
  imports: [AuditModule],
  controllers: [TerrainsController],
  providers: [TerrainsService],
  exports: [TerrainsService],
})
export class TerrainsModule {}
