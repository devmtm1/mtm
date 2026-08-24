import {
  Body,
  Controller,
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
import { AssignRoleDto } from '../rbac/dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermissions('users:consulter')
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map((user) => this.toSafeUser(user));
  }

  @Post()
  @RequirePermissions('users:creer')
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const user = await this.usersService.create(dto);
    await this.auditService.record({
      userId: currentUser.id,
      action: 'user.created',
      entityType: 'User',
      entityId: user.id,
      newValue: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return this.toSafeUser(user);
  }

  @Patch(':id/activate')
  @RequirePermissions('users:modifier')
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const user = await this.usersService.setActive(id, true);
    await this.auditService.record({
      userId: currentUser.id,
      action: 'user.activated',
      entityType: 'User',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return this.toSafeUser(user);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('users:modifier')
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const user = await this.usersService.setActive(id, false);
    await this.auditService.record({
      userId: currentUser.id,
      action: 'user.deactivated',
      entityType: 'User',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return this.toSafeUser(user);
  }

  @Post(':id/roles')
  @RequirePermissions('users:administrer')
  async assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.usersService.assignRole(id, dto.roleId);
    await this.auditService.record({
      userId: currentUser.id,
      action: 'user.role_assigned',
      entityType: 'User',
      entityId: id,
      newValue: { roleId: dto.roleId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }

  @Post(':id/roles/:roleId/remove')
  @RequirePermissions('users:administrer')
  async removeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.usersService.removeRole(id, roleId);
    await this.auditService.record({
      userId: currentUser.id,
      action: 'user.role_removed',
      entityType: 'User',
      entityId: id,
      oldValue: { roleId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true };
  }

  /**
   * Ne jamais exposer le hash du mot de passe ni le secret 2FA brut
   * dans les réponses API, même à un administrateur.
   */
  private toSafeUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    twoFactorEnabled: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    roles?: { role: { name: string } }[];
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      roles: user.roles?.map((r) => r.role.name) ?? [],
    };
  }
}
