import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { CreateProprietaireDto } from './dto/create-proprietaire.dto';
import { UpdateProprietaireDto } from './dto/update-proprietaire.dto';
import { ProprietairesService } from './proprietaires.service';

@ApiTags('proprietaires')
@Controller('proprietaires')
export class ProprietairesController {
  constructor(
    private readonly proprietaires: ProprietairesService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions('terrains:consulter')
  findAll() {
    return this.proprietaires.findAll();
  }

  @Get(':id')
  @RequirePermissions('terrains:consulter')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.proprietaires.findById(id);
  }

  @Post()
  @RequirePermissions('terrains:administrer')
  async create(
    @Body() dto: CreateProprietaireDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const proprietaire = await this.proprietaires.create(dto);
    await this.audit.record({
      userId: user.id,
      action: 'proprietaire.created',
      entityType: 'Proprietaire',
      entityId: proprietaire.id,
      newValue: {
        firstName: proprietaire.firstName,
        lastName: proprietaire.lastName,
        email: proprietaire.email,
        phone: proprietaire.phone,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return proprietaire;
  }

  @Patch(':id')
  @RequirePermissions('terrains:administrer')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProprietaireDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const before = await this.proprietaires.findById(id);
    const proprietaire = await this.proprietaires.update(id, dto);
    await this.audit.record({
      userId: user.id,
      action: 'proprietaire.updated',
      entityType: 'Proprietaire',
      entityId: id,
      oldValue: {
        firstName: before.firstName,
        lastName: before.lastName,
        email: before.email,
        phone: before.phone,
        notes: before.notes,
      },
      newValue: {
        firstName: proprietaire.firstName,
        lastName: proprietaire.lastName,
        email: proprietaire.email,
        phone: proprietaire.phone,
        notes: proprietaire.notes,
      },
      justification: 'Modification des informations du propriétaire',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return proprietaire;
  }

  @Delete(':id')
  @RequirePermissions('terrains:administrer')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const before = await this.proprietaires.findById(id);
    await this.proprietaires.remove(id);
    await this.audit.record({
      userId: user.id,
      action: 'proprietaire.deleted',
      entityType: 'Proprietaire',
      entityId: id,
      oldValue: {
        firstName: before.firstName,
        lastName: before.lastName,
        email: before.email,
      },
      justification: 'Suppression du propriétaire',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }
}
