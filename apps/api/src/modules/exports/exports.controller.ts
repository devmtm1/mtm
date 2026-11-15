import {
  Body,
  Controller,
  HttpCode,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ExportTableauDto } from './exports.dto';
import { ExportsService } from './exports.service';

/** Export Excel ou PDF d'une liste du back-office. Le droit « exporter » de la liste est contrôlé par le service. */
@ApiTags('exports')
@Controller('exports')
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  /** Ouverte à tout utilisateur connecté : le droit « exporter » dépend de la liste, il est contrôlé par le service. */
  @Authenticated()
  @Post('tableau')
  @HttpCode(200)
  async tableau(
    @Body() dto: ExportTableauDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) reponse: Response,
  ) {
    const { contenu, nom, type } = await this.exports.exporterTableau(
      dto,
      user,
    );
    reponse.setHeader('Content-Type', type);
    reponse.setHeader('Content-Disposition', `attachment; filename="${nom}"`);
    return new StreamableFile(contenu);
  }
}
