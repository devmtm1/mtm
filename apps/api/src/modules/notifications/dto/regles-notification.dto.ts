import { IsObject } from 'class-validator';

/** { événement: { actif, permission, email, sms, whatsapp } } — le détail est contrôlé par le service. */
export class ReglesNotificationDto {
  @IsObject()
  regles!: Record<string, unknown>;
}
