import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { CloudinaryService } from './cloudinary.service';

/**
 * Point d'entrée des liens de documents privés produits par
 * `CloudinaryService.url()` : vérifie la signature et la date d'expiration,
 * puis redirige vers un téléchargement Cloudinary de courte durée. Public
 * car ouvert dans un nouvel onglet (sans en-tête d'authentification) ; la
 * signature HMAC tient lieu d'autorisation.
 */
@ApiExcludeController()
@Controller('files')
export class FilesController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Public()
  @Get('private')
  async privateFile(
    @Query('key') key: string | undefined,
    @Query('rt') resourceType: string | undefined,
    @Query('exp') exp: string | undefined,
    @Query('sig') sig: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const expires = Number(exp);
    if (!key || !resourceType || !sig || !Number.isFinite(expires)) {
      throw new BadRequestException('Lien de document incomplet');
    }
    const target = await this.cloudinary.resolvePrivateLink(
      key,
      resourceType,
      expires,
      sig,
    );
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, target);
  }
}
