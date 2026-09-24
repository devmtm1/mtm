import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ClientAccountsService } from '../client-accounts/client-accounts.service';
import { CreateProprietaireDto } from './dto/create-proprietaire.dto';
import { UpdateProprietaireDto } from './dto/update-proprietaire.dto';

@Injectable()
export class ProprietairesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comptesClient: ClientAccountsService,
  ) {}

  async findAll() {
    return this.prisma.proprietaire.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        // Nombre de terrains et de mandats : la liste montre d'un coup d'œil
        // les propriétaires actifs et ceux qui n'ont encore rien confié.
        _count: { select: { terrains: true, mandats: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findById(id: string) {
    const proprietaire = await this.prisma.proprietaire.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { terrains: true, mandats: true } },
      },
    });
    if (!proprietaire) {
      throw new NotFoundException('Propriétaire introuvable');
    }
    return proprietaire;
  }

  async create(dto: CreateProprietaireDto) {
    if (dto.email) {
      const existing = await this.prisma.proprietaire.findFirst({
        where: { email: dto.email },
      });
      if (existing)
        throw new ConflictException(
          'Un propriétaire avec cet email existe déjà',
        );
    }
    return this.prisma.proprietaire.create({ data: dto });
  }

  async update(id: string, dto: UpdateProprietaireDto) {
    await this.ensureExists(id);
    return this.prisma.proprietaire.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.proprietaire.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    const owner = await this.prisma.proprietaire.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!owner) throw new NotFoundException('Propriétaire introuvable');
  }

  /**
   * Ouverture de l'espace propriétaire (« Mon bien »). Procédure mutualisée
   * avec le compte locataire : seuls le contrôle du dossier et le texte
   * d'invitation sont propres au propriétaire.
   */
  async createClientAccount(id: string, password: string) {
    const proprietaire = await this.prisma.proprietaire.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        clientUser: { select: { id: true } },
      },
    });
    if (!proprietaire) throw new NotFoundException('Propriétaire introuvable');
    if (!proprietaire.email) {
      throw new BadRequestException(
        'Le propriétaire doit avoir une adresse e-mail',
      );
    }
    if (proprietaire.clientUser) {
      throw new ConflictException('Un compte client existe déjà');
    }

    return this.comptesClient.ouvrir({
      email: proprietaire.email,
      firstName: proprietaire.firstName,
      lastName: proprietaire.lastName,
      password,
      rattachement: { clientProprietaireId: proprietaire.id },
      introduction:
        'Votre espace propriétaire est ouvert. Vous y retrouverez vos biens confiés, les loyers appelés et encaissés, le solde et vos relevés de gestion.',
    });
  }
}
