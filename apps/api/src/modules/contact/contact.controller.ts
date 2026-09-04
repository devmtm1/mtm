import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@ApiTags('contacts')
@Controller('contacts')
export class ContactController {
  constructor(
    private readonly contacts: ContactService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Post()
  async create(@Body() dto: CreateContactDto) {
    const contact = await this.contacts.create(dto);
    await this.audit.record({
      action: 'contact.created',
      entityType: 'Contact',
      entityId: contact.id,
      newValue: {
        nom: contact.nom,
        email: contact.email,
        sujet: contact.sujet,
      },
    });
    return { success: true };
  }

  @Get()
  @RequirePermissions('settings:consulter')
  findAll(@Query('lu') lu?: string) {
    return this.contacts.findAll({
      lu: lu === 'true' ? true : lu === 'false' ? false : undefined,
    });
  }

  @Patch(':id/read')
  @RequirePermissions('settings:consulter')
  async markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.audit.record({
      userId: user.id,
      action: 'contact.read',
      entityType: 'Contact',
      entityId: id,
    });
    return this.contacts.markRead(id);
  }

  @Post(':id/convert-to-prospect')
  @RequirePermissions('crm:creer')
  async convertToProspect(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('commercialResponsableId') commercialResponsableId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const prospect = await this.contacts.convertToProspect(id, commercialResponsableId);
    await this.audit.record({
      userId: user.id,
      action: 'contact.converted_to_prospect',
      entityType: 'Contact',
      entityId: id,
      newValue: { prospectId: prospect.id },
    });
    return prospect;
  }
}
