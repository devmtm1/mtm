import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  type Activite,
  type LigneJournal,
  honoraires,
  margeReconnue,
  nombre,
} from './finances.calculs';
import { commissionReconnue, numeroOperation } from './tresorerie.calculs';

export const TAUX_GESTION_DEFAUT = 10;

export interface FluxCollecte {
  lignes: LigneJournal[];
  /** Ventes encaissées dont le bien n'a pas de marge renseignée : leur revenu est compté à zéro. */
  margesInconnues: number;
  tauxGestionDefaut: number;
}

const nomComplet = (p?: {
  firstName?: string | null;
  lastName?: string | null;
  prenom?: string | null;
  nom?: string | null;
}): string | null =>
  [p?.firstName ?? p?.prenom, p?.lastName ?? p?.nom]
    .filter(Boolean)
    .join(' ')
    .trim() || null;

/**
 * Journal financier : reprend, tels quels et sans double saisie, les mouvements
 * d'argent de tous les modules sur une période, plus les opérations saisies à
 * la main et validées. Une ligne est un mouvement ; ses totaux donnent les
 * encaissements, le revenu de MTM, les dépenses et le résultat.
 *
 * Ce qui est revenu de MTM, par activité :
 * - ventes : la marge du bien, acquise au prorata de chaque paiement validé ;
 * - gérance : la commission de gestion (taux du bien) sur loyers et séjours ;
 * - démarches : les règlements reçus pour la prestation ;
 * - le reste : les recettes saisies à la main.
 * Les loyers et le prix d'un bien vendu sont des flux de passage : ils comptent
 * dans les encaissements, pas dans le revenu.
 */
