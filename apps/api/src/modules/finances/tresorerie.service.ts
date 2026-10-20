import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { nombre } from './finances.calculs';
import {
  CloturerCaisseDto,
  CreateCompteDto,
  CreateMouvementFondsDto,
  DecisionEcartDto,
  QueryCloturesCaisseDto,
  QueryMouvementsDto,
  UpdateCompteDto,
} from './dto/tresorerie.dto';
import { FluxFinanciersService } from './flux.service';
import type { FinanceUser } from './operations.service';
import { PeriodesFinancieresService } from './periodes.service';
import { PiecesService } from './pieces.service';
import {
  type CompteLeger,
  compteDuMode,
  type MouvementFondsLeger,
  ecartCaisse,
  fluxParCompte,
  jourSuivant,
  jourUtc,
  normaliserMode,
  numeroOperation,
  peutAutoriser,
  plafondDelegation,
  soldeTheorique,
} from './tresorerie.calculs';

const PERSONNE = {
  select: { id: true, firstName: true, lastName: true },
} as const;

const INCLUDE_MOUVEMENT = {
  createdBy: PERSONNE,
  remet: PERSONNE,
  recoit: PERSONNE,
  confirmePar: PERSONNE,
  compteSource: { select: { id: true, code: true, nom: true, type: true } },
  compteDestination: {
    select: { id: true, code: true, nom: true, type: true },
  },
} as const;

const INCLUDE_CLOTURE = {
  compte: { select: { id: true, code: true, nom: true, type: true } },
  parUser: PERSONNE,
  decisionPar: PERSONNE,
} as const;

const UN_JOUR = 24 * 3600 * 1000;

/** Un mouvement d'argent sur un compte, tel que le rapprochement bancaire le compare au relevé. */
export interface EvenementCompte {
  /** paiement:…, operation:…, fonds:… — stable d'un appel à l'autre. */
  id: string;
  date: Date;
  compteId: string;
  numero: string;
  libelle: string;
  tiers: string | null;
  reference: string | null;
  entree: number;
  sortie: number;
}

export const jourDe = (valeur: string): Date =>
  new Date(`${valeur.slice(0, 10)}T00:00:00.000Z`);

/**
 * Trésorerie : caisse, banques et portefeuilles mobiles suivis séparément,
 * remises de fonds sur bordereau, transferts entre comptes et clôture
 * quotidienne de la caisse. Les soldes ne sont jamais saisis : ils se
 * calculent à partir du solde initial du compte et des mouvements.
 */
