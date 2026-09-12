import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { InternalNotificationService } from './internal-notification.service';

/** Global : l'envoi d'e-mails est transversal (auth, contact, ventes, santé). */
@Global()
@Module({
  providers: [MailService, InternalNotificationService],
  exports: [MailService, InternalNotificationService],
})
export class MailModule {}
