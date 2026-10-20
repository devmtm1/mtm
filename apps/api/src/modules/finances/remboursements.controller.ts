import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { MAX_ASSET_SIZE } from '../../common/storage/asset-validation';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import {
  CreateRemboursementDto,
  DecisionRemboursementDto,
  PayerDto,
} from './dto/tresorerie.dto';
import { RemboursementsService } from './remboursements.service';

class QueryRemboursementsDto {
  @IsOptional()
  @IsIn(['demandee', 'acceptee', 'refusee', 'payee'])
  statut?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;
}

class QuerySimulationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  avance?: number;

  @IsOptional()
  @IsDateString()
  dateDemande?: string;
}

/**
 * Désistement et remboursement d'un client : demande, vérification du montant
 * réellement encaissé, décision de la Direction, paiement avec preuve.
 */
@ApiTags('finances')
@Controller('finances/remboursements')
export class RemboursementsController {
  constructor(
    private readonly remboursements: RemboursementsService,
    private readonly audit: AuditService,
  ) {}

  @Get('regles')
  @RequirePermissions('finances:consulter')
  regles() {
    return this.remboursements.regles();
  }

  @Get('simulation/:dossierVenteId')
  @RequirePermissions('finances:consulter')
  simuler(
    @Param('dossierVenteId', ParseUUIDPipe) dossierVenteId: string,
    @Query() query: QuerySimulationDto,
  ) {
    return this.remboursements.simuler(
      dossierVenteId,
      query.avance,
      query.dateDemande,
    );
  }

  @Get()
  @RequirePermissions('finances:consulter')
  lister(@Query() query: QueryRemboursementsDto) {
    return this.remboursements.lister(query);
  }

  @Post()
  @RequirePermissions('finances:creer')
  async creer(
    @Body() dto: CreateRemboursementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const demande = await this.remboursements.creer(dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'finances.remboursement_demande',
      entityType: 'DemandeRemboursement',
      entityId: demande.id,
      newValue: {
        montantVerse: demande.montantVerse,
        montantRetenu: demande.montantRetenu,
        montantRembourse: demande.montantRembourse,
        regleValidee: demande.regleValidee,
      },
      justification: dto.motif,
    });
    return demande;
  }

  @Post(':id/decision')
  @RequirePermissions('finances:consulter')
  async decider(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecisionRemboursementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const demande = await this.remboursements.decider(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'finances.remboursement_decide',
      entityType: 'DemandeRemboursement',
      entityId: id,
      newValue: { decision: dto.decision, montant: demande.montantRembourse },
      justification: dto.motif,
    });
    return demande;
  }

  @Post(':id/payer')
  @RequirePermissions('finances:payer')
  async payer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const demande = await this.remboursements.payer(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'finances.remboursement_paye',
      entityType: 'DemandeRemboursement',
      entityId: id,
      newValue: {
        montant: demande.montantRembourse,
        mode: dto.modePaiement,
        reference: dto.reference,
      },
    });
    return demande;
  }

  @Post(':id/justificatif')
  @RequirePermissions('finances:payer')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  joindre(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.remboursements.joindreJustificatif(id, file);
  }
}
