import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { jourIso, nombre } from './finances.calculs';
import type { FinanceUser } from './operations.service';
import {
  FENETRE_JOURS,
  type EvenementRapprochable,
  appariementAutomatique,
  candidats,
  empreintes,
  lireReleveCsv,
} from './rapprochement.calculs';
import { TresorerieService, jourDe } from './tresorerie.service';
import { jourSuivant, jourUtc } from './tresorerie.calculs';

const UN_JOUR = 24 * 3600 * 1000;
/** Taille maximale d'un relevé importé. */
const TAILLE_MAX = 2 * 1024 * 1024;
/** Écart de dates qu'on accepte à la main, au-delà de la fenêtre des suggestions. */
const ECART_MANUEL_JOURS = 31;
const PERIODE_DEFAUT_JOURS = 60;

const PERSONNE = {
  select: { id: true, firstName: true, lastName: true },
} as const;

type LigneAvecAuteurs = Prisma.ReleveLigneGetPayload<{
  include: { importePar: typeof PERSONNE; rapprochePar: typeof PERSONNE };
}>;

/**
 * Rapprochement bancaire : on importe le relevé de la banque (ou l'historique
 * Wave / Orange Money), puis chaque ligne est mise en face du mouvement du
 * logiciel qu'elle confirme. Une transaction ne se tient pas pour confirmée sur
 * la seule foi d'une capture d'écran : ce qui n'est pas rapproché reste signalé.
 */
