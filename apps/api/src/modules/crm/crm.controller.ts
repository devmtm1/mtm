import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { CreateProspectDto } from './dto/create-prospect.dto';
import { QueryProspectDto } from './dto/query-prospect.dto';
import { UpdateProspectDto } from './dto/update-prospect.dto';
import { CreateActiviteCrmDto } from './dto/create-activite-crm.dto';
import { UpdateActiviteCrmDto } from './dto/update-activite-crm.dto';
import { CreateDocumentCrmDto } from './dto/create-document-crm.dto';
import { TransitionPipelineDto } from './dto/transition-pipeline.dto';
import { ConvertContactDto } from './dto/convert-contact.dto';
import { CrmService } from './crm.service';

@ApiTags('crm')
@Controller('crm/prospects')
export class CrmController {
  constructor(
    private readonly crm: CrmService,
    private readonly audit: AuditService,
  ) {}

  @Get() @RequirePermissions('crm:consulter') findAll(
    @Query() query: QueryProspectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.findAll(query, user);
  }

  @Get('options') @RequirePermissions('crm:consulter') getOptions() {
    return this.crm.getOptions();
  }

  @Get('stats') @RequirePermissions('crm:consulter') getStats(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.getStats(user);
  }

  @Get('commercials') @RequirePermissions('crm:consulter') getCommercials() {
    return this.crm.getCommercials();
  }

  @Get('upcoming-tasks') @RequirePermissions('crm:consulter') upcomingTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? Math.min(Math.max(Number(limit), 1), 100) : 20;
    return this.crm.getUpcomingTasks(user, n);
  }

  @Get(':id/timeline') @RequirePermissions('crm:consulter') getTimeline(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.getTimeline(id, user);
  }

  @Patch(':id/pipeline')
  @RequirePermissions('crm:modifier')
  async transitionPipeline(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionPipelineDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.crm.transitionPipeline(
      id,
      dto.statutPipeline,
      user,
      dto.justification,
    );
    await this.audit.record({
      userId: user.id,
      action: 'prospect.pipeline.transition',
      entityType: 'Prospect',
      entityId: id,
      oldValue: result.before,
      newValue: result.prospect,
      justification: dto.justification,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result.prospect;
  }

  @Post('contacts/:contactId/convert')
  @RequirePermissions('crm:creer')
  async convertContact(
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: ConvertContactDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const prospect = await this.crm.convertContact(
      contactId,
      dto.commercialResponsableId,
      user,
    );
    await this.audit.record({
      userId: user.id,
      action: 'contact.converted',
      entityType: 'Prospect',
      entityId: prospect.id,
      newValue: { contactId, prospectId: prospect.id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return prospect;
  }

  @Patch(':id/assign-commercial')
  @RequirePermissions('crm:modifier')
  async assignCommercial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('commercialResponsableId') commercialResponsableId: string | null,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.crm.assignCommercial(
      id,
      commercialResponsableId,
      user,
    );
    await this.audit.record({
      userId: user.id,
      action: 'prospect.commercial.assigned',
      entityType: 'Prospect',
      entityId: id,
      oldValue: result.before,
      newValue: result.prospect,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result.prospect;
  }

  @Get(':id') @RequirePermissions('crm:consulter') findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.findOne(id, user);
  }

  @Get(':id/360') @RequirePermissions('crm:consulter') find360(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.findOne360(id, user);
  }

  @Get(':id/history') @RequirePermissions('crm:consulter') getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.getHistory(id, user);
  }

  @Post() @RequirePermissions('crm:creer') async create(
    @Body() dto: CreateProspectDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const prospect = await this.crm.create(dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'prospect.created',
      entityType: 'Prospect',
      entityId: prospect.id,
      newValue: prospect,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return prospect;
  }

  @Patch(':id') @RequirePermissions('crm:modifier') async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProspectDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const before = await this.crm.findOne(id, user);
    const prospect = await this.crm.update(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'prospect.updated',
      entityType: 'Prospect',
      entityId: id,
      oldValue: before,
      newValue: prospect,
      justification: dto.justification,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return prospect;
  }

  @Delete(':id') @RequirePermissions('crm:supprimer') async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const before = await this.crm.findOne(id, user);
    await this.crm.remove(id, user);
    await this.audit.record({
      userId: user.id,
      action: 'prospect.deleted',
      entityType: 'Prospect',
      entityId: id,
      oldValue: before,
      justification: 'Suppression du prospect',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }

  @Post(':id/activites') @RequirePermissions('crm:modifier') async addActivite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateActiviteCrmDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const activite = await this.crm.addActivite(id, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'prospect.activite.created',
      entityType: 'ActiviteCrm',
      entityId: activite.id,
      newValue: { prospectId: id, ...dto },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return activite;
  }

  @Patch(':id/activites/:activiteId')
  @RequirePermissions('crm:modifier')
  async updateActivite(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('activiteId', ParseUUIDPipe) activiteId: string,
    @Body() dto: UpdateActiviteCrmDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const before = await this.crm.findOne(id, user);
    const activite = await this.crm.updateActivite(id, activiteId, dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'prospect.activite.updated',
      entityType: 'ActiviteCrm',
      entityId: activiteId,
      oldValue: {
        statut:
          before.activites?.find((a) => a.id === activiteId)?.statut ??
          before.statutPipeline,
      },
      newValue: { statut: activite.statut },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return activite;
  }

  @Delete(':id/activites/:activiteId')
  @RequirePermissions('crm:modifier')
  async removeActivite(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('activiteId', ParseUUIDPipe) activiteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.crm.removeActivite(id, activiteId, user);
    await this.audit.record({
      userId: user.id,
      action: 'prospect.activite.deleted',
      entityType: 'ActiviteCrm',
      entityId: activiteId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }

  @Post(':id/documents')
  @RequirePermissions('crm:modifier')
  @UseInterceptors(FileInterceptor('file'))
  async addDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDocumentCrmDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Un document est obligatoire');
    const document = await this.crm.addDocument(id, dto, file, user);
    await this.audit.record({
      userId: user.id,
      action: 'prospect.document.created',
      entityType: 'DocumentCrm',
      entityId: document.id,
      newValue: { prospectId: id, type: dto.type },
    });
    return document;
  }

  @Delete(':id/documents/:documentId')
  @RequirePermissions('crm:modifier')
  async removeDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.crm.removeDocument(id, documentId, user);
    await this.audit.record({
      userId: user.id,
      action: 'prospect.document.deleted',
      entityType: 'DocumentCrm',
      entityId: documentId,
    });
    return { success: true };
  }
}
