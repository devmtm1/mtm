import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { MAX_ASSET_SIZE } from '../../common/storage/asset-validation';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import {
  AutoriserReversementDto,
  CreateReversementDto,
  ModeReversementDto,
  MotifDto,
  PayerDto,
  QueryReversementsDto,
  QuerySituationsDto,
} from './dto/tresorerie.dto';
import { ReversementsService } from './reversements.service';

/**
 * Terrains confiés : ce que MTM a encaissé, sa commission, ce qu'elle doit au
 * propriétaire, et les reversements (demande, autorisation, paiement avec preuve).
 */
@ApiTags('finances')
@Controller('finances')
export class ReversementsController {
  constructor(
    private readonly reversements: ReversementsService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get('proprietaires/situation')
  @RequirePermissions('finances:consulter')
  situations(@Query() query: QuerySituationsDto) {
    return this.reversements.situations(query);
  }

  /** Le mode de reversement est une clause du contrat de commercialisation (mandat). */
  @Patch('mandats/:id/mode-reversement')
  @RequirePermissions('finances:administrer')
  async modeReversement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModeReversementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const mandat = await this.prisma.mandat.findUnique({
      where: { id },
      select: { id: true, modeReversement: true, referenceInterne: true },
    });
    if (!mandat) throw new NotFoundException('Mandat introuvable');
    const misAJour = await this.prisma.mandat.update({
      where: { id },
      data: { modeReversement: dto.modeReversement },
      select: { id: true, referenceInterne: true, modeReversement: true },
    });
    await this.audit.record({
      userId: user.id,
      action: 'finances.mode_reversement_modifie',
      entityType: 'Mandat',
      entityId: id,
      oldValue: { modeReversement: mandat.modeReversement },
      newValue: { modeReversement: dto.modeReversement },
    });
    return misAJour;
  }

  @Get('reversements')
  @RequirePermissions('finances:consulter')
  lister(@Query() query: QueryReversementsDto) {
    return this.reversements.lister(query);
  }

  @Post('reversements')
  @RequirePermissions('finances:creer')
  async creer(
    @Body() dto: CreateReversementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const reversement = await this.reversements.creer(dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'finances.reversement_demande',
      entityType: 'ReversementProprietaire',
      entityId: reversement.id,
      newValue: {
        montant: reversement.montant,
        type: reversement.type,
        dossierVenteId: dto.dossierVenteId,
      },
      justification: dto.motif,
    });
    return reversement;
  }

  /** La Direction (ou un délégué) autorise ; le contrôle du pouvoir est dans le service. */
  @Post('reversements/:id/autoriser')
  @RequirePermissions('finances:consulter')
  async autoriser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AutoriserReversementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const reversement = await this.reversements.autoriser(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action:
        reversement.type === 'avance'
          ? 'finances.avance_proprietaire_autorisee'
          : 'finances.reversement_autorise',
      entityType: 'ReversementProprietaire',
      entityId: id,
      newValue: { montant: reversement.montant, type: reversement.type },
      justification: dto.motif,
    });
    return reversement;
  }

  @Post('reversements/:id/rejeter')
  @RequirePermissions('finances:valider')
  async rejeter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MotifDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const reversement = await this.reversements.rejeter(id, dto.motif, user);
    await this.audit.record({
      userId: user.id,
      action: 'finances.reversement_rejete',
      entityType: 'ReversementProprietaire',
      entityId: id,
      justification: dto.motif,
    });
    return reversement;
  }

  @Post('reversements/:id/payer')
  @RequirePermissions('finances:payer')
  async payer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const reversement = await this.reversements.payer(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'finances.reversement_paye',
      entityType: 'ReversementProprietaire',
      entityId: id,
      newValue: {
        montant: reversement.montant,
        mode: dto.modePaiement,
        reference: dto.reference,
        datePaiement: dto.datePaiement,
      },
    });
    return reversement;
  }

  @Post('reversements/:id/justificatif')
  @RequirePermissions('finances:payer')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  joindre(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.reversements.joindreJustificatif(id, file);
  }
}
