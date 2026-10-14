import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NavigationService } from './navigation.service';

/** Pastilles du menu : ouvertes à tout collaborateur connecté, filtrées par ses droits. */
@ApiTags('navigation')
@Controller('navigation')
@Authenticated()
export class NavigationController {
  constructor(private readonly navigation: NavigationService) {}

  @Get('compteurs')
  compteurs(@CurrentUser() user: AuthenticatedUser) {
    return this.navigation.compteurs(user);
  }
}
