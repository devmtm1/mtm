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
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { RepondreContactDto } from './dto/repondre-contact.dto';

@ApiTags('contacts')
@Controller(['contacts', 'contact'])
export class ContactController {
  constructor(
    private readonly contacts: ContactService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Throttle({
    default: {
      limit: Number.parseInt(process.env.CONTACT_RATE_LIMIT_MAX ?? '5', 10),
      ttl:
        Number.parseInt(process.env.CONTACT_RATE_LIMIT_TTL ?? '60', 10) * 1000,
    },
  })
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
  @RequirePermissions('contact:consulter')
  findAll(@Query('lu') lu?: string) {
    return this.contacts.findAll({
      lu: lu === 'true' ? true : lu === 'false' ? false : undefined,
    });
  }

  @Patch(':id/read')
  @RequirePermissions('contact:modifier')
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

  /**
   * Répond à un message : la réponse part par e-mail au demandeur, s'affiche
   * dans son espace client (écran « Demandes ») et le message passe à « pris en
   * charge ».
   */
  @Post(':id/repondre')
  @RequirePermissions('contact:modifier')
  async repondre(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RepondreContactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resultat = await this.contacts.repondre(id, dto.reponse, user);
    await this.audit.record({
      userId: user.id,
      action: 'contact.replied',
      entityType: 'Contact',
      entityId: id,
      newValue: { emailEnvoye: resultat.emailEnvoye },
    });
    return resultat;
  }

  @Post(':id/convert-to-prospect')
  @RequirePermissions('crm:creer')
  async convertToProspect(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('commercialResponsableId')
    commercialResponsableId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const prospect = await this.contacts.convertToProspect(
      id,
      commercialResponsableId,
      user,
    );
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