@Injectable()
export class TresorerieService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flux: FluxFinanciersService,
    private readonly periodes: PeriodesFinancieresService,
    private readonly pieces: PiecesService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Le pouvoir d'autorisation de l'utilisateur : complet (droit « autoriser »)
   * ou limité à un plafond de délégation. L'écran s'en sert pour n'offrir le
   * bouton « Autoriser » qu'à ceux qui le peuvent ; le serveur tranche toujours.
   */
  async pouvoir(user: FinanceUser) {
    const delegations = await this.settings.getRawValue('finances.delegations');
    return {
      complet: user.permissions.includes('finances:autoriser'),
      plafondDelegation: plafondDelegation(delegations, user.id),
    };
  }

  // ------------------------------------------------------------------
  // Comptes
  // ------------------------------------------------------------------

  async creerCompte(dto: CreateCompteDto) {
    const code = dto.code.trim().toUpperCase();
    if (await this.prisma.compteTresorerie.findUnique({ where: { code } })) {
      throw new ConflictException('Ce code de compte existe déjà');
    }
    return this.prisma.compteTresorerie.create({
      data: {
        code,
        nom: dto.nom.trim(),
        type: dto.type,
        modes: this.modesPropres(dto.modes),
        soldeInitial: dto.soldeInitial ?? 0,
        ...(dto.dateSoldeInitial
          ? { dateSoldeInitial: jourDe(dto.dateSoldeInitial) }
          : {}),
      },
    });
  }

  async modifierCompte(id: string, dto: UpdateCompteDto) {
    await this.compte(id);
    return this.prisma.compteTresorerie.update({
      where: { id },
      data: {
        ...(dto.nom ? { nom: dto.nom.trim() } : {}),
        ...(dto.modes ? { modes: this.modesPropres(dto.modes) } : {}),
        ...(dto.actif !== undefined ? { actif: dto.actif } : {}),
      },
    });
  }

  private modesPropres(modes: string[]): string[] {
    return [...new Set(modes.map(normaliserMode).filter(Boolean))];
  }

  private async compte(id: string) {
    const compte = await this.prisma.compteTresorerie.findUnique({
      where: { id },
    });
    if (!compte)
      throw new NotFoundException('Compte de trésorerie introuvable');
    return compte;
  }

  // ------------------------------------------------------------------
  // Soldes
  // ------------------------------------------------------------------

  /**
   * Solde de chaque compte à la fin d'un jour, et vue consolidée. Les
   * mouvements dont le mode de paiement ne correspond à aucun compte sont
   * comptés à part : ils signalent un compte à créer ou un mode à rattacher.
   */
  async soldes(au?: string) {
    const fin = jourSuivant(au ? jourDe(au) : new Date());
    const comptes = await this.prisma.compteTresorerie.findMany({
      orderBy: [{ type: 'asc' }, { nom: 'asc' }],
    });
    if (comptes.length === 0) {
      return {
        au: new Date(fin.getTime() - UN_JOUR),
        comptes: [],
        consolide: { solde: 0, caisse: 0, banques: 0, mobile: 0 },
        sansCompte: { entrees: 0, sorties: 0, solde: 0 },
      };
    }
    const debut = new Date(
      Math.min(...comptes.map((c) => c.dateSoldeInitial.getTime())),
    );
    const { lignes } = await this.flux.collecter(debut, fin);
    const mouvements = await this.mouvementsConfirmes(debut, fin);
    const legers: CompteLeger[] = comptes.map((c) => ({
      id: c.id,
      modes: c.modes,
      actif: c.actif,
    }));

    const detail = comptes.map((c) => {
      const { parCompte } = fluxParCompte(
        lignes,
        mouvements,
        legers,
        c.dateSoldeInitial,
        fin,
      );
      const flux = parCompte.get(c.id) ?? { entrees: 0, sorties: 0 };
      return {
        id: c.id,
        code: c.code,
        nom: c.nom,
        type: c.type,
        modes: c.modes,
        actif: c.actif,
        soldeInitial: nombre(c.soldeInitial),
        dateSoldeInitial: c.dateSoldeInitial,
        entrees: flux.entrees,
        sorties: flux.sorties,
        solde: soldeTheorique(nombre(c.soldeInitial), flux),
      };
    });
    const { sansCompte } = fluxParCompte(lignes, [], legers, debut, fin);
    const somme = (types: string[]) =>
      detail
        .filter((c) => c.actif && types.includes(c.type))
        .reduce((total, c) => total + c.solde, 0);
    return {
      au: new Date(fin.getTime() - UN_JOUR),
      comptes: detail,
      consolide: {
        solde: detail
          .filter((c) => c.actif)
          .reduce((total, c) => total + c.solde, 0),
        caisse: somme(['caisse']),
        banques: somme(['banque']),
        mobile: somme(['wave', 'orange_money']),
      },
      sansCompte: {
        ...sansCompte,
        solde: sansCompte.entrees - sansCompte.sorties,
      },
    };
  }

  private async mouvementsConfirmes(
    du: Date,
    au: Date,
  ): Promise<MouvementFondsLeger[]> {
    const mouvements = await this.prisma.mouvementFonds.findMany({
      where: { statut: 'confirme', date: { gte: du, lt: au } },
      select: {
        compteSourceId: true,
        compteDestinationId: true,
        montant: true,
        date: true,
      },
    });
    return mouvements.map((m) => ({ ...m, montant: nombre(m.montant) }));
  }

  // ------------------------------------------------------------------
  // Remises de fonds, avances, remboursements, transferts
  // ------------------------------------------------------------------

  async listerMouvements(query: QueryMouvementsDto) {
    const where: Prisma.MouvementFondsWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.compteId
        ? {
            OR: [
              { compteSourceId: query.compteId },
              { compteDestinationId: query.compteId },
            ],
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.mouvementFonds.count({ where }),
      this.prisma.mouvementFonds.findMany({
        where,
        include: INCLUDE_MOUVEMENT,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: items.map((m) => this.presenterMouvement(m)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async creerMouvement(dto: CreateMouvementFondsDto, user: FinanceUser) {
    const date = jourDe(dto.date);
    if (date.getTime() > Date.now() + UN_JOUR) {
      throw new BadRequestException('La date ne peut pas être dans le futur');
    }
    await this.periodes.assertOuverte(date);
    const source = dto.compteSourceId;
    const destination = dto.compteDestinationId;
    if (source && source === destination) {
      throw new BadRequestException(
        'Le compte de départ et le compte d’arrivée doivent être différents',
      );
    }
    if (dto.type === 'transfert' && !(source && destination)) {
      throw new BadRequestException(
        'Un transfert précise le compte de départ et le compte d’arrivée',
      );
    }
    if (dto.type !== 'transfert' && !source && !destination) {
      throw new BadRequestException('Précisez au moins un compte concerné');
    }
    if (
      dto.type === 'remise_fonds' &&
      !((dto.remetId || dto.remetNom) && (dto.recoitId || dto.recoitNom))
    ) {
      throw new BadRequestException(
        'Un bordereau de remise de fonds nomme celui qui remet et celui qui reçoit',
      );
    }
    for (const id of [source, destination]) {
      if (id) {
        const compte = await this.compte(id);
        if (!compte.actif) {
          throw new BadRequestException(`Le compte ${compte.nom} est inactif`);
        }
      }
    }
    const mouvement = await this.prisma.mouvementFonds.create({
      data: {
        type: dto.type,
        compteSourceId: source ?? null,
        compteDestinationId: destination ?? null,
        montant: dto.montant,
        date,
        origine: dto.origine?.trim() || null,
        motif: dto.motif.trim(),
        remetId: dto.remetId ?? null,
        remetNom: dto.remetNom?.trim() || null,
        recoitId: dto.recoitId ?? null,
        recoitNom: dto.recoitNom?.trim() || null,
        reference: dto.reference?.trim() || null,
        createdById: user.id,
      },
      include: INCLUDE_MOUVEMENT,
    });
    await this.notifications.alerter(
      'finances:valider',
      {
        type: 'mouvement_fonds_a_confirmer',
        titre: `${LIBELLES_MOUVEMENT[dto.type] ?? 'Mouvement de fonds'} à confirmer`,
        message: `${dto.montant.toLocaleString('fr-FR')} FCFA — ${dto.motif.trim()}`,
        lien: '/finances/tresorerie',
        entityType: 'MouvementFonds',
        entityId: mouvement.id,
        dedupeKey: `mouvement-fonds:${mouvement.id}`,
      },
      user.id,
    );
    return this.presenterMouvement(mouvement);
  }

  async confirmerMouvement(id: string, user: FinanceUser) {
    const mouvement = await this.mouvement(id);
    if (mouvement.statut !== 'en_attente') {
      throw new ConflictException('Ce mouvement n’est plus en attente');
    }
    const deuxRegards = await this.settings.getBoolean(
      'finances.doubleValidation',
      true,
    );
    if (deuxRegards && mouvement.createdById === user.id) {
      throw new ForbiddenException(
        'Un mouvement de fonds est confirmé par une autre personne que celle qui l’a saisi',
      );
    }
    await this.periodes.assertOuverte(mouvement.date);
    const confirme = await this.prisma.mouvementFonds.update({
      where: { id },
      data: {
        statut: 'confirme',
        confirmeParId: user.id,
        confirmeLe: new Date(),
      },
      include: INCLUDE_MOUVEMENT,
    });
    return this.presenterMouvement(confirme);
  }

  async rejeterMouvement(id: string, motif: string, user: FinanceUser) {
    const mouvement = await this.mouvement(id);
    if (mouvement.statut !== 'en_attente') {
      throw new ConflictException('Ce mouvement n’est plus en attente');
    }
    const rejete = await this.prisma.mouvementFonds.update({
      where: { id },
      data: {
        statut: 'rejete',
        motifRejet: motif.trim(),
        confirmeParId: user.id,
        confirmeLe: new Date(),
      },
      include: INCLUDE_MOUVEMENT,
    });
    await this.notifications.notifier([mouvement.createdById], {
      type: 'mouvement_fonds_rejete',
      niveau: 'alerte',
      titre: 'Mouvement de fonds rejeté',
      message: motif.trim(),
      lien: '/finances/tresorerie',
      entityType: 'MouvementFonds',
      entityId: id,
    });
    return this.presenterMouvement(rejete);
  }

  async supprimerMouvement(id: string, user: FinanceUser): Promise<void> {
    const mouvement = await this.mouvement(id);
    if (mouvement.statut === 'confirme') {
      throw new ConflictException(
        'Un mouvement confirmé ne se supprime pas : enregistrez le mouvement inverse',
      );
    }
    if (
      mouvement.createdById !== user.id &&
      !user.permissions.includes('finances:administrer')
    ) {
      throw new ForbiddenException(
        'Seul l’auteur du mouvement ou l’administration des finances le supprime',
      );
    }
    await this.pieces.retirer(
      mouvement.justificatifKey,
      mouvement.justificatifType,
    );
    await this.prisma.mouvementFonds.delete({ where: { id } });
  }

  async joindreJustificatifMouvement(
    id: string,
    file: Express.Multer.File | undefined,
  ) {
    const mouvement = await this.mouvement(id);
    if (mouvement.statut === 'confirme') {
      throw new ConflictException(
        'La pièce d’un mouvement confirmé ne se remplace plus',
      );
    }
    const piece = await this.pieces.deposer(file, 'mouvements');
    const misAJour = await this.prisma.mouvementFonds.update({
      where: { id },
      data: { justificatifKey: piece.key, justificatifType: piece.type },
      include: INCLUDE_MOUVEMENT,
    });
    await this.pieces.retirer(
      mouvement.justificatifKey,
      mouvement.justificatifType,
    );
    return this.presenterMouvement(misAJour);
  }

  private async mouvement(id: string) {
    const mouvement = await this.prisma.mouvementFonds.findUnique({
      where: { id },
      include: INCLUDE_MOUVEMENT,
    });
    if (!mouvement) throw new NotFoundException('Mouvement introuvable');
    return mouvement;
  }

  private presenterMouvement(
    mouvement: Prisma.MouvementFondsGetPayload<{
      include: typeof INCLUDE_MOUVEMENT;
    }>,
  ) {
    const { justificatifKey, justificatifType, ...reste } = mouvement;
    return {
      ...reste,
      numero: numeroOperation('MF', mouvement.createdAt, mouvement.numeroSeq),
      montant: nombre(mouvement.montant),
      justificatifUrl: this.pieces.url(justificatifKey, justificatifType),
    };
  }

  // ------------------------------------------------------------------
  // Clôture quotidienne de caisse
  // ------------------------------------------------------------------

  async cloturerCaisse(dto: CloturerCaisseDto, user: FinanceUser) {
    const compte = await this.compte(dto.compteId);
    if (!compte.actif) {
      throw new BadRequestException(`Le compte ${compte.nom} est inactif`);
    }
    const jour = jourDe(dto.date);
    if (jour.getTime() > jourUtc(new Date()).getTime()) {
      throw new BadRequestException('On ne clôture pas un jour à venir');
    }
    if (jour < compte.dateSoldeInitial) {
      throw new BadRequestException(
        'Ce jour précède le solde initial du compte : il n’y a rien à clôturer',
      );
    }
    if (
      await this.prisma.clotureCaisse.findUnique({
        where: { compteId_date: { compteId: compte.id, date: jour } },
      })
    ) {
      throw new ConflictException('La caisse de ce jour est déjà clôturée');
    }

    const fin = jourSuivant(jour);
    const debut = compte.dateSoldeInitial;
    const [{ lignes }, mouvements, comptes] = await Promise.all([
      this.flux.collecter(debut, fin),
      this.mouvementsConfirmes(debut, fin),
      this.prisma.compteTresorerie.findMany({
        select: { id: true, modes: true, actif: true },
      }),
    ]);
    const avant = fluxParCompte(
      lignes,
      mouvements,
      comptes,
      debut,
      jour,
    ).parCompte;
    const duJour = fluxParCompte(
      lignes,
      mouvements,
      comptes,
      jour,
      fin,
    ).parCompte;
    const fluxAvant = avant.get(compte.id) ?? { entrees: 0, sorties: 0 };
    const fluxJour = duJour.get(compte.id) ?? { entrees: 0, sorties: 0 };
    const soldeInitial = soldeTheorique(nombre(compte.soldeInitial), fluxAvant);
    const theorique = soldeTheorique(soldeInitial, fluxJour);
    const ecart = ecartCaisse(dto.montantCompte, theorique);
    const explication = dto.explication?.trim() || null;
    if (ecart !== 0 && (explication?.length ?? 0) < 5) {
      throw new BadRequestException(
        `Il y a un écart de ${ecart.toLocaleString('fr-FR')} FCFA : expliquez-le avant de clôturer`,
      );
    }

    const cloture = await this.prisma.clotureCaisse.create({
      data: {
        compteId: compte.id,
        date: jour,
        soldeInitial,
        encaissements: fluxJour.entrees,
        decaissements: fluxJour.sorties,
        soldeTheorique: theorique,
        montantCompte: dto.montantCompte,
        ecart,
        explication,
        decision: ecart === 0 ? 'aucune' : 'en_attente',
        cloturePar: user.id,
      },
      include: INCLUDE_CLOTURE,
    });
    if (ecart !== 0) {
      await this.notifications.alerter(
        'finances:autoriser',
        {
          type: 'ecart_de_caisse',
          niveau: 'alerte',
          titre: `Écart de caisse : ${ecart.toLocaleString('fr-FR')} FCFA`,
          message: `${compte.nom}, ${jour.toISOString().slice(0, 10)} — ${explication}`,
          lien: '/finances/tresorerie',
          entityType: 'ClotureCaisse',
          entityId: cloture.id,
          dedupeKey: `ecart-caisse:${cloture.id}`,
        },
        user.id,
      );
    }
    return this.presenterCloture(cloture);
  }

  /**
   * Les mouvements d'argent qui touchent des comptes sur [debut, au[ : lignes
   * du journal rattachées à un compte (par compte imposé ou par mode de
   * paiement) et mouvements de fonds confirmés. Chacun porte un identifiant
   * stable, que le rapprochement bancaire conserve.
   */
  async evenementsComptes(
    compteIds: string[],
    debut: Date,
    au: Date,
  ): Promise<EvenementCompte[]> {
    if (compteIds.length === 0) return [];
    const voulus = new Set(compteIds);
    const [{ lignes }, fonds, tous] = await Promise.all([
      this.flux.collecter(debut, au),
      this.prisma.mouvementFonds.findMany({
        where: { statut: 'confirme', date: { gte: debut, lt: au } },
        select: {
          id: true,
          numeroSeq: true,
          createdAt: true,
          type: true,
          montant: true,
          date: true,
          motif: true,
          reference: true,
          compteSourceId: true,
          compteDestinationId: true,
          remetNom: true,
          recoitNom: true,
        },
      }),
      this.prisma.compteTresorerie.findMany({
        select: { id: true, modes: true, actif: true },
      }),
    ]);
    const evenements: EvenementCompte[] = [];
    for (const ligne of lignes) {
      const id = ligne.compteId ?? compteDuMode(ligne.mode, tous);
      if (!id || !voulus.has(id)) continue;
      evenements.push({
        id: ligne.id,
        date: ligne.date,
        compteId: id,
        numero: ligne.numero ?? '',
        libelle: ligne.libelle,
        tiers: ligne.tiers,
        reference: ligne.reference,
        entree: ligne.sens === 'entree' ? ligne.montant : 0,
        sortie: ligne.sens === 'sortie' ? ligne.montant : 0,
      });
    }
    for (const f of fonds) {
      for (const [id, sens] of [
        [f.compteSourceId, 'sortie'],
        [f.compteDestinationId, 'entree'],
      ] as const) {
        if (!id || !voulus.has(id)) continue;
        evenements.push({
          id: `fonds:${f.id}`,
          date: f.date,
          compteId: id,
          numero: numeroOperation('MF', f.createdAt, f.numeroSeq),
          libelle: `${f.type.replace(/_/g, ' ')} — ${f.motif}`,
          tiers: f.remetNom ?? f.recoitNom ?? null,
          reference: f.reference,
          entree: sens === 'entree' ? nombre(f.montant) : 0,
          sortie: sens === 'sortie' ? nombre(f.montant) : 0,
        });
      }
    }
    return evenements.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Situation de chaque compte actif pour un jour : solde initial du jour,
   * entrées, sorties et solde théorique. C'est ce que la clôture de caisse
   * compare à l'argent compté, et ce que le rapport du soir présente.
   */
  async situationsDuJour(jour: Date) {
    const fin = jourSuivant(jour);
    const comptes = await this.prisma.compteTresorerie.findMany({
      where: { actif: true },
      orderBy: [{ type: 'asc' }, { nom: 'asc' }],
    });
    if (comptes.length === 0) return [];
    const debut = new Date(
      Math.min(...comptes.map((c) => c.dateSoldeInitial.getTime())),
    );
    const { lignes } = await this.flux.collecter(debut, fin);
    const mouvements = await this.mouvementsConfirmes(debut, fin);
    const legers: CompteLeger[] = comptes.map((c) => ({
      id: c.id,
      modes: c.modes,
      actif: c.actif,
    }));
    return comptes.map((c) => {
      const avant = fluxParCompte(
        lignes,
        mouvements,
        legers,
        c.dateSoldeInitial,
        jour,
      ).parCompte.get(c.id) ?? { entrees: 0, sorties: 0 };
      const duJour = fluxParCompte(
        lignes,
        mouvements,
        legers,
        jour,
        fin,
      ).parCompte.get(c.id) ?? { entrees: 0, sorties: 0 };
      const soldeInitial =
        jour < c.dateSoldeInitial
          ? 0
          : soldeTheorique(nombre(c.soldeInitial), avant);
      return {
        compteId: c.id,
        compte: c.nom,
        type: c.type,
        soldeInitial,
        encaissements: duJour.entrees,
        decaissements: duJour.sorties,
        soldeTheorique: soldeTheorique(soldeInitial, duJour),
      };
    });
  }

  /** La Direction décide du sort d'un écart : jamais de régularisation silencieuse. */
  async deciderEcart(id: string, dto: DecisionEcartDto, user: FinanceUser) {
    const cloture = await this.prisma.clotureCaisse.findUnique({
      where: { id },
      include: INCLUDE_CLOTURE,
    });
    if (!cloture) throw new NotFoundException('Clôture introuvable');
    if (cloture.decision !== 'en_attente') {
      throw new ConflictException('Cet écart n’attend pas de décision');
    }
    const delegations = await this.settings.getRawValue('finances.delegations');
    if (
      !peutAutoriser(
        user.permissions,
        delegations,
        user.id,
        Math.abs(nombre(cloture.ecart)),
      )
    ) {
      throw new ForbiddenException(
        'Seule la Direction (ou un délégué habilité) décide d’un écart de caisse',
      );
    }
    const decidee = await this.prisma.clotureCaisse.update({
      where: { id },
      data: {
        decision: dto.decision,
        decisionMotif: dto.motif.trim(),
        decisionParId: user.id,
        decisionLe: new Date(),
      },
      include: INCLUDE_CLOTURE,
    });
    await this.notifications.notifier([cloture.cloturePar], {
      type: 'ecart_de_caisse_decide',
      titre: `Écart de caisse ${dto.decision === 'acceptee' ? 'accepté' : 'à corriger'}`,
      message: dto.motif.trim(),
      lien: '/finances/tresorerie',
      entityType: 'ClotureCaisse',
      entityId: id,
    });
    return this.presenterCloture(decidee);
  }

  async listerCloturesCaisse(query: QueryCloturesCaisseDto) {
    const where: Prisma.ClotureCaisseWhereInput = {
      ...(query.compteId ? { compteId: query.compteId } : {}),
      ...(query.decision ? { decision: query.decision } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.clotureCaisse.count({ where }),
      this.prisma.clotureCaisse.findMany({
        where,
        include: INCLUDE_CLOTURE,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: items.map((c) => this.presenterCloture(c)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async joindreJustificatifCloture(
    id: string,
    file: Express.Multer.File | undefined,
  ) {
    const cloture = await this.prisma.clotureCaisse.findUnique({
      where: { id },
      include: INCLUDE_CLOTURE,
    });
    if (!cloture) throw new NotFoundException('Clôture introuvable');
    if (cloture.decision === 'acceptee') {
      throw new ConflictException('Un écart accepté ne se documente plus');
    }
    const piece = await this.pieces.deposer(file, 'clotures-caisse');
    const misAJour = await this.prisma.clotureCaisse.update({
      where: { id },
      data: { justificatifKey: piece.key, justificatifType: piece.type },
      include: INCLUDE_CLOTURE,
    });
    await this.pieces.retirer(
      cloture.justificatifKey,
      cloture.justificatifType,
    );
    return this.presenterCloture(misAJour);
  }

  /**
   * Jours des quinze derniers jours (hors dimanche et aujourd'hui) où une
   * caisse n'a pas été clôturée : la clôture est obligatoire, même sans opération.
   */
  async joursNonClotures(jours = 15, maintenant = new Date()) {
    const caisses = await this.prisma.compteTresorerie.findMany({
      where: { actif: true, type: 'caisse' },
      select: { id: true, nom: true, dateSoldeInitial: true },
    });
    if (caisses.length === 0) return [];
    const aujourdhui = jourUtc(maintenant);
    const depuis = new Date(aujourdhui.getTime() - jours * UN_JOUR);
    const faites = await this.prisma.clotureCaisse.findMany({
      where: {
        compteId: { in: caisses.map((c) => c.id) },
        date: { gte: depuis, lt: aujourdhui },
      },
      select: { compteId: true, date: true },
    });
    const dejaFaites = new Set(
      faites.map((c) => `${c.compteId}:${c.date.toISOString().slice(0, 10)}`),
    );
    const manquants: Array<{ compteId: string; compte: string; date: string }> =
      [];
    for (let i = jours; i >= 1; i -= 1) {
      const jour = new Date(aujourdhui.getTime() - i * UN_JOUR);
      if (jour.getUTCDay() === 0) continue;
      const iso = jour.toISOString().slice(0, 10);
      for (const caisse of caisses) {
        if (jour < caisse.dateSoldeInitial) continue;
        if (!dejaFaites.has(`${caisse.id}:${iso}`)) {
          manquants.push({
            compteId: caisse.id,
            compte: caisse.nom,
            date: iso,
          });
        }
      }
    }
    return manquants;
  }

  private presenterCloture(
    cloture: Prisma.ClotureCaisseGetPayload<{
      include: typeof INCLUDE_CLOTURE;
    }>,
  ) {
    const { justificatifKey, justificatifType, ...reste } = cloture;
    return {
      ...reste,
      soldeInitial: nombre(cloture.soldeInitial),
      encaissements: nombre(cloture.encaissements),
      decaissements: nombre(cloture.decaissements),
      soldeTheorique: nombre(cloture.soldeTheorique),
      montantCompte: nombre(cloture.montantCompte),
      ecart: nombre(cloture.ecart),
      justificatifUrl: this.pieces.url(justificatifKey, justificatifType),
    };
  }
}

export const LIBELLES_MOUVEMENT: Record<string, string> = {
  transfert: 'Transfert entre comptes',
  remise_fonds: 'Remise de fonds',
  avance: 'Avance de fonds',
  remboursement: 'Remboursement',
};
