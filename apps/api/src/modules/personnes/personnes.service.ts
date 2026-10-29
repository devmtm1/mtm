import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CrmAccessService } from '../crm/crm-access.service';
import { voitCoordonneesProprietaires } from '../proprietaires/coordonnees';
import type { QueryPersonnesDto } from './dto/query-personnes.dto';
import {
  compterPersonnes,
  filtrerPersonnes,
  paginer,
  regrouperPersonnes,
  type CompteursPersonnes,
  type FichePersonne,
  type Personne,
  type RolePersonne,
} from './regroupement';

/**
 * Garde-fou : fiches lues par source. Le regroupement se fait en mémoire sur toutes les fiches correspondantes (seuls
 * le nom et les contacts sont lus) ; au-delà, la recherche est signalée comme tronquée et on invite à l'affiner.
 */
export const PLAFOND_PAR_SOURCE = 5000;

/**
 * Répertoire des personnes : une même personne peut être prospect, propriétaire et locataire. Le répertoire les
 * réunit par e-mail ou téléphone commun, dans le périmètre de l'utilisateur — chaque source n'est lue que si
 * l'utilisateur a le droit de la consulter, et les coordonnées des propriétaires restent réservées à
 * l'administrateur.
 */
@Injectable()
export class PersonnesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crmAccess: CrmAccessService,
  ) {}

  async rechercher(
    requete: QueryPersonnesDto,
    user: AuthenticatedUser,
  ): Promise<{
    items: Personne[];
    page: number;
    pageSize: number;
    total: number;
    pages: number;
    /** Les chiffres de toute la recherche, quelle que soit la page ou le filtre. */
    compteurs: CompteursPersonnes;
    sourcesAccessibles: RolePersonne[];
    /** Une source a atteint le plafond de lecture : la recherche est incomplète, il faut l'affiner. */
    tronque: boolean;
  }> {
    const terme = requete.search?.trim();
    const peut = (permission: string) => user.permissions.includes(permission);
    const sources: RolePersonne[] = [];
    const lectures: Promise<FichePersonne[]>[] = [];

    if (peut('crm:consulter')) {
      sources.push('prospect');
      lectures.push(this.prospects(terme, user));
    }
    if (peut('proprietaires:consulter')) {
      sources.push('proprietaire');
      lectures.push(this.proprietaires(terme, user));
    }
    if (peut('locatif:consulter')) {
      sources.push('locataire');
      lectures.push(this.locataires(terme));
    }

    const lues = await Promise.all(lectures);
    const personnes = regrouperPersonnes(lues.flat());
    const page = paginer(
      filtrerPersonnes(personnes, requete.filtre),
      requete.page,
      requete.pageSize,
    );
    return {
      ...page,
      compteurs: compterPersonnes(personnes),
      sourcesAccessibles: sources,
      tronque: lues.some((fiches) => fiches.length >= PLAFOND_PAR_SOURCE),
    };
  }

  private contient(champ: string, terme: string) {
    return { [champ]: { contains: terme, mode: 'insensitive' as const } };
  }

  private async prospects(
    terme: string | undefined,
    user: AuthenticatedUser,
  ): Promise<FichePersonne[]> {
    const lignes = await this.prisma.prospect.findMany({
      where: {
        ...(this.crmAccess.isManager(user)
          ? {}
          : { commercialResponsableId: user.id }),
        ...(terme
          ? {
              OR: [
                this.contient('nom', terme),
                this.contient('prenom', terme),
                this.contient('email', terme),
                this.contient('telephone', terme),
                this.contient('referenceInterne', terme),
              ],
            }
          : {}),
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        referenceInterne: true,
        parcours: true,
      },
      // L'identifiant départage les fiches créées au même instant : sans lui, l'ordre change d'une lecture à l'autre.
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: PLAFOND_PAR_SOURCE,
    });
    return lignes.map((ligne) => ({
      role: 'prospect' as const,
      id: ligne.id,
      nom: ligne.nom,
      prenom: ligne.prenom,
      email: ligne.email,
      telephone: ligne.telephone,
      reference: ligne.referenceInterne,
      parcours: ligne.parcours,
    }));
  }

  private async proprietaires(
    terme: string | undefined,
    user: AuthenticatedUser,
  ): Promise<FichePersonne[]> {
    const voitContacts = voitCoordonneesProprietaires(user);
    const where: Prisma.ProprietaireWhereInput = terme
      ? {
          OR: [
            this.contient('lastName', terme),
            this.contient('firstName', terme),
            this.contient('matricule', terme),
            // Chercher par e-mail ou téléphone révélerait ces coordonnées à qui n'y a pas droit.
            ...(voitContacts
              ? [this.contient('email', terme), this.contient('phone', terme)]
              : []),
          ],
        }
      : {};
    const lignes = await this.prisma.proprietaire.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        matricule: true,
      },
      // L'identifiant départage les fiches créées au même instant : sans lui, l'ordre change d'une lecture à l'autre.
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: PLAFOND_PAR_SOURCE,
    });
    return lignes.map((ligne) => ({
      role: 'proprietaire' as const,
      id: ligne.id,
      nom: ligne.lastName,
      prenom: ligne.firstName,
      email: voitContacts ? ligne.email : null,
      telephone: voitContacts ? ligne.phone : null,
      reference: ligne.matricule,
    }));
  }

  private async locataires(
    terme: string | undefined,
  ): Promise<FichePersonne[]> {
    const lignes = await this.prisma.locataire.findMany({
      where: terme
        ? {
            OR: [
              this.contient('lastName', terme),
              this.contient('firstName', terme),
              this.contient('email', terme),
              this.contient('phone', terme),
            ],
          }
        : {},
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
      // L'identifiant départage les fiches créées au même instant : sans lui, l'ordre change d'une lecture à l'autre.
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: PLAFOND_PAR_SOURCE,
    });
    return lignes.map((ligne) => ({
      role: 'locataire' as const,
      id: ligne.id,
      nom: ligne.lastName,
      prenom: ligne.firstName,
      email: ligne.email,
      telephone: ligne.phone,
      reference: null,
    }));
  }
}
