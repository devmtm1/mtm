import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RecusClientService } from './recus-client.service';

/** Reçus de paiement téléchargeables par le client connecté ; le service vérifie que le paiement est bien le sien. */
@ApiTags('exports')
@Controller('client/recus')
export class RecusClientController {
  constructor(private readonly recus: RecusClientService) {}

  @Authenticated()
  @Get('vente/:paiementId')
  async vente(
    @Param('paiementId', ParseUUIDPipe) paiementId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) reponse: Response,
  ) {
    return this.envoyer(
      await this.recus.recuVente(user.id, paiementId),
      reponse,
    );
  }

  @Authenticated()
  @Get('loyer/:paiementId')
  async loyer(
    @Param('paiementId', ParseUUIDPipe) paiementId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) reponse: Response,
  ) {
    return this.envoyer(
      await this.recus.recuLoyer(user.id, paiementId),
      reponse,
    );
  }

  private envoyer(contenu: Buffer, reponse: Response): StreamableFile {
    reponse.setHeader('Content-Type', 'application/pdf');
    reponse.setHeader(
      'Content-Disposition',
      'attachment; filename="recu-de-paiement.pdf"',
    );
    return new StreamableFile(contenu);
  }
}
