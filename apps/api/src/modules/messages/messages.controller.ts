import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CreateMessageClientDto, CreateMessageDto } from './dto/message.dto';
import { MessagesService } from './messages.service';

/** Fil de discussion du client sur ses propres dossiers (espace client). */
@ApiTags('messages')
@Controller('messages/client')
@Authenticated()
export class MessagesClientController {
  constructor(private readonly messages: MessagesService) {}

  @Get(':entityType/:entityId')
  lister(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messages.listerClient(entityType, entityId, user.id);
  }

  @Post(':entityType/:entityId')
  poster(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() dto: CreateMessageClientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messages.posterClient(entityType, entityId, dto.corps, user.id);
  }
}

/** Fil de discussion d'un dossier côté MTM : mêmes droits que le dossier lui-même. */
@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get(':entityType/:entityId')
  @RequirePermissions('messages:consulter')
  lister(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messages.lister(entityType, entityId, user);
  }

  @Post(':entityType/:entityId')
  @RequirePermissions('messages:creer')
  poster(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messages.poster(
      entityType,
      entityId,
      dto.corps,
      dto.visibleClient ?? false,
      user,
    );
  }
}
