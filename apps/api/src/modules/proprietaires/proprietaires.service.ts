import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  estConflitDeReference,
  referenceSuivante,
} from '../../common/utils/reference';
import {
  masquerCoordonnees,
  voitCoordonneesProprietaires,
} from './coordonnees';
import { ClientAccountsService } from '../client-accounts/client-accounts.service';
import { CreateProprietaireDto } from './dto/create-proprietaire.dto';
import { UpdateProprietaireDto } from './dto/update-proprietaire.dto';

type Demandeur = { roles?: string[] };

@Injectable()
export class ProprietairesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comptesClient: ClientAccountsService,
  ) {}

  async findAll(user?: Demandeur) {
    const proprietaires = await this.prisma.proprietaire.findMany({
      select: {
        id: true,
        matricule: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        // Nombre de terrains, de biens en gestion locative et de mandats : la
        // liste montre d'un coup d'œil les propriétaires actifs et ceux qui
        // n'ont encore rien confié.
        _count: {
          select: { terrains: true, biensLocatifs: true, mandats: true },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return proprietaires.map((p) => masquerCoordonnees(p, user));
  }

  /**
   * Fiche complète. Sans `user` (journal d'audit, traitements internes) les coordonnées
   * sont rendues ; les réponses aux utilisateurs passent par `user`.
   */
  async findById(id: string, user?: Demandeur) {
    const proprietaire = await this.prisma.proprietaire.findUnique({
      where: { id },
      select: {
        id: true,
        matricule: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { terrains: true, biensLocatifs: true, mandats: true },
        },
      },
    });
    if (!proprietaire) {
      throw new NotFoundException('Propriétaire introuvable');
    }
    return masquerCoordonnees(proprietaire, user);
  }

  /** Matricule que recevra le prochain propriétaire (PRO-2026-0004). */
  async prochainMatricule(): Promise<string> {
    const prefixe = `PRO-${new Date().getFullYear()}-`;
    const lignes = await this.prisma.proprietaire.findMany({
      where: { matricule: { startsWith: prefixe } },
      select: { matricule: true },
    });
    return referenceSuivante(
      prefixe,
      lignes.map((ligne) => ligne.matricule),
    );
  }

  /** Retourne la fiche non masquée : le contrôleur masque la réponse après avoir journalisé. */
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
    // Deux créations simultanées peuvent viser le même rang : on relit le dernier et on réessaie.
    for (let essai = 0; ; essai++) {
      try {
        return await this.prisma.proprietaire.create({
          data: { ...dto, matricule: await this.prochainMatricule() },
        });
      } catch (erreur) {
        if (essai >= 4 || !estConflitDeReference(erreur, 'matricule'))
          throw erreur;
      }
    }
  }

  async update(id: string, dto: UpdateProprietaireDto, user?: Demandeur) {
    await this.ensureExists(id);
    // Qui ne voit pas les coordonnées ne peut pas les réécrire.
    const { email: _email, phone: _phone, ...sansCoordonnees } = dto;
    return this.prisma.proprietaire.update({
      where: { id },
      data: voitCoordonneesProprietaires(user) ? dto : sansCoordonnees,
    });
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
