import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { hasSupervisionScope } from '../rbac/role-groups';
import {
  type DossierPilotage,
  estAnnule,
  comptaProgramme,
  financesProgramme,
  ligneClient,
  lignesEcheances,
  lignesVersements,
} from './programmes-pilotage';

type Utilisateur = { id: string; roles: string[]; permissions: string[] };

/**
 * Tout ce qui tourne autour d'un programme, vu depuis le programme : clients et
 * versements (dossiers de vente de ses lots), visites, mandats, commissions et
 * documents. Rien n'est stocké ici : on regroupe ce que les autres modules
 * possèdent déjà, avec leurs règles de périmètre — un commercial ne voit que
 * ses dossiers, ses prospects et ses mandats, la direction voit tout.
 */
@Injectable()
export class ProgrammesPilotageService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertProgramme(id: string): Promise<void> {
    const existe = await this.prisma.programmeLotissement.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existe) throw new NotFoundException('Programme introuvable');
  }

  /** Dossiers de vente des lots du programme, dans le périmètre de l'utilisateur. */
  private dossiers(programmeId: string, user: Utilisateur) {
    const global = hasSupervisionScope(user, 'ventes', ['comptable']);
    return this.prisma.dossierVente.findMany({
      where: {
        terrain: { programmeId },
        ...(global ? {} : { commercialResponsableId: user.id }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        prospect: {
          select: { id: true, nom: true, prenom: true, telephone: true },
        },
        terrain: {
          select: {
            id: true,
            referenceInterne: true,
            nom: true,
            numeroLot: true,
            proprietaireId: true,
            produitDirect: true,
            commission: true,
            marge: true,
          },
        },
        reversements: { select: { montant: true, statut: true } },
        commercialResponsable: {
          select: { firstName: true, lastName: true },
        },
        paiements: { orderBy: { datePaiement: 'desc' } },
        echeances: { orderBy: { dateEcheance: 'asc' } },
        commissions: {
          include: {
            commercial: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
  }

  /**
   * Clients, versements, échéances, chiffres d'encaissement et commissions : tout
   * ce qui vient des dossiers de vente, en une seule lecture.
   */
  async ventes(programmeId: string, user: Utilisateur) {
    await this.assertProgramme(programmeId);
    if (!user.permissions.includes('ventes:consulter')) {
      return {
        acces: false,
        perimetre: 'aucun' as const,
        finances: null,
        compta: null,
        clients: [],
        versements: [],
        echeances: [],
        commissions: [],
      };
    }
    const global = hasSupervisionScope(user, 'ventes', ['comptable']);
    const dossiers = await this.dossiers(programmeId, user);
    const aujourdhui = new Date();
    const pilotage = dossiers as unknown as DossierPilotage[];

    // Les commissions des autres ne sont pas à la portée de tous : droit « financier »
    // ou périmètre global, sinon seulement les siennes.
    const voitToutesCommissions =
      global || user.permissions.includes('ventes:consulter_financier');
    const commissions = dossiers.flatMap((dossier) =>
      dossier.commissions
        .filter((c) => voitToutesCommissions || c.commercialId === user.id)
        .map((c) => ({
          id: c.id,
          dossierId: dossier.id,
          client: [dossier.prospect.prenom, dossier.prospect.nom]
            .filter(Boolean)
            .join(' '),
          lot:
            dossier.terrain?.numeroLot ||
            dossier.terrain?.referenceInterne ||
            null,
          commercial: `${c.commercial.firstName} ${c.commercial.lastName}`,
          statut: c.statut,
          montantEstime: Number(c.montantEstime),
          montantValide:
            c.montantValide === null ? null : Number(c.montantValide),
          montantPaye: c.montantPaye === null ? null : Number(c.montantPaye),
        })),
    );

    return {
      acces: true,
      perimetre: global ? ('tous' as const) : ('les_votres' as const),
      finances: financesProgramme(pilotage, aujourdhui),
      // La vue comptable (revenu de MTM, reversements) suit le droit de consulter les finances.
      compta: user.permissions.includes('finances:consulter')
        ? comptaProgramme(pilotage)
        : null,
      clients: pilotage.map((d) => ligneClient(d, aujourdhui)),
      versements: lignesVersements(pilotage),
      echeances: lignesEcheances(pilotage, aujourdhui),
      commissions,
    };
  }

  /** Visites des prospects sur les lots du programme (leurs prospects, pour un commercial). */
  async visites(programmeId: string, user: Utilisateur) {
    await this.assertProgramme(programmeId);
    if (!user.permissions.includes('crm:consulter')) {
      return { acces: false, visites: [] };
    }
    const manager = hasSupervisionScope(user, 'crm');
    const visites = await this.prisma.visiteProspect.findMany({
      where: {
        terrain: { programmeId },
        ...(manager ? {} : { prospect: { commercialResponsableId: user.id } }),
      },
      orderBy: [{ dateConfirmee: 'desc' }, { createdAt: 'desc' }],
      take: 300,
      include: {
        prospect: {
          select: { id: true, nom: true, prenom: true, telephone: true },
        },
        terrain: {
          select: {
            id: true,
            referenceInterne: true,
            nom: true,
            numeroLot: true,
          },
        },
        accompagnateur: { select: { firstName: true, lastName: true } },
      },
    });
    return {
      acces: true,
      visites: visites.map((v) => ({
        id: v.id,
        statut: v.statut,
        dateConfirmee: v.dateConfirmee,
        dateProposee: v.dateProposee,
        heure: v.heure,
        client: {
          id: v.prospect.id,
          nom: [v.prospect.prenom, v.prospect.nom].filter(Boolean).join(' '),
          telephone: v.prospect.telephone,
        },
        lot: {
          id: v.terrain.id,
          numero: v.terrain.numeroLot || v.terrain.referenceInterne,
        },
        accompagnateur: v.accompagnateur
          ? `${v.accompagnateur.firstName} ${v.accompagnateur.lastName}`
          : null,
        terrainPlait: v.terrainPlait,
        prixAccepte: v.prixAccepte,
        objectionPrincipale: v.objectionPrincipale,
      })),
    };
  }

  /** Mandats qui confient au moins un lot du programme à une équipe de vente. */
  async mandats(programmeId: string, user: Utilisateur) {
    await this.assertProgramme(programmeId);
    if (!user.permissions.includes('mandats:consulter')) {
      return { acces: false, mandats: [] };
    }
    const global = hasSupervisionScope(user, 'mandats', ['comptable']);
    const mandats = await this.prisma.mandat.findMany({
      where: {
        lots: { some: { terrain: { programmeId } } },
        ...(global ? {} : { commercialResponsableId: user.id }),
      },
      orderBy: { dateFin: 'asc' },
      include: {
        proprietaire: { select: { firstName: true, lastName: true } },
        commercialResponsable: { select: { firstName: true, lastName: true } },
        lots: {
          where: { terrain: { programmeId } },
          select: { id: true },
        },
      },
    });
    return {
      acces: true,
      mandats: mandats.map((m) => ({
        id: m.id,
        reference: m.referenceInterne,
        typeMandat: m.typeMandat,
        statut: m.statut,
        exclusivite: m.exclusivite,
        dateDebut: m.dateDebut,
        dateFin: m.dateFin,
        proprietaire: `${m.proprietaire.firstName} ${m.proprietaire.lastName}`,
        commercial: m.commercialResponsable
          ? `${m.commercialResponsable.firstName} ${m.commercialResponsable.lastName}`
          : null,
        lotsDuProgramme: m.lots.length,
      })),
    };
  }

  /** Pièces des lots (titre, plan…) et pièces des dossiers de vente (contrat, reçus…). */
  async documents(programmeId: string, user: Utilisateur) {
    await this.assertProgramme(programmeId);
    const documentsLots = await this.prisma.terrainDocument.findMany({
      where: { terrain: { programmeId } },
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: {
        terrain: {
          select: { id: true, referenceInterne: true, numeroLot: true },
        },
      },
    });
    let documentsVentes: Array<{
      id: string;
      type: string;
      title: string | null;
      isGenerated: boolean;
      createdAt: Date;
      dossierId: string;
      dossierReference: string | null;
      client: string;
      lot: string | null;
    }> = [];
    if (user.permissions.includes('ventes:consulter')) {
      const dossiers = (await this.dossiers(programmeId, user)).filter(
        (d) => !estAnnule(d),
      );
      const ids = dossiers.map((d) => d.id);
      const docs = ids.length
        ? await this.prisma.documentVente.findMany({
            where: { dossierVenteId: { in: ids } },
            orderBy: { createdAt: 'desc' },
            take: 300,
          })
        : [];
      const parDossier = new Map(dossiers.map((d) => [d.id, d]));
      documentsVentes = docs.map((doc) => {
        const dossier = parDossier.get(doc.dossierVenteId);
        return {
          id: doc.id,
          type: doc.type,
          title: doc.title,
          isGenerated: doc.isGenerated,
          createdAt: doc.createdAt,
          dossierId: doc.dossierVenteId,
          dossierReference: dossier?.referenceInterne ?? null,
          client: dossier
            ? [dossier.prospect.prenom, dossier.prospect.nom]
                .filter(Boolean)
                .join(' ')
            : '',
          lot:
            dossier?.terrain?.numeroLot ||
            dossier?.terrain?.referenceInterne ||
            null,
        };
      });
    }
    return {
      lots: documentsLots.map((d) => ({
        id: d.id,
        type: d.type,
        title: d.title,
        isPublic: d.isPublic,
        createdAt: d.createdAt,
        lotId: d.terrain.id,
        lot: d.terrain.numeroLot || d.terrain.referenceInterne,
      })),
      ventes: documentsVentes,
    };
  }
}
