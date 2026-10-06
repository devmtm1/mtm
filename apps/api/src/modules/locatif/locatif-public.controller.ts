import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PublicCache } from '../../common/http/public-cache.decorator';
import { LocatifPublicService } from './locatif-public.service';
import { QueryLocationPublicDto } from './dto/annonce.dto';

/**
 * Annonces de location du site public. Lecture seule, sans session : mêmes
 * règles que le catalogue des terrains (cache court, liste blanche de champs).
 * Les routes littérales sont déclarées avant celle à paramètre.
 */
@ApiTags('locations')
@Controller('locatif/public')
export class LocatifPublicController {
  constructor(private readonly publicLocations: LocatifPublicService) {}

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
}