@Injectable()
export class RapprochementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tresorerie: TresorerieService,
  ) {}

  private async compte(compteId: string) {
    const compte = await this.prisma.compteTresorerie.findUnique({
      where: { id: compteId },
    });
    if (!compte)
      throw new NotFoundException('Compte de trésorerie introuvable');
    return compte;
  }

  private periode(
    du?: string,
    au?: string,
  ): { du: Date; au: Date; auInclus: Date } {
    const dernier = au ? jourDe(au) : jourUtc(new Date());
    const debut = du
      ? jourDe(du)
      : new Date(dernier.getTime() - PERIODE_DEFAUT_JOURS * UN_JOUR);
    if (!(dernier >= debut)) {
      throw new BadRequestException('La fin de la période précède son début');
    }
    return { du: debut, au: jourSuivant(dernier), auInclus: dernier };
  }

  private presenter(ligne: LigneAvecAuteurs) {
    return {
      id: ligne.id,
      date: ligne.date,
      libelle: ligne.libelle,
      reference: ligne.reference,
      montant: nombre(ligne.montant),
      statut: ligne.statut,
      mouvementId: ligne.mouvementId,
      mouvementLibelle: ligne.mouvementLibelle,
      motifIgnore: ligne.motifIgnore,
      rapprochePar: ligne.rapprochePar,
      rapprocheLe: ligne.rapprocheLe,
      importePar: ligne.importePar,
      importeLe: ligne.importeLe,
    };
  }

  /** Les mouvements du compte déjà mis en face d'une ligne du relevé. */
  private async idsRapproches(compteId: string): Promise<Set<string>> {
    const lignes = await this.prisma.releveLigne.findMany({
      where: { compteId, statut: 'rapproche', mouvementId: { not: null } },
      select: { mouvementId: true },
    });
    return new Set(lignes.map((l) => l.mouvementId as string));
  }

  private rapprochables(
    evenements: Awaited<ReturnType<TresorerieService['evenementsComptes']>>,
  ): EvenementRapprochable[] {
    return evenements.map((e) => ({
      id: e.id,
      date: e.date,
      numero: e.numero,
      libelle: e.libelle,
      tiers: e.tiers,
      reference: e.reference,
      entree: e.entree,
      sortie: e.sortie,
    }));
  }

  // ------------------------------------------------------------------

  async importer(
    compteId: string,
    file: Express.Multer.File | undefined,
    user: FinanceUser,
  ) {
    const compte = await this.compte(compteId);
    if (!compte.actif) {
      throw new BadRequestException(`Le compte ${compte.nom} est inactif`);
    }
    if (compte.type === 'caisse') {
      throw new BadRequestException(
        'Une caisse n’a pas de relevé : elle se vérifie par la clôture quotidienne',
      );
    }
    if (!file) throw new BadRequestException('Un fichier CSV est obligatoire');
    if (file.size > TAILLE_MAX) {
      throw new BadRequestException('Le relevé dépasse 2 Mo : découpez-le');
    }
    const { lignes, erreurs } = lireReleveCsv(file.buffer.toString('utf8'));
    if (lignes.length === 0) {
      throw new BadRequestException(
        erreurs[0]?.message ?? 'Aucune ligne exploitable dans ce fichier',
      );
    }
    const cles = empreintes(lignes);
    const cree = await this.prisma.releveLigne.createMany({
      data: lignes.map((l, index) => ({
        compteId,
        date: l.date,
        libelle: l.libelle.slice(0, 300),
        reference: l.reference?.slice(0, 120) ?? null,
        montant: l.montant,
        empreinte: cles[index],
        importeParId: user.id,
      })),
      skipDuplicates: true,
    });
    return {
      compte: compte.nom,
      lues: lignes.length,
      importees: cree.count,
      dejaImportees: lignes.length - cree.count,
      erreurs,
    };
  }

  async etat(compteId: string, du?: string, au?: string) {
    const compte = await this.compte(compteId);
    const periode = this.periode(du, au);
    const marge = FENETRE_JOURS * UN_JOUR;

    const [releves, rapproches, evenements] = await Promise.all([
      this.prisma.releveLigne.findMany({
        where: { compteId, date: { gte: periode.du, lt: periode.au } },
        include: { importePar: PERSONNE, rapprochePar: PERSONNE },
        orderBy: [{ date: 'desc' }, { importeLe: 'desc' }],
        take: 1000,
      }),
      this.idsRapproches(compteId),
      this.tresorerie.evenementsComptes(
        [compteId],
        new Date(
          Math.max(
            periode.du.getTime() - marge,
            compte.dateSoldeInitial.getTime(),
          ),
        ),
        new Date(periode.au.getTime() + marge),
      ),
    ]);
    const libres = this.rapprochables(evenements);

    const lignes = releves.map((ligne) => ({
      ...this.presenter(ligne),
      suggestions:
        ligne.statut === 'non_rapproche'
          ? candidats(
              {
                date: ligne.date,
                libelle: ligne.libelle,
                reference: ligne.reference,
                montant: nombre(ligne.montant),
              },
              libres,
              rapproches,
            )
              .slice(0, 3)
              .map((c) => ({
                id: c.evenement.id,
                numero: c.evenement.numero,
                libelle: c.evenement.libelle,
                date: c.evenement.date,
                referenceCommune: c.referenceCommune,
                ecartJours: c.ecartJours,
              }))
          : [],
    }));

    const nonRapprochesJournal = evenements
      .filter(
        (e) =>
          !rapproches.has(e.id) && e.date >= periode.du && e.date < periode.au,
      )
      .map((e) => ({
        id: e.id,
        date: e.date,
        numero: e.numero,
        libelle: e.libelle,
        tiers: e.tiers,
        reference: e.reference,
        montant: e.entree > 0 ? e.entree : -e.sortie,
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    const aRapprocher = lignes.filter((l) => l.statut === 'non_rapproche');
    return {
      compte: {
        id: compte.id,
        nom: compte.nom,
        type: compte.type,
        code: compte.code,
      },
      periode: { du: periode.du, au: periode.auInclus },
      lignes,
      mouvementsNonRapproches: nonRapprochesJournal,
      resume: {
        lignes: lignes.length,
        rapprochees: lignes.filter((l) => l.statut === 'rapproche').length,
        ignorees: lignes.filter((l) => l.statut === 'ignore').length,
        nonRapprochees: aRapprocher.length,
        montantNonRapproche: aRapprocher.reduce((t, l) => t + l.montant, 0),
        mouvementsNonRapproches: nonRapprochesJournal.length,
        montantMouvementsNonRapproches: nonRapprochesJournal.reduce(
          (t, m) => t + m.montant,
          0,
        ),
      },
    };
  }

  /** Rapproche d'un coup tout ce qui ne souffre aucune ambiguïté. */
  async rapprocherAutomatiquement(
    compteId: string,
    du: string | undefined,
    au: string | undefined,
    user: FinanceUser,
  ) {
    const compte = await this.compte(compteId);
    const periode = this.periode(du, au);
    const marge = FENETRE_JOURS * UN_JOUR;
    const [releves, rapproches, evenements] = await Promise.all([
      this.prisma.releveLigne.findMany({
        where: {
          compteId,
          statut: 'non_rapproche',
          date: { gte: periode.du, lt: periode.au },
        },
      }),
      this.idsRapproches(compteId),
      this.tresorerie.evenementsComptes(
        [compteId],
        new Date(
          Math.max(
            periode.du.getTime() - marge,
            compte.dateSoldeInitial.getTime(),
          ),
        ),
        new Date(periode.au.getTime() + marge),
      ),
    ]);
    const libres = this.rapprochables(evenements);
    const parId = new Map(libres.map((e) => [e.id, e]));
    const paires = appariementAutomatique(
      releves.map((l) => ({
        id: l.id,
        date: l.date,
        libelle: l.libelle,
        reference: l.reference,
        montant: nombre(l.montant),
      })),
      libres,
      rapproches,
    );
    const maintenant = new Date();
    await this.prisma.$transaction(
      paires.map((p) =>
        this.prisma.releveLigne.update({
          where: { id: p.ligneId },
          data: {
            statut: 'rapproche',
            mouvementId: p.evenementId,
            mouvementLibelle: parId.get(p.evenementId)?.libelle ?? null,
            rapprocheParId: user.id,
            rapprocheLe: maintenant,
          },
        }),
      ),
    );
    return {
      rapprochees: paires.length,
      restantes: releves.length - paires.length,
    };
  }

  async rapprocher(ligneId: string, mouvementId: string, user: FinanceUser) {
    const ligne = await this.charger(ligneId);
    if (ligne.statut !== 'non_rapproche') {
      throw new ConflictException('Cette ligne est déjà traitée');
    }
    const marge = ECART_MANUEL_JOURS * UN_JOUR;
    const evenements = await this.tresorerie.evenementsComptes(
      [ligne.compteId],
      new Date(ligne.date.getTime() - marge),
      new Date(ligne.date.getTime() + marge + UN_JOUR),
    );
    const evenement = evenements.find((e) => e.id === mouvementId);
    if (!evenement) {
      throw new NotFoundException(
        'Ce mouvement n’existe pas sur ce compte, ou il est trop éloigné de la date de la ligne',
      );
    }
    const montant = nombre(ligne.montant);
    const memeMontant =
      montant > 0
        ? evenement.entree === montant
        : evenement.sortie === -montant;
    if (!memeMontant) {
      throw new BadRequestException(
        `Le montant ne correspond pas : le relevé indique ${montant.toLocaleString('fr-FR')} FCFA, le mouvement ${(evenement.entree || -evenement.sortie).toLocaleString('fr-FR')} FCFA. Corrigez le mouvement ou la saisie avant de rapprocher.`,
      );
    }
    if ((await this.idsRapproches(ligne.compteId)).has(mouvementId)) {
      throw new ConflictException(
        'Ce mouvement est déjà rapproché d’une autre ligne du relevé',
      );
    }
    const misAJour = await this.prisma.releveLigne.update({
      where: { id: ligneId },
      data: {
        statut: 'rapproche',
        mouvementId,
        mouvementLibelle: evenement.libelle,
        rapprocheParId: user.id,
        rapprocheLe: new Date(),
      },
      include: { importePar: PERSONNE, rapprochePar: PERSONNE },
    });
    return this.presenter(misAJour);
  }

  /** Une ligne qui n'a pas de mouvement (frais, intérêts…) : ignorée avec son motif, jamais effacée. */
  async ignorer(ligneId: string, motif: string, user: FinanceUser) {
    const ligne = await this.charger(ligneId);
    if (ligne.statut !== 'non_rapproche') {
      throw new ConflictException('Cette ligne est déjà traitée');
    }
    const misAJour = await this.prisma.releveLigne.update({
      where: { id: ligneId },
      data: {
        statut: 'ignore',
        motifIgnore: motif.trim(),
        rapprocheParId: user.id,
        rapprocheLe: new Date(),
      },
      include: { importePar: PERSONNE, rapprochePar: PERSONNE },
    });
    return this.presenter(misAJour);
  }

  async annuler(ligneId: string) {
    const ligne = await this.charger(ligneId);
    if (ligne.statut === 'non_rapproche') {
      throw new ConflictException('Cette ligne n’est pas rapprochée');
    }
    const misAJour = await this.prisma.releveLigne.update({
      where: { id: ligneId },
      data: {
        statut: 'non_rapproche',
        mouvementId: null,
        mouvementLibelle: null,
        motifIgnore: null,
        rapprocheParId: null,
        rapprocheLe: null,
      },
      include: { importePar: PERSONNE, rapprochePar: PERSONNE },
    });
    return this.presenter(misAJour);
  }

  /** Ce que la Direction doit voir : des lignes de relevé que personne n'a rapprochées. */
  async resume() {
    const [total, plusAncienne] = await Promise.all([
      this.prisma.releveLigne.count({ where: { statut: 'non_rapproche' } }),
      this.prisma.releveLigne.findFirst({
        where: { statut: 'non_rapproche' },
        orderBy: { date: 'asc' },
        select: { date: true },
      }),
    ]);
    return {
      lignesNonRapprochees: total,
      plusAncienne: plusAncienne ? jourIso(plusAncienne.date) : null,
    };
  }

  private async charger(id: string): Promise<LigneAvecAuteurs> {
    const ligne = await this.prisma.releveLigne.findUnique({
      where: { id },
      include: { importePar: PERSONNE, rapprochePar: PERSONNE },
    });
    if (!ligne) throw new NotFoundException('Ligne de relevé introuvable');
    return ligne;
  }
}
