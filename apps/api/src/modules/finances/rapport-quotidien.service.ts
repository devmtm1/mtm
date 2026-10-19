import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CompanyProfileService } from '../company/company-profile.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { type LigneJournal, nombre } from './finances.calculs';
import { FinancesService } from './finances.service';
import { FluxFinanciersService } from './flux.service';
import type { FinanceUser } from './operations.service';
import {
  type RapportQuotidienContenu,
  renderRapportQuotidien,
} from './rapport-quotidien-renderer';
import { ReversementsService } from './reversements.service';
import { TresorerieService, jourDe } from './tresorerie.service';
import { jourSuivant, normaliserMode } from './tresorerie.calculs';

const PERSONNE = {
  select: { id: true, firstName: true, lastName: true },
} as const;

const nomComplet = (
  p?: { firstName?: string | null; lastName?: string | null } | null,
): string =>
  [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim() || '—';

const NATURES_DEPENSE = new Set([
  'operation_depense',
  'depense_chantier',
  'commission_commercial',
  'frais_operateur',
  'remboursement_client',
]);

/**
 * Rapport financier du soir : préparé par la comptable, vérifié, puis transmis
 * à la Direction générale. Il se construit à partir des mouvements du jour et
 * se fige à la transmission. Un jour sans opération donne quand même un
 * rapport, qui le dit et indique où en est la clôture de caisse.
 */
@Injectable()
export class RapportQuotidienService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flux: FluxFinanciersService,
    private readonly finances: FinancesService,
    private readonly tresorerie: TresorerieService,
    private readonly reversements: ReversementsService,
    private readonly company: CompanyProfileService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
  ) {}

  /** Le contenu du jour, calculé à l'instant (rien n'est enregistré). */
  async construire(jourIso: string): Promise<RapportQuotidienContenu> {
    const jour = jourDe(jourIso);
    const fin = jourSuivant(jour);
    const { lignes } = await this.flux.collecter(jour, fin);

    const [
      situations,
      clotures,
      operationsDuJour,
      aEncaisser,
      situationProprietaires,
      reversementsAttente,
      reversementsAPayer,
      operationsAttente,
      paiementsVenteAttente,
      mouvementsAttente,
      paiementsChantierAttente,
      ecartsOuverts,
      joursNonClotures,
      sansPiece,
    ] = await Promise.all([
      this.tresorerie.situationsDuJour(jour),
      this.prisma.clotureCaisse.findMany({ where: { date: jour } }),
      this.prisma.operationFinanciere.findMany({
        where: { date: jour, statut: 'validee', sens: 'depense' },
        include: { autorisePar: PERSONNE },
      }),
      this.finances.aEncaisser(new Date(), 0),
      this.reversements.situations(),
      this.prisma.reversementProprietaire.count({
        where: { statut: 'en_attente' },
      }),
      this.prisma.reversementProprietaire.aggregate({
        where: { statut: 'autorise' },
        _sum: { montant: true },
      }),
      this.prisma.operationFinanciere.count({
        where: { statut: 'en_attente' },
      }),
      this.prisma.paiement.count({ where: { statut: 'en_attente' } }),
      this.prisma.mouvementFonds.count({ where: { statut: 'en_attente' } }),
      this.prisma.paiementChantier.count({ where: { statut: 'en_attente' } }),
      this.prisma.clotureCaisse.count({
        where: { decision: { in: ['en_attente', 'a_corriger'] } },
      }),
      this.tresorerie.joursNonClotures(),
      this.prisma.operationFinanciere.count({
        where: {
          sens: 'depense',
          justificatifKey: null,
          statut: { in: ['en_attente', 'validee'] },
        },
      }),
    ]);

    const parOperation = new Map(operationsDuJour.map((o) => [o.numeroSeq, o]));
    const numeroSeq = (l: LigneJournal): number | null => {
      const m = /-(\d{6})$/.exec(l.numero ?? '');
      return m ? Number(m[1]) : null;
    };

    // Encaissements par moyen de paiement.
    const modes = new Map<string, { montant: number; nombre: number }>();
    for (const l of lignes.filter((x) => x.sens === 'entree')) {
      const cle = normaliserMode(l.mode) || 'non_precise';
      const courant = modes.get(cle) ?? { montant: 0, nombre: 0 };
      modes.set(cle, {
        montant: courant.montant + l.montant,
        nombre: courant.nombre + 1,
      });
    }

    const depenses = lignes
      .filter((l) => l.sens === 'sortie' && NATURES_DEPENSE.has(l.nature))
      .map((l) => {
        const operation =
          l.nature === 'operation_depense'
            ? parOperation.get(numeroSeq(l) ?? -1)
            : undefined;
        const niveau = operation?.niveauValidation ?? 0;
        return {
          numero: l.numero ?? null,
          libelle: l.libelle,
          tiers: l.tiers,
          montant: l.montant,
          mode: l.mode,
          autorisation: operation?.autorisePar
            ? `${nomComplet(operation.autorisePar)}${operation.autorisationDistance ? ' (à distance)' : ''}`
            : niveau === 0
              ? 'comptable'
              : '—',
          justifie: l.justifie !== false,
        };
      });

    const caisses = situations.map((s) => {
      const cloture = clotures.find((c) => c.compteId === s.compteId);
      return {
        compte: s.compte,
        type: s.type,
        soldeInitial: s.soldeInitial,
        encaissements: s.encaissements,
        decaissements: s.decaissements,
        soldeTheorique: s.soldeTheorique,
        cloture: Boolean(cloture),
        montantCompte: cloture ? nombre(cloture.montantCompte) : null,
        ecart: cloture ? nombre(cloture.ecart) : null,
        explication: cloture?.explication ?? null,
        decision: cloture?.decision ?? null,
      };
    });

    const anomalies: string[] = [];
    for (const c of caisses.filter((x) => x.type === 'caisse' && !x.cloture)) {
      anomalies.push(
        `La caisse « ${c.compte} » n’est pas clôturée pour ce jour.`,
      );
    }
    if (ecartsOuverts > 0) {
      anomalies.push(
        `${ecartsOuverts} écart(s) de caisse attendent une décision de la Direction.`,
      );
    }
    if (joursNonClotures.length > 0) {
      anomalies.push(
        `${joursNonClotures.length} jour(s) de caisse non clôturés sur les 15 derniers jours.`,
      );
    }
    if (sansPiece > 0) {
      anomalies.push(`${sansPiece} dépense(s) sans pièce justificative.`);
    }
    for (const l of lignes.filter(
      (x) => x.justifie === false && !NATURES_DEPENSE.has(x.nature),
    )) {
      anomalies.push(`Pièce manquante : ${l.libelle}.`);
    }

    return {
      date: jourIso,
      genereLe: new Date().toISOString(),
      aucuneOperation: lignes.length === 0,
      caisses,
      encaissementsParMode: [...modes.entries()].map(([mode, v]) => ({
        mode,
        ...v,
      })),
      depenses,
      ventes: lignes
        .filter((l) => l.nature === 'encaissement_vente')
        .map((l) => ({
          libelle: l.libelle,
          tiers: l.tiers,
          montant: l.montant,
          mode: l.mode,
          reference: l.reference,
        })),
      reversements: {
        payes: lignes
          .filter((l) => l.nature === 'reversement_proprietaire')
          .map((l) => ({
            libelle: l.libelle,
            tiers: l.tiers,
            montant: l.montant,
            mode: l.mode,
            reference: l.reference,
          })),
        soldeDu: situationProprietaires.totaux.soldeRestant,
        aPayer: nombre(reversementsAPayer._sum.montant),
        enAttenteAutorisation: reversementsAttente,
      },
      chantiers: {
        recettes: lignes
          .filter((l) => l.nature === 'paiement_chantier')
          .map((l) => ({
            libelle: l.libelle,
            tiers: l.tiers,
            montant: l.montant,
          })),
        depenses: lignes
          .filter((l) => l.nature === 'depense_chantier')
          .map((l) => ({
            libelle: l.libelle,
            tiers: l.tiers,
            montant: l.montant,
          })),
      },
      creances: {
        loyers: aEncaisser.loyers.total,
        ventes: aEncaisser.ventes.total,
        missions: aEncaisser.missions.total,
        echeancesEnRetard: aEncaisser.loyers.nombre + aEncaisser.ventes.nombre,
      },
      justificatifsManquants: lignes
        .filter((l) => l.justifie === false)
        .map((l) => ({
          numero: l.numero ?? null,
          libelle: l.libelle,
          montant: l.montant,
        })),
      enAttente: {
        operations: operationsAttente,
        paiementsVente: paiementsVenteAttente,
        mouvementsFonds: mouvementsAttente,
        reversements: reversementsAttente,
        paiementsChantier: paiementsChantierAttente,
      },
      anomalies,
    };
  }

  /** Le rapport d'un jour : l'enregistré s'il existe, sinon un aperçu calculé à l'instant. */
  async obtenir(jourIso: string) {
    const enregistre = await this.prisma.rapportQuotidien.findUnique({
      where: { date: jourDe(jourIso) },
      include: { prepare: PERSONNE, verifiePar: PERSONNE },
    });
    if (enregistre) {
      return {
        id: enregistre.id,
        date: jourIso,
        statut: enregistre.statut,
        enregistre: true,
        preparePar: nomComplet(enregistre.prepare),
        verifiePar: enregistre.verifiePar
          ? nomComplet(enregistre.verifiePar)
          : null,
        verifieLe: enregistre.verifieLe,
        transmisLe: enregistre.transmisLe,
        contenu: enregistre.contenu as unknown as RapportQuotidienContenu,
      };
    }
    return {
      id: null,
      date: jourIso,
      statut: 'apercu',
      enregistre: false,
      preparePar: null,
      verifiePar: null,
      verifieLe: null,
      transmisLe: null,
      contenu: await this.construire(jourIso),
    };
  }

  async lister(limite = 30) {
    const rapports = await this.prisma.rapportQuotidien.findMany({
      orderBy: { date: 'desc' },
      take: limite,
      include: { prepare: PERSONNE },
    });
    return rapports.map((r) => ({
      id: r.id,
      date: r.date.toISOString().slice(0, 10),
      statut: r.statut,
      preparePar: nomComplet(r.prepare),
      transmisLe: r.transmisLe,
      aucuneOperation: (r.contenu as unknown as RapportQuotidienContenu)
        .aucuneOperation,
    }));
  }

  /** Prépare (ou rafraîchit) le brouillon du jour. Un rapport transmis ne se refait plus. */
  async preparer(jourIso: string, user: FinanceUser) {
    const date = jourDe(jourIso);
    const existant = await this.prisma.rapportQuotidien.findUnique({
      where: { date },
    });
    if (existant && existant.statut === 'transmis') {
      throw new ConflictException(
        'Ce rapport est déjà transmis à la Direction : il ne se modifie plus',
      );
    }
    const contenu = (await this.construire(
      jourIso,
    )) as unknown as Prisma.InputJsonObject;
    await this.prisma.rapportQuotidien.upsert({
      where: { date },
      create: { date, contenu, preparePar: user.id },
      // Un contenu rafraîchi n'est plus « vérifié » : il faut le revérifier.
      update: {
        contenu,
        statut: 'brouillon',
        verifieParId: null,
        verifieLe: null,
      },
    });
    return this.obtenir(jourIso);
  }

  async verifier(jourIso: string, user: FinanceUser) {
    const rapport = await this.prisma.rapportQuotidien.findUnique({
      where: { date: jourDe(jourIso) },
    });
    if (!rapport) {
      throw new ConflictException('Préparez d’abord le rapport de ce jour');
    }
    if (rapport.statut !== 'brouillon') {
      throw new ConflictException('Ce rapport n’est plus un brouillon');
    }
    const deuxRegards = await this.settings.getBoolean(
      'finances.doubleValidation',
      true,
    );
    if (deuxRegards && rapport.preparePar === user.id) {
      throw new ForbiddenException(
        'Un rapport est vérifié par une autre personne que celle qui l’a préparé',
      );
    }
    await this.prisma.rapportQuotidien.update({
      where: { id: rapport.id },
      data: {
        statut: 'verifie',
        verifieParId: user.id,
        verifieLe: new Date(),
      },
    });
    return this.obtenir(jourIso);
  }

  /** Transmet à la Direction : le contenu est recalculé une dernière fois puis fige. */
  async transmettre(jourIso: string, user: FinanceUser) {
    const date = jourDe(jourIso);
    const rapport = await this.prisma.rapportQuotidien.findUnique({
      where: { date },
    });
    if (!rapport) {
      throw new ConflictException('Préparez d’abord le rapport de ce jour');
    }
    if (rapport.statut === 'transmis') {
      throw new ConflictException('Ce rapport est déjà transmis');
    }
    const contenu = (await this.construire(
      jourIso,
    )) as unknown as Prisma.InputJsonObject;
    await this.prisma.rapportQuotidien.update({
      where: { id: rapport.id },
      data: { contenu, statut: 'transmis', transmisLe: new Date() },
    });
    const fige = contenu as unknown as RapportQuotidienContenu;
    await this.notifications.alerter(
      'finances:autoriser',
      {
        type: 'rapport_quotidien',
        titre: `Rapport financier du ${jourIso}`,
        message: fige.aucuneOperation
          ? 'Aucune opération enregistrée ce jour.'
          : `${fige.anomalies.length} anomalie(s) à traiter — consultez le rapport.`,
        lien: '/finances/rapport-quotidien',
        entityType: 'RapportQuotidien',
        entityId: rapport.id,
        dedupeKey: `rapport-quotidien:${jourIso}`,
      },
      user.id,
    );
    return this.obtenir(jourIso);
  }

  async pdf(jourIso: string): Promise<{ nom: string; contenu: Buffer }> {
    const rapport = await this.obtenir(jourIso);
    const company = await this.company.getSociete();
    return {
      nom: `rapport-financier_${jourIso}.pdf`,
      contenu: renderRapportQuotidien({
        statut: rapport.statut === 'apercu' ? 'brouillon' : rapport.statut,
        preparePar: rapport.preparePar ?? 'aperçu non enregistré',
        verifiePar: rapport.verifiePar,
        contenu: rapport.contenu,
        company,
      }),
    };
  }
}
