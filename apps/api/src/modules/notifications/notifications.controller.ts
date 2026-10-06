import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

/** Chaque utilisateur ne voit et ne modifie que ses propres notifications. */
@ApiTags('notifications')
@Controller('notifications')
@Authenticated()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

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
