import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingsService } from './settings.service';

const ADMINISTER_PERMISSION = 'settings:administrer';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermissions('settings:consulter')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    const canViewSensitive = user.permissions.includes(ADMINISTER_PERMISSION);
    return this.settingsService.findAll(canViewSensitive);
  }

  @Get(':key')
  @RequirePermissions('settings:consulter')
  findOne(@Param('key') key: string, @CurrentUser() user: AuthenticatedUser) {
    const canViewSensitive = user.permissions.includes(ADMINISTER_PERMISSION);
    return this.settingsService.findByKey(key, canViewSensitive);
  }

  @Post()
  @RequirePermissions('settings:creer')
  async create(
    @Body() dto: CreateSettingDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    // Créer un paramètre marqué sensible nécessite explicitement la
    // permission renforcée (section 25 du CDC : "permissions renforcées").
    if (dto.isSensitive && !user.permissions.includes(ADMINISTER_PERMISSION)) {
      throw new ForbiddenException(
        'La création d’un paramètre sensible nécessite la permission settings:administrer',
      );
    }

    const setting = await this.settingsService.create(dto, user.id);
    await this.auditService.record({
      userId: user.id,
      action: 'setting.created',
      entityType: 'SystemSetting',
      entityId: setting.id,
      newValue: { key: dto.key, isSensitive: dto.isSensitive ?? false },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return setting;
  }

  @Put(':key')
  @RequirePermissions('settings:modifier')
  async update(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    // Un paramètre sensible existant ne peut être modifié qu'avec la
    // permission renforcée, même si l'utilisateur a settings:modifier.
    const sensitive = await this.settingsService.isSensitive(key);
    if (sensitive && !user.permissions.includes(ADMINISTER_PERMISSION)) {
      throw new ForbiddenException(
        'La modification de ce paramètre sensible nécessite la permission settings:administrer',
      );
    }

    const setting = await this.settingsService.update(
      key,
      dto.value,
      dto.description,
      user.id,
    );
    await this.auditService.record({
      userId: user.id,
      action: 'setting.updated',
      entityType: 'SystemSetting',
      entityId: setting.id,
      // On ne journalise jamais la valeur brute d'un paramètre sensible.
      newValue: sensitive ? { key } : { key, value: dto.value },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return setting;
  }

  @Delete(':key')
  @RequirePermissions('settings:supprimer')
  async remove(
    @Param('key') key: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const sensitive = await this.settingsService.isSensitive(key);
    if (sensitive && !user.permissions.includes(ADMINISTER_PERMISSION)) {
      throw new ForbiddenException(
        'La suppression de ce paramètre sensible nécessite la permission settings:administrer',
      );
    }

    await this.settingsService.remove(key);
    await this.auditService.record({
      userId: user.id,
      action: 'setting.deleted',
      entityType: 'SystemSetting',
      entityId: key,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }
}
