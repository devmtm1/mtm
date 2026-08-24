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
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermissions('roles:consulter')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermissions('roles:consulter')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findById(id);
  }

  @Post()
  @RequirePermissions('roles:creer')
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const role = await this.rolesService.create(dto);
    await this.auditService.record({
      userId: currentUser.id,
      action: 'role.created',
      entityType: 'Role',
      entityId: role.id,
      newValue: { name: role.name, description: role.description },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return role;
  }

  @Patch(':id')
  @RequirePermissions('roles:modifier')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const role = await this.rolesService.update(id, dto);
    await this.auditService.record({
      userId: currentUser.id,
      action: 'role.updated',
      entityType: 'Role',
      entityId: id,
      newValue: { description: dto.description },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return role;
  }

  @Delete(':id')
  @RequirePermissions('roles:supprimer')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.rolesService.remove(id);
    await this.auditService.record({
      userId: currentUser.id,
      action: 'role.deleted',
      entityType: 'Role',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }

  @Post(':id/permissions')
  @RequirePermissions('roles:administrer')
  async assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.rolesService.assignPermissions(id, dto.permissionNames);
    await this.auditService.record({
      userId: currentUser.id,
      action: 'role.permissions_assigned',
      entityType: 'Role',
      entityId: id,
      newValue: { permissionNames: dto.permissionNames },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }

  @Post(':id/permissions/:permissionId/remove')
  @RequirePermissions('roles:administrer')
  async removePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.rolesService.removePermission(id, permissionId);
    await this.auditService.record({
      userId: currentUser.id,
      action: 'role.permission_removed',
      entityType: 'Role',
      entityId: id,
      oldValue: { permissionId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }
}
