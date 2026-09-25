import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ClientAccountsService } from '../client-accounts/client-accounts.service';
import { CreateLocataireDto, UpdateLocataireDto } from './dto/locataire.dto';

/** Locataires (J2.1) : fiche simple, comme les propriétaires. */
@Injectable()
export class LocatairesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comptesClient: ClientAccountsService,
  ) {}

  async findAll(search?: string) {
    const where: Prisma.LocataireWhereInput = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.locataire.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        _count: { select: { baux: true } },
        /**
         * Le bien occupé et l'état de ses loyers : sans eux, la liste oblige à
         * ouvrir chaque fiche pour savoir qui habite où et qui doit de l'argent.
         */
        baux: {
          where: { statut: { in: ['actif', 'preavis'] } },
          take: 1,
          orderBy: { dateDebut: 'desc' },
          select: {
            id: true,
            referenceInterne: true,
            statut: true,
            situationPaiement: true,
            bienLocatif: {
              select: {
                id: true,
                referenceInterne: true,
                adresse: true,
                commune: true,
              },
            },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 50,
    });
  }

  async findById(id: string) {
    const locataire = await this.prisma.locataire.findUnique({
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
      },
    });
    if (!locataire) throw new NotFoundException('Locataire introuvable');
    return locataire;
  }

  create(dto: CreateLocataireDto) {
    return this.prisma.locataire.create({ data: dto });
  }

  async update(id: string, dto: UpdateLocataireDto) {
    await this.findById(id);
    return this.prisma.locataire.update({ where: { id }, data: dto });
  }

  /** Historique des baux d'un locataire, tous biens confondus. */
  async findBaux(id: string) {
    await this.findById(id);
    return this.prisma.bailLocatif.findMany({
      where: { locataireId: id },
      select: {
        id: true,
        referenceInterne: true,
        statut: true,
        dateDebut: true,
        dateFin: true,
        dateSortieReelle: true,
        loyerMensuel: true,
        bienLocatif: {
          select: {
            id: true,
            referenceInterne: true,
            adresse: true,
            commune: true,
          },
        },
      },
      orderBy: { dateDebut: 'desc' },
    });
  }

  /**
   * Ouverture de l'espace locataire (« Ma location »). La procédure elle-même
   * est mutualisée avec le compte propriétaire : ici, seuls le contrôle du
   * dossier et le texte d'invitation sont propres au locataire.
   */
  async createClientAccount(id: string, password: string) {
    const locataire = await this.prisma.locataire.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        clientUser: { select: { id: true } },
      },
    });
    if (!locataire) throw new NotFoundException('Locataire introuvable');
    if (!locataire.email) {
      throw new BadRequestException(
        'Le locataire doit avoir une adresse e-mail',
      );
    }
    if (locataire.clientUser) {
      throw new ConflictException('Un compte client existe déjà');
    }

    return this.comptesClient.ouvrir({
      email: locataire.email,
      firstName: locataire.firstName,
      lastName: locataire.lastName,
      password,
      rattachement: { clientLocataireId: locataire.id },
      introduction:
        'Votre espace locataire est ouvert. Vous y retrouverez votre bail, vos échéances, votre caution, vos quittances, vos paiements et vos demandes.',
    });
  }
}
