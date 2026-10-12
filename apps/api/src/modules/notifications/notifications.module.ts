import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { CanalExterneService } from './canal-externe.service';
import { NotificationReglesService } from './notification-regles.service';
import { AuditModule } from '../audit/audit.module';

/** Global : tous les modules métier émettent des notifications. */
@Global()
@Module({
  imports: [AuditModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    CanalExterneService,
    NotificationReglesService,
  ],
  exports: [NotificationsService, CanalExterneService],
})
export class NotificationsModule {}
