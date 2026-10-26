import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { ImmeublesService } from './immeubles.service';
import {
  AjouterLogementsDto,
  CreateImmeubleDto,
  QueryImmeubleDto,
  TYPES_IMMEUBLE,
  UpdateImmeubleDto,
} from './dto/immeuble.dto';

/**
 * Propriétés (villa divisée, immeuble, résidence) et leurs logements.
 * Les routes littérales (`options`) précèdent celles à paramètre.
 */
@ApiTags('locatif')
@Controller('locatif/immeubles')
export class ImmeublesController {
  constructor(
    private readonly immeubles: ImmeublesService,
    private readonly audit: AuditService,
  ) {}

  /** Natures proposées dans le formulaire. */
  @Get('options')
  @RequirePermissions('locatif:consulter')
  options() {
    return { types: [...TYPES_IMMEUBLE] };
  }

  @Get()
  @RequirePermissions('locatif:consulter')
  findAll(
    @Query() query: QueryImmeubleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.immeubles.findAll(query, user);
  }

  @Get(':id')
  @RequirePermissions('locatif:consulter')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.immeubles.findOne(id, user);
  }

  @Post()
  @RequirePermissions('locatif:creer')
  async create(
    @Body() dto: CreateImmeubleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const immeuble = await this.immeubles.create(dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'immeuble.created',
      entityType: 'ImmeubleLocatif',
      entityId: immeuble.id,
      newValue: {
        reference: immeuble.referenceInterne,
        nom: immeuble.nom,
        logements: dto.logements?.length ?? 0,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return immeuble;
  }

  @Patch(':id')
  @RequirePermissions('locatif:modifier')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateImmeubleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const immeuble = await this.immeubles.update(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'immeuble.updated',
      entityType: 'ImmeubleLocatif',
      entityId: id,
      newValue: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return immeuble;
  }

  @Post(':id/logements')
  @RequirePermissions('locatif:creer')
  async ajouterLogements(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AjouterLogementsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const logements = await this.immeubles.ajouterLogements(
      id,
      dto.logements,
      user,
    );
    await this.audit.record({
      userId: user.id,
      action: 'immeuble.logements_added',
      entityType: 'ImmeubleLocatif',
      entityId: id,
      newValue: {
        logements: logements.map((logement) => logement.referenceInterne),
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return logements;
  }
}
