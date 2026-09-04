import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import type { Contact } from '@prisma/client';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContactDto): Promise<Contact> {
    if (dto.terrainId) {
      const terrain = await this.prisma.terrain.findUnique({
        where: { id: dto.terrainId },
        select: { id: true },
      });
      if (!terrain) throw new NotFoundException('Terrain introuvable');
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
    } catch {
      // Ignorer si la création de prospect échoue pour ne pas bloquer l'envoi du message public
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

  async convertToProspect(id: string, commercialResponsableId?: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Message de contact introuvable');

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
