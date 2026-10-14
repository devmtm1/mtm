import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationReglesService } from './notification-regles.service';
import { PreferencesNotificationDto } from './dto/preferences-notification.dto';
import { ReglesNotificationDto } from './dto/regles-notification.dto';

/** Chaque utilisateur ne voit et ne modifie que ses propres notifications. */
@ApiTags('notifications')
@Controller('notifications')
@Authenticated()
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly regles: NotificationReglesService,
    private readonly audit: AuditService,
  ) {}

  /** Préférences personnelles : canaux et numéro de téléphone de la personne connectée. */
  @Get('preferences')
  preferences(@CurrentUser() user: AuthenticatedUser) {
    return this.regles.preferences(user.id);
  }

  @Put('preferences')
  enregistrerPreferences(
    @Body() dto: PreferencesNotificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.regles.enregistrerPreferences(user.id, dto);
  }

  /** Catalogue des événements et leurs règles : réservé à qui administre les notifications. */
  @Get('regles')
  @RequirePermissions('notifications:administrer')
  catalogue() {
    return this.regles.catalogue();
  }

  @Put('regles')
  @RequirePermissions('notifications:administrer')
  async enregistrerRegles(
    @Body() dto: ReglesNotificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resultat = await this.regles.enregistrer(dto.regles, user.id);
    await this.audit.record({
      userId: user.id,
      action: 'notifications.regles_modifiees',
      entityType: 'SystemSetting',
      entityId: 'notifications.regles',
      newValue: dto.regles,
    });
    return resultat;
  }

  @Get()
  lister(
    @Query() query: QueryNotificationsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notifications.lister(user.id, {
      nonLuesSeulement: query.nonLues,
      limite: query.limite,
    });
  }

  @Post('read-all')
  toutMarquerLu(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.toutMarquerLu(user.id);
  }

  @Post(':id/read')
  marquerLue(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notifications.marquerLue(user.id, id);
  }
}
