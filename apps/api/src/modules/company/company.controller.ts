import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Post,
  Put,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { MAX_ASSET_SIZE } from '../../common/storage/asset-validation';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { CompanyProfileService } from './company-profile.service';
import { ProfilEntrepriseDto } from './dto/profil-entreprise.dto';
import { renderApercuEntreprise } from './apercu-renderer';

/**
 * Identité de l'entreprise sur les documents générés : logo, NINEA, RCCM,
 * forme juridique, capital, coordonnées. Se lit avec « settings:consulter » et
 * se modifie avec « settings:modifier », comme les autres paramètres.
 */
@ApiTags('entreprise')
@Controller('entreprise')
export class CompanyController {
  constructor(
    private readonly profil: CompanyProfileService,
    private readonly audit: AuditService,
  ) {}

  @Get('profil')
  @RequirePermissions('settings:consulter')
  getProfil() {
    return this.profil.getProfil();
  }

  @Put('profil')
  @RequirePermissions('settings:modifier')
  async enregistrer(
    @Body() dto: ProfilEntrepriseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resultat = await this.profil.enregistrer(dto, user.id);
    await this.audit.record({
      userId: user.id,
      action: 'entreprise.profil.modifie',
      entityType: 'SystemSetting',
      entityId: 'entreprise',
      newValue: dto,
    });
    return resultat;
  }

  @Post('logo')
  @RequirePermissions('settings:modifier')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  async changerLogo(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resultat = await this.profil.changerLogo(file, user.id);
    await this.audit.record({
      userId: user.id,
      action: 'entreprise.logo.modifie',
      entityType: 'SystemSetting',
      entityId: 'entreprise.logo',
    });
    return resultat;
  }

  @Delete('logo')
  @RequirePermissions('settings:modifier')
  async retirerLogo(@CurrentUser() user: AuthenticatedUser) {
    const resultat = await this.profil.retirerLogo(user.id);
    await this.audit.record({
      userId: user.id,
      action: 'entreprise.logo.retire',
      entityType: 'SystemSetting',
      entityId: 'entreprise.logo',
    });
    return resultat;
  }

  /** PDF d'essai avec l'en-tête et le pied de page actuels. */
  @Get('apercu')
  @RequirePermissions('settings:consulter')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'inline; filename="apercu-documents.pdf"')
  async apercu() {
    return new StreamableFile(
      renderApercuEntreprise(await this.profil.getSociete()),
    );
  }
}
