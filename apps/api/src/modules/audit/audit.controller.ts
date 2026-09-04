import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@ApiTags('audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit:consulter')
  findAll(@Query() query: QueryAuditLogDto) {
    return this.auditService.findAll(
      {
        userId: query.userId,
        entityType: query.entityType,
        entityId: query.entityId,
        action: query.action,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      },
      { page: query.page, pageSize: query.pageSize },
    );
  }

  @Post('export')
  @RequirePermissions('audit:exporter')
  exportLogs(
    @Query() query: QueryAuditLogDto,
    @Body('justification') justification: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!justification || justification.trim().length < 3) {
      throw new BadRequestException(
        'Une justification minimale de 3 caractères est obligatoire pour exporter les journaux d\'audit',
      );
    }
    return this.auditService.exportLogs(
      {
        userId: query.userId,
        entityType: query.entityType,
        entityId: query.entityId,
        action: query.action,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      },
      justification,
      user.id,
    );
  }
}
