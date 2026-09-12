import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InternalNotificationService } from '../../common/mail/internal-notification.service';
import { PrismaService } from '../../database/prisma.service';
import {
  COMMERCIAL_ROLES,
  hasAnyRole,
  SUPERVISION_ROLES,
} from '../rbac/role-groups';
import { CreateContactDto } from './dto/create-contact.dto';
import type { Contact } from '@prisma/client';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: InternalNotificationService,
  ) {}

  async create(dto: CreateContactDto): Promise<Contact> {
    let terrainLabel: string | undefined;
    if (dto.terrainId) {
      const terrain = await this.prisma.terrain.findUnique({
        where: { id: dto.terrainId },
        select: { id: true, referenceInterne: true, nom: true },
      });
      if (!terrain) throw new NotFoundException('Terrain introuvable');
      terrainLabel = `${terrain.referenceInterne} — ${terrain.nom}`;
    }
    const contact = await this.prisma.contact.create({
      data: {
        nom: dto.nom,
        email: dto.email,
        telephone: dto.telephone,
        sujet: dto.sujet,
        message: dto.message,
        terrainId: dto.terrainId,
      },
    });

    // Notification à l'équipe : non bloquante, la demande est déjà enregistrée.
    void this.notifications.notify(
      `Nouveau message : ${dto.sujet || 'sans sujet'}`,
      [
        `De : ${dto.nom} <${dto.email}>`,
        dto.telephone ? `Téléphone : ${dto.telephone}` : '',
        terrainLabel ? `Terrain : ${terrainLabel}` : '',
        '',
        dto.message,
        '',
        'À traiter dans le back-office (Contacts / CRM).',
      ],
    );

    // --- Génération automatique de prospect CRM ---
    try {
      let prospect = await this.prisma.prospect.findFirst({
        where: {
          OR: [
            ...(dto.email ? [{ email: dto.email }] : []),
            ...(dto.telephone ? [{ telephone: dto.telephone }] : []),
          ],
        },
      });

      if (!prospect) {
        const [prenom, ...rest] = (dto.nom || '').split(' ');
        prospect = await this.prisma.prospect.create({
          data: {
            nom: rest.length ? rest.join(' ') : dto.nom,
            prenom: rest.length ? prenom : undefined,
            email: dto.email,
            telephone: dto.telephone,
            sourceAcquisition: 'contact_public',
            besoins: `[${dto.sujet || 'Contact public'}] ${dto.message}`,
            statutPipeline: 'nouveau_contact',
          },
        });
      }

      await this.prisma.activiteCrm.create({
        data: {
          prospectId: prospect.id,
          type: 'note',
          titre: `Demande de contact web: ${dto.sujet || 'Sans sujet'}`,
          description: dto.message,
          statut: 'realise',
          priorite: 'haute',
        },
      });
    } catch (error) {
      this.logger.error(
        `Échec de synchronisation du contact ${contact.id} vers le CRM`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return contact;
  }

  async findAll(options: { lu?: boolean } = {}): Promise<Contact[]> {
    return this.prisma.contact.findMany({
      where: { ...(options.lu !== undefined ? { lu: options.lu } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { terrain: { select: { id: true, referenceInterne: true } } },
    });
  }

  async markRead(id: string): Promise<Contact> {
    return this.prisma.contact.update({
      where: { id },
      data: { lu: true },
    });
  }

  async convertToProspect(
    id: string,
    commercialResponsableId: string | undefined,
    user: { id: string; roles: string[] },
  ) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Message de contact introuvable');

    const isManager = hasAnyRole(user.roles, SUPERVISION_ROLES);
    if (
      commercialResponsableId &&
      !isManager &&
      commercialResponsableId !== user.id
    ) {
      throw new BadRequestException(
        'Seul l’encadrement commercial peut affecter un autre commercial',
      );
    }

    if (commercialResponsableId) {
      const target = await this.prisma.user.findUnique({
        where: { id: commercialResponsableId },
        include: { roles: { include: { role: { select: { name: true } } } } },
      });
      const isCommercial = hasAnyRole(
        target?.roles.map((item) => item.role.name) ?? [],
        COMMERCIAL_ROLES,
      );
      if (!target?.isActive || !isCommercial) {
        throw new BadRequestException(
          'L’utilisateur cible est invalide ou ne possède pas un rôle commercial',
        );
      }
    }

    let prospect = await this.prisma.prospect.findFirst({
      where: {
        OR: [
          ...(contact.email ? [{ email: contact.email }] : []),
          ...(contact.telephone ? [{ telephone: contact.telephone }] : []),
        ],
      },
    });

    if (!prospect) {
      const [prenom, ...rest] = (contact.nom || '').split(' ');
      prospect = await this.prisma.prospect.create({
        data: {
          nom: rest.length ? rest.join(' ') : contact.nom,
          prenom: rest.length ? prenom : undefined,
          email: contact.email,
          telephone: contact.telephone,
          sourceAcquisition: 'contact_public',
          besoins: `[${contact.sujet || 'Contact public'}] ${contact.message}`,
          statutPipeline: 'nouveau_contact',
          commercialResponsableId: commercialResponsableId || undefined,
        },
      });
    } else if (commercialResponsableId) {
      prospect = await this.prisma.prospect.update({
        where: { id: prospect.id },
        data: { commercialResponsableId },
      });
    }

    await this.prisma.contact.update({
      where: { id },
      data: { lu: true },
    });

    return prospect;
  }
}
