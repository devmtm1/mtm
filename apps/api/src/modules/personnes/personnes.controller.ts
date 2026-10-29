import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { QueryPersonnesDto } from './dto/query-personnes.dto';
import { PersonnesService } from './personnes.service';

@ApiTags('personnes')
@Controller('personnes')
export class PersonnesController {
  constructor(private readonly personnes: PersonnesService) {}

  /**
   * Répertoire des personnes. Ouvert à tout utilisateur du back-office : chaque source (prospects, propriétaires,
   * locataires) n'est lue que si ses permissions le permettent.
   */
  @Authenticated()
  @Get()
  rechercher(
    @Query() query: QueryPersonnesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.personnes.rechercher(query, user);
  }
}
