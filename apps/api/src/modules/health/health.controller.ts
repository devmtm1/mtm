import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Contrôle complet : base, stockage, authentification, e-mail. À consulter
   * à la main ou depuis la supervision, pas à fréquence rapprochée : il
   * interroge la base et la tient donc éveillée.
   */
  @Public()
  @Get()
  check(): ReturnType<HealthService['check']> {
    return this.healthService.check();
  }

  /**
   * Le processus répond : rien d'autre. C'est l'adresse du contrôle de santé
   * de l'hébergeur, appelée en continu. Sans accès à la base, elle laisse
   * celle-ci s'endormir quand personne ne visite le site.
   */
  @Public()
  @Get('live')
  live(): ReturnType<HealthService['live']> {
    return this.healthService.live();
  }
}
