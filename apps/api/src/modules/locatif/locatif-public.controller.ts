import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PublicCache } from '../../common/http/public-cache.decorator';
import { LocatifPublicService } from './locatif-public.service';
import { QueryLocationPublicDto } from './dto/annonce.dto';
import { SejoursService } from './sejours.service';
import { DemandeSejourPublicDto } from './dto/sejour.dto';

/**
 * Annonces de location du site public. Lecture seule, sans session : mêmes
 * règles que le catalogue des terrains (cache court, liste blanche de champs).
 * Les routes littérales sont déclarées avant celle à paramètre.
 */
@ApiTags('locations')
@Controller('locatif/public')
export class LocatifPublicController {
  constructor(
    private readonly publicLocations: LocatifPublicService,
    private readonly sejours: SejoursService,
  ) {}

  @Public()
  @PublicCache()
  @Get('biens')
  findPublic(@Query() query: QueryLocationPublicDto) {
    return this.publicLocations.findPublic(query);
  }

  @Public()
  @PublicCache()
  @Get('biens/options')
  getOptions() {
    return this.publicLocations.getPublicFilterOptions();
  }

  @Public()
  @PublicCache()
  @Get('biens/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.publicLocations.findPublicOne(id);
  }

  /** Nuits déjà prises d'un bien loué à la nuit : le voyageur choisit des dates libres. */
  @Public()
  @PublicCache()
  @Get('biens/:id/disponibilites')
  getDisponibilites(@Param('id', ParseUUIDPipe) id: string) {
    return this.sejours.disponibilites(id);
  }

  /**
   * Demande de séjour d'un visiteur : sans compte, sans paiement. MTM la
   * confirme ensuite. Même limite de débit que les autres formulaires publics.
   */
  @Public()
  @Throttle({
    default: {
      limit: Number.parseInt(process.env.CONTACT_RATE_LIMIT_MAX ?? '5', 10),
      ttl:
        Number.parseInt(process.env.CONTACT_RATE_LIMIT_TTL ?? '60', 10) * 1000,
    },
  })
  @Post('biens/:id/sejours/demande')
  demanderSejour(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DemandeSejourPublicDto,
  ) {
    return this.sejours.demandePublique(id, dto);
  }
}
