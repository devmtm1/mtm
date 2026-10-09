import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { MAX_ASSET_SIZE } from '../../common/storage/asset-validation';
import { Public } from '../auth/decorators/public.decorator';
import { PublicCache } from '../../common/http/public-cache.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { TeamMemberService } from './team-member.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { PublishContentBlockDto } from './dto/publish-content-block.dto';

@ApiTags('team')
@Controller('team')
export class TeamMemberController {
  constructor(
    private readonly team: TeamMemberService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @PublicCache()
  @Get()
  findPublic() {
    return this.team.findPublic();
  }

  @Get('admin')
  @RequirePermissions('content:consulter')
  findAllAdmin() {
    return this.team.findAllAdmin();
  }

  @Post()
  @RequirePermissions('content:creer')
  async create(
    @Body() dto: CreateTeamMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const membre = await this.team.create(dto, user);
    await this.audit.record({
      userId: user.id,
      action: 'team.created',
      entityType: 'TeamMember',
      entityId: membre.id,
      newValue: { kind: membre.kind, nom: membre.nom },
    });
    return membre;
  }

  @Patch(':id')
  @RequirePermissions('content:modifier')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const membre = await this.team.update(id, dto);
    await this.audit.record({
      userId: user.id,
      action: 'team.updated',
      entityType: 'TeamMember',
      entityId: id,
      newValue: dto,
    });
    return membre;
  }

  @Patch(':id/publish')
  @RequirePermissions('content:publier')
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishContentBlockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const membre = await this.team.setActive(id, dto.isActive);
    await this.audit.record({
      userId: user.id,
      action: dto.isActive ? 'team.published' : 'team.unpublished',
      entityType: 'TeamMember',
      entityId: id,
    });
    return membre;
  }

  @Post(':id/image')
  @RequirePermissions('content:modifier')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_ASSET_SIZE } }),
  )
  async uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Une image est obligatoire');
    const membre = await this.team.uploadImage(id, file);
    await this.audit.record({
      userId: user.id,
      action: 'team.image.updated',
      entityType: 'TeamMember',
      entityId: id,
    });
    return membre;
  }

  @Delete(':id')
  @RequirePermissions('content:supprimer')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.team.remove(id);
    await this.audit.record({
      userId: user.id,
      action: 'team.deleted',
      entityType: 'TeamMember',
      entityId: id,
    });
    return { success: true };
  }
}
