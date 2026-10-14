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
        dossierVente: {
          select: {
            id: true,
            referenceInterne: true,
            prixVente: true,
            prospect: { select: { nom: true, prenom: true } },
            terrain: { select: { marge: true } },
          },
        },
      },
    });
    for (const p of paiements) {
      const montant = nombre(p.montant);
      const dossier = p.dossierVente;
      const marge =
        dossier.terrain?.marge === null || dossier.terrain?.marge === undefined
          ? null
          : nombre(dossier.terrain.marge);
      if (marge === null) margesInconnues += 1;
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
        revenu: margeReconnue(marge, montant, nombre(dossier.prixVente)),
        lien: `/ventes/${dossier.id}`,
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

    // --- Séjours à la nuit ---
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
      where: { statut: 'valide', date: periode },
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
      lignes.push({
        id: `operation:${o.id}`,
        date: o.date,
        activite: o.activite as Activite,
        sens: recette ? 'entree' : 'sortie',
        nature: recette ? 'operation_recette' : 'operation_depense',
        libelle: o.libelle,
        tiers: o.tiers,
        reference: o.reference,
        mode: o.modePaiement,
        montant: nombre(o.montant),
        revenu: recette ? nombre(o.montant) : 0,
        lien: null,
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
