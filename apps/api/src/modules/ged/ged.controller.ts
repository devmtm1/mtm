import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { GedService } from './ged.service';
import { QueryGedDto } from './dto/query-ged.dto';

/**
 * Recherche documentaire unique. Pas de permission propre : le service ne
 * remonte que les origines dont l'utilisateur a la permission « consulter »,
 * dans le périmètre de chaque module.
 */
@ApiTags('ged')
@Controller('ged')
export class GedController {
  constructor(private readonly ged: GedService) {}

  @Get('documents')
  @Authenticated()
  rechercher(
    @Query() query: QueryGedDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ged.rechercher(query, user);
  }
}
