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
import { LocatairesService } from './locataires.service';
import { CreateLocataireDto, UpdateLocataireDto } from './dto/locataire.dto';
import { CreateClientAccountDto } from '../client-accounts/dto/create-client-account.dto';

/** Fiches locataires (J2.1) : nécessaires pour créer un bail. */
@ApiTags('locatif')
@Controller('locatif/locataires')
export class LocatairesController {
  constructor(
    private readonly locataires: LocatairesService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions('locatif:consulter')
  findAll(@Query('search') search?: string) {
    return this.locataires.findAll(search);
  }

  @Get(':id')
  @RequirePermissions('locatif:consulter')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.locataires.findById(id);
  }

  @Get(':id/baux')
  @RequirePermissions('locatif:consulter')
  findBaux(@Param('id', ParseUUIDPipe) id: string) {
    return this.locataires.findBaux(id);
  }

  @Post()
  @RequirePermissions('locatif:creer')
  create(@Body() dto: CreateLocataireDto) {
    return this.locataires.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('locatif:modifier')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocataireDto,
  ) {
    return this.locataires.update(id, dto);
  }

  @Post(':id/compte-client')
  @RequirePermissions('clients:creer')
  async createClientAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateClientAccountDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const account = await this.locataires.createClientAccount(id, dto.password);
    await this.audit.record({
      userId: user.id,
      action: 'locataire.client_account_created',
      entityType: 'Locataire',
      entityId: id,
      newValue: { email: account.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return account;
  }
}
