import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional } from 'class-validator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuditService } from '../audit/audit.service';
import { WorkflowsService } from './workflows.service';

export class EnregistrerWorkflowDto {
  @IsArray()
  statuts!: string[];

  @IsOptional()
  @IsObject()
  transitions?: Record<string, string[]>;
}

/** Parcours des dossiers : se lisent avec « settings:consulter », se modifient avec « settings:modifier ». */
@ApiTags('workflows')
@Controller('workflows')
export class WorkflowsController {
  constructor(
    private readonly workflows: WorkflowsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions('settings:consulter')
  lister() {
    return this.workflows.lister();
  }

  @Put(':module')
  @RequirePermissions('settings:modifier')
  async enregistrer(
    @Param('module') module: string,
    @Body() dto: EnregistrerWorkflowDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resultat = await this.workflows.enregistrer(module, dto, user.id);
    await this.audit.record({
      userId: user.id,
      action: 'workflow.modifie',
      entityType: 'SystemSetting',
      entityId: `workflow.${module}`,
      newValue: { statuts: dto.statuts, transitions: dto.transitions },
    });
    return resultat;
  }
}