@Injectable()
export class FluxFinanciersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async tauxGestionDefaut(): Promise<number> {
    const valeur = await this.settings.getRawValue(
      'finances.tauxGestionDefaut',
    );
    return typeof valeur === 'number' && valeur >= 0 && valeur <= 100
      ? valeur
      : TAUX_GESTION_DEFAUT;
  }

  /** Mouvements de [du, au[. */
  async collecter(du: Date, au: Date): Promise<FluxCollecte> {
    const periode = { gte: du, lt: au };
    const tauxDefaut = await this.tauxGestionDefaut();
    const lignes: LigneJournal[] = [];
    let margesInconnues = 0;

    // --- Ventes : paiements validés ---
    const paiements = await this.prisma.paiement.findMany({
      where: { statut: 'valide', datePaiement: periode },
      select: {
        id: true,
        montant: true,
        datePaiement: true,
        mode: true,
        reference: true,
        justificatifUrl: true,
        dossierVente: {
          select: {
            id: true,
            referenceInterne: true,
            prixVente: true,
            prospect: { select: { nom: true, prenom: true } },
            terrain: {
              select: {
                marge: true,
                commission: true,
                proprietaireId: true,
                produitDirect: true,
              },
            },
          },
        },
      },
    });
    for (const p of paiements) {
      const montant = nombre(p.montant);
      const dossier = p.dossierVente;
      const terrain = dossier.terrain;
      // Un terrain confié par un propriétaire rapporte sa commission, pas une marge :
      // le reste de l'argent encaissé revient au propriétaire.
      const confie = Boolean(
        terrain?.proprietaireId &&
        !terrain.produitDirect &&
        terrain.commission !== null &&
        terrain.commission !== undefined,
      );
      const marge =
        terrain?.marge === null || terrain?.marge === undefined
          ? null
          : nombre(terrain.marge);
      if (!confie && marge === null) margesInconnues += 1;
      const revenu = confie
        ? commissionReconnue(
            nombre(terrain?.commission),
            montant,
            nombre(dossier.prixVente),
          )
        : margeReconnue(marge, montant, nombre(dossier.prixVente));
      lignes.push({
        id: `paiement:${p.id}`,
        date: p.datePaiement,
        activite: 'vente',
        sens: 'entree',
        nature: 'encaissement_vente',
        libelle: `Paiement — dossier ${dossier.referenceInterne ?? ''}`.trim(),
        tiers: nomComplet(dossier.prospect),
        reference: p.reference,
        mode: p.mode,
        montant,
        revenu,
        lien: `/ventes/${dossier.id}`,
        justifie: Boolean(p.justificatifUrl),
      });
    }

    // --- Ventes : commissions de commerciaux payées (une charge) ---
    const commissions = await this.prisma.commissionVente.findMany({
      where: { statut: 'payee', updatedAt: periode },
      select: {
        id: true,
        montantPaye: true,
        updatedAt: true,
        commercial: { select: { firstName: true, lastName: true } },
        dossierVente: { select: { id: true, referenceInterne: true } },
      },
    });
    for (const c of commissions) {
      lignes.push({
        id: `commission:${c.id}`,
        date: c.updatedAt,
        activite: 'vente',
        sens: 'sortie',
        nature: 'commission_commercial',
        libelle:
          `Commission — dossier ${c.dossierVente.referenceInterne ?? ''}`.trim(),
        tiers: nomComplet(c.commercial),
        reference: null,
        mode: null,
        montant: nombre(c.montantPaye),
        revenu: 0,
        lien: `/ventes/${c.dossierVente.id}`,
      });
    }

    // --- Locatif : loyers encaissés (flux propriétaire) et honoraires de gestion ---
    const loyers = await this.prisma.paiementLoyer.findMany({
      where: { statut: 'valide', datePaiement: periode },
      select: {
        id: true,
        montant: true,
        datePaiement: true,
        modePaiement: true,
        reference: true,
        bailLocatif: {
          select: {
            referenceInterne: true,
            bienLocatifId: true,
            locataire: { select: { firstName: true, lastName: true } },
            bienLocatif: { select: { tauxGestion: true } },
          },
        },
      },
    });
    for (const l of loyers) {
      const montant = nombre(l.montant);
      const taux = this.taux(l.bailLocatif.bienLocatif.tauxGestion, tauxDefaut);
      lignes.push({
        id: `loyer:${l.id}`,
        date: l.datePaiement,
        activite: 'locatif',
        sens: 'entree',
        nature: 'loyer',
        libelle: `Loyer — bail ${l.bailLocatif.referenceInterne}`,
        tiers: nomComplet(l.bailLocatif.locataire),
        reference: l.reference,
        mode: l.modePaiement,
        montant,
        revenu: honoraires(montant, taux),
        lien: `/locatif/biens/${l.bailLocatif.bienLocatifId}`,
      });
    }

    // --- Séjours ---
    const sejours = await this.prisma.paiementSejour.findMany({
      where: { datePaiement: periode },
      select: {
        id: true,
        montant: true,
        datePaiement: true,
        mode: true,
        reference: true,
        sejour: {
          select: {
            id: true,
            referenceInterne: true,
            locataire: { select: { firstName: true, lastName: true } },
            bienLocatif: { select: { tauxGestion: true } },
          },
        },
      },
    });
    for (const s of sejours) {
      const montant = nombre(s.montant);
      const taux = this.taux(s.sejour.bienLocatif.tauxGestion, tauxDefaut);
      lignes.push({
        id: `sejour:${s.id}`,
        date: s.datePaiement,
        activite: 'locatif',
        sens: 'entree',
        nature: 'sejour',
        libelle: `Séjour ${s.sejour.referenceInterne}`,
        tiers: nomComplet(s.sejour.locataire),
        reference: s.reference,
        mode: s.mode,
        montant,
        revenu: honoraires(montant, taux),
        lien: `/locatif/sejours/${s.sejour.id}`,
      });
    }

    // --- Démarches : règlements de mission (revenu) et frais de transfert (charge) ---
    const missions = await this.prisma.paiementMission.findMany({
      where: { datePaiement: periode },
      select: {
        id: true,
        montantEnvoye: true,
        frais: true,
        datePaiement: true,
        mode: true,
        reference: true,
        mission: {
          select: {
            id: true,
            referenceInterne: true,
            prospect: { select: { nom: true, prenom: true } },
          },
        },
      },
    });
    for (const m of missions) {
      const envoye = nombre(m.montantEnvoye);
      const base = {
        date: m.datePaiement,
        activite: 'demarches' as const,
        tiers: nomComplet(m.mission.prospect),
        reference: m.reference,
        mode: m.mode,
        lien: `/demarches/missions/${m.mission.id}`,
      };
      lignes.push({
        ...base,
        id: `mission:${m.id}`,
        sens: 'entree',
        nature: 'mission',
        libelle: `Mission ${m.mission.referenceInterne ?? ''}`.trim(),
        montant: envoye,
        revenu: envoye,
      });
      const frais = nombre(m.frais);
      if (frais > 0) {
        lignes.push({
          ...base,
          id: `frais:${m.id}`,
          sens: 'sortie',
          nature: 'frais_operateur',
          libelle:
            `Frais de transfert — mission ${m.mission.referenceInterne ?? ''}`.trim(),
          montant: frais,
          revenu: 0,
        });
      }
    }

    // --- Construction : dépenses de chantier validées ---
    const depenses = await this.prisma.depenseChantier.findMany({
      // Les matériaux payés directement par le client ne sont pas une sortie de MTM.
      where: { statut: 'valide', date: periode, payeParClient: false },
      select: {
        id: true,
        libelle: true,
        montant: true,
        date: true,
        modePaiement: true,
        reference: true,
        projet: { select: { id: true, referenceInterne: true } },
        intervenant: { select: { nom: true } },
      },
    });
    for (const d of depenses) {
      lignes.push({
        id: `depense:${d.id}`,
        date: d.date,
        activite: 'construction',
        sens: 'sortie',
        nature: 'depense_chantier',
        libelle: `${d.libelle} — chantier ${d.projet.referenceInterne}`,
        tiers: d.intervenant?.nom ?? null,
        reference: d.reference,
        mode: d.modePaiement,
        montant: nombre(d.montant),
        revenu: 0,
        lien: `/construction/chantiers/${d.projet.id}`,
      });
    }

    // --- Saisies manuelles validées ---
    const operations = await this.prisma.operationFinanciere.findMany({
      where: { statut: 'validee', date: periode },
    });
    for (const o of operations) {
      const recette = o.sens === 'recette';
      // Une avance ou un remboursement bouge de l'argent sans être une dépense ni un revenu.
      const definitive = o.nature === 'definitive';
      lignes.push({
        id: `operation:${o.id}`,
        date: o.date,
        activite: o.activite as Activite,
        sens: recette ? 'entree' : 'sortie',
        nature: definitive
          ? recette
            ? 'operation_recette'
            : 'operation_depense'
          : o.nature === 'avance'
            ? 'operation_avance'
            : 'operation_remboursement',
        libelle: o.libelle,
        tiers: o.tiers,
        reference: o.reference,
        mode: o.modePaiement,
        montant: nombre(o.montant),
        revenu: recette && definitive ? nombre(o.montant) : 0,
        lien: null,
        compteId: o.compteId,
        horsResultat: !definitive,
        numero: numeroOperation('OP', o.createdAt, o.numeroSeq),
        justifie: Boolean(o.justificatifKey),
      });
    }

    // --- Construction : paiements du client, validés par la comptabilité ---
    const paiementsChantier = await this.prisma.paiementChantier.findMany({
      where: { statut: 'valide', date: periode },
      select: {
        id: true,
        numeroSeq: true,
        montant: true,
        date: true,
        mode: true,
        reference: true,
        createdAt: true,
        justificatifKey: true,
        projet: {
          select: {
            id: true,
            referenceInterne: true,
            client: { select: { nom: true, prenom: true } },
          },
        },
      },
    });
    for (const c of paiementsChantier) {
      lignes.push({
        id: `chantier-recette:${c.id}`,
        date: c.date,
        activite: 'construction',
        sens: 'entree',
        nature: 'paiement_chantier',
        libelle: `Paiement client — chantier ${c.projet.referenceInterne}`,
        tiers: nomComplet(c.projet.client),
        reference: c.reference,
        mode: c.mode,
        montant: nombre(c.montant),
        revenu: nombre(c.montant),
        lien: `/construction/chantiers/${c.projet.id}`,
        numero: numeroOperation('PC', c.createdAt, c.numeroSeq),
        justifie: Boolean(c.justificatifKey),
      });
    }

    // --- Reversements aux propriétaires : l'argent d'un tiers, hors résultat de MTM ---
    const reversements = await this.prisma.reversementProprietaire.findMany({
      where: { statut: 'paye', datePaiement: periode },
      select: {
        id: true,
        numeroSeq: true,
        montant: true,
        datePaiement: true,
        modePaiement: true,
        reference: true,
        type: true,
        createdAt: true,
        justificatifKey: true,
        proprietaire: { select: { firstName: true, lastName: true } },
        dossierVente: { select: { id: true, referenceInterne: true } },
      },
    });
    for (const r of reversements) {
      const prefixe =
        r.type === 'avance' ? 'Avance au propriétaire' : 'Reversement';
      lignes.push({
        id: `reversement:${r.id}`,
        date: r.datePaiement as Date,
        activite: 'vente',
        sens: 'sortie',
        nature: 'reversement_proprietaire',
        libelle:
          `${prefixe} — dossier ${r.dossierVente.referenceInterne ?? ''}`.trim(),
        tiers: nomComplet(r.proprietaire),
        reference: r.reference,
        mode: r.modePaiement,
        montant: nombre(r.montant),
        revenu: 0,
        lien: `/ventes/${r.dossierVente.id}`,
        horsResultat: true,
        numero: numeroOperation('RP', r.createdAt, r.numeroSeq),
        justifie: Boolean(r.justificatifKey),
      });
    }

    // --- Désistements : remboursement du client, une sortie qui pèse sur le résultat ---
    const remboursements = await this.prisma.demandeRemboursement.findMany({
      where: { statut: 'payee', datePaiement: periode },
      select: {
        id: true,
        numeroSeq: true,
        montantRembourse: true,
        datePaiement: true,
        modePaiement: true,
        reference: true,
        createdAt: true,
        justificatifKey: true,
        dossierVente: {
          select: {
            id: true,
            referenceInterne: true,
            prospect: { select: { nom: true, prenom: true } },
          },
        },
      },
    });
    for (const r of remboursements) {
      lignes.push({
        id: `remboursement:${r.id}`,
        date: r.datePaiement as Date,
        activite: 'vente',
        sens: 'sortie',
        nature: 'remboursement_client',
        libelle:
          `Remboursement — dossier ${r.dossierVente.referenceInterne ?? ''}`.trim(),
        tiers: nomComplet(r.dossierVente.prospect),
        reference: r.reference,
        mode: r.modePaiement,
        montant: nombre(r.montantRembourse),
        revenu: 0,
        lien: `/ventes/${r.dossierVente.id}`,
        numero: numeroOperation('RB', r.createdAt, r.numeroSeq),
        justifie: Boolean(r.justificatifKey),
      });
    }

    lignes.sort((a, b) => a.date.getTime() - b.date.getTime());
    return { lignes, margesInconnues, tauxGestionDefaut: tauxDefaut };
  }

  private taux(tauxBien: unknown, defaut: number): number {
    return tauxBien === null || tauxBien === undefined
      ? defaut
      : nombre(tauxBien);
  }
}
