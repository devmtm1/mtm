import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import type { EnregistrerVisiteDto } from './dto/enregistrer-visite.dto';
import {
  SOURCES_VISITE,
  type DetailBien,
  type LigneBien,
  type ResumeVisites,
  type SourceVisite,
  type Totaux,
  type TypeFiche,
} from './visites.types';
import {
  ajouterJours,
  empreinteVisiteur,
  estUnRobot,
  formaterJour,
  jourDe,
  jours,
  periodeValide,
  sourceValide,
} from './visites.utils';

/** Nombre de fiches par classement, et seuil sous lequel une fiche n'est pas jugée « sans demande ». */
const TOP = 10;
const VUES_MINIMUM_SANS_DEMANDE = 3;

/**
 * Fréquentation du site public. Les visites sont comptées de façon anonyme : aucune adresse IP ni
 * cookie n'est conservé, seulement des compteurs par jour et une empreinte jetable (voir
 * `empreinteVisiteur`) qui évite de compter deux fois la même personne le même jour.
 */
@Injectable()
export class VisitesService {
  private readonly logger = new Logger(VisitesService.name);
  private readonly sel =
    process.env.VISITES_SEL ?? process.env.JWT_ACCESS_SECRET ?? 'mtm-visites';

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- enregistrement

  /** Compte une visite. Ne lève jamais d'erreur : le comptage ne doit pas gêner le site. */
  async enregistrer(
    dto: EnregistrerVisiteDto,
    contexte: { adresse: string; userAgent: string | undefined },
  ): Promise<void> {
    try {
      if (estUnRobot(contexte.userAgent)) return;
      if (dto.type !== 'site' && !dto.id) return;
      const cible = dto.type === 'site' ? '' : (dto.id as string);
      const jour = jourDe(new Date());
      const source = sourceValide(dto.source);
      const empreinte = empreinteVisiteur(
        this.sel,
        jour,
        contexte.adresse,
        contexte.userAgent as string,
      );

      const { count } = await this.prisma.empreinteVisiteur.createMany({
        data: [{ jour, cle: `${dto.type}:${cible}`, empreinte }],
        skipDuplicates: true,
      });
      const nouveauVisiteur = count === 1 ? 1 : 0;

      await this.prisma.$executeRaw`
        INSERT INTO visites_quotidiennes ("jour", "type", "cible", "source", "vues", "visiteurs")
        VALUES (${jour}::date, ${dto.type}, ${cible}, ${source}, 1, ${nouveauVisiteur})
        ON CONFLICT ("jour", "type", "cible", "source") DO UPDATE SET
          "vues" = visites_quotidiennes."vues" + 1,
          "visiteurs" = visites_quotidiennes."visiteurs" + ${nouveauVisiteur}`;
    } catch (erreur) {
      this.logger.warn(`Visite non comptée : ${(erreur as Error).message}`);
    }
  }

  /** Les empreintes ne servent que le jour même : on ne garde pas celles de plus de deux jours. */
  @Cron('0 3 * * *')
  async purgerEmpreintes(): Promise<void> {
    const limite = ajouterJours(jourDe(new Date()), -2);
    const { count } = await this.prisma.empreinteVisiteur.deleteMany({
      where: { jour: { lt: limite } },
    });
    if (count > 0)
      this.logger.log(`${count} empreinte(s) de visiteur supprimée(s).`);
  }

  // ---------------------------------------------------------------- lecture

  async resume(periode: unknown): Promise<ResumeVisites> {
    const nombre = periodeValide(periode);
    const jusqua = jourDe(new Date());
    const depuis = ajouterJours(jusqua, -(nombre - 1));
    const precedentFin = ajouterJours(depuis, -1);
    const precedentDebut = ajouterJours(precedentFin, -(nombre - 1));

    const [totaux, precedent, serie, sources, terrains, locations, vitrine] =
      await Promise.all([
        this.totaux(depuis, jusqua),
        this.totaux(precedentDebut, precedentFin),
        this.serieSite(depuis, jusqua),
        this.sources(depuis, jusqua),
        this.classement('terrain', depuis, jusqua),
        this.classement('location', depuis, jusqua),
        Promise.all([
          this.classement('realisation', depuis, jusqua, 5),
          this.classement('projet', depuis, jusqua, 5),
        ]).then(([realisations, projets]) =>
          [...realisations, ...projets]
            .sort((a, b) => b.vues - a.vues)
            .slice(0, 5),
        ),
      ]);

    // « Regardés mais sans demande » : les fiches les plus vues parmi celles qui n'ont rien donné.
    const [plusVuesTerrains, plusVuesLocations] = await Promise.all([
      this.classement('terrain', depuis, jusqua, 30),
      this.classement('location', depuis, jusqua, 30),
    ]);
    const sansDemande = [...plusVuesTerrains, ...plusVuesLocations]
      .filter(
        (ligne) =>
          ligne.demandes === 0 && ligne.vues >= VUES_MINIMUM_SANS_DEMANDE,
      )
      .sort((a, b) => b.vues - a.vues)
      .slice(0, 8);

    return {
      jours: nombre,
      depuis: formaterJour(depuis),
      jusqua: formaterJour(jusqua),
      totaux,
      precedent,
      serie,
      sources,
      terrains,
      locations,
      sansDemande,
      vitrine,
    };
  }

  async pourBien(
    type: TypeFiche,
    id: string,
    periode: unknown,
  ): Promise<DetailBien> {
    const nombre = periodeValide(periode);
    const jusqua = jourDe(new Date());
    const depuis = ajouterJours(jusqua, -(nombre - 1));
    const septDepuis = ajouterJours(jusqua, -6);
    const filtre = { type, cible: id };

    const [lignes, sources, sept, demandes] = await Promise.all([
      this.prisma.visiteQuotidienne.groupBy({
        by: ['jour'],
        where: { ...filtre, jour: { gte: depuis, lte: jusqua } },
        _sum: { vues: true, visiteurs: true },
      }),
      this.prisma.visiteQuotidienne.groupBy({
        by: ['source'],
        where: { ...filtre, jour: { gte: depuis, lte: jusqua } },
        _sum: { visiteurs: true },
      }),
      this.prisma.visiteQuotidienne.aggregate({
        where: { ...filtre, jour: { gte: septDepuis, lte: jusqua } },
        _sum: { vues: true, visiteurs: true },
      }),
      this.demandesDuBien(type, id, depuis),
    ]);

    const parJour = new Map(
      lignes.map((ligne) => [
        formaterJour(ligne.jour),
        { vues: ligne._sum.vues ?? 0, visiteurs: ligne._sum.visiteurs ?? 0 },
      ]),
    );
    const serie = jours(depuis, jusqua).map((jour) => {
      const cle = formaterJour(jour);
      return { jour: cle, ...(parJour.get(cle) ?? { vues: 0, visiteurs: 0 }) };
    });

    return {
      type,
      id,
      jours: nombre,
      totaux: {
        vues: serie.reduce((somme, point) => somme + point.vues, 0),
        visiteurs: serie.reduce((somme, point) => somme + point.visiteurs, 0),
        demandes,
      },
      septJours: {
        vues: sept._sum.vues ?? 0,
        visiteurs: sept._sum.visiteurs ?? 0,
      },
      serie,
      sources: this.sourcesTriees(
        sources.map((ligne) => ({
          source: ligne.source as SourceVisite,
          visites: ligne._sum.visiteurs ?? 0,
        })),
      ).map(({ source, visites }) => ({ source, visiteurs: visites })),
    };
  }

  // ---------------------------------------------------------------- calculs

  private async totaux(depuis: Date, jusqua: Date): Promise<Totaux> {
    const periode = { gte: depuis, lte: jusqua };
    const [site, fiches, demandes] = await Promise.all([
      this.prisma.visiteQuotidienne.aggregate({
        where: { type: 'site', jour: periode },
        _sum: { vues: true, visiteurs: true },
      }),
      this.prisma.visiteQuotidienne.aggregate({
        where: { type: { in: ['terrain', 'location'] }, jour: periode },
        _sum: { vues: true },
      }),
      this.prisma.contact.count({
        where: { createdAt: { gte: depuis, lt: ajouterJours(jusqua, 1) } },
      }),
    ]);
    return {
      visites: site._sum.visiteurs ?? 0,
      pagesVues: site._sum.vues ?? 0,
      fichesVues: fiches._sum.vues ?? 0,
      demandes,
    };
  }

  private async serieSite(depuis: Date, jusqua: Date) {
    const lignes = await this.prisma.visiteQuotidienne.groupBy({
      by: ['jour'],
      where: { type: 'site', jour: { gte: depuis, lte: jusqua } },
      _sum: { vues: true, visiteurs: true },
    });
    const parJour = new Map(
      lignes.map((ligne) => [formaterJour(ligne.jour), ligne._sum]),
    );
    return jours(depuis, jusqua).map((jour) => {
      const cle = formaterJour(jour);
      const somme = parJour.get(cle);
      return {
        jour: cle,
        visites: somme?.visiteurs ?? 0,
        pagesVues: somme?.vues ?? 0,
      };
    });
  }

  private async sources(depuis: Date, jusqua: Date) {
    const lignes = await this.prisma.visiteQuotidienne.groupBy({
      by: ['source'],
      where: { type: 'site', jour: { gte: depuis, lte: jusqua } },
      _sum: { visiteurs: true },
    });
    return this.sourcesTriees(
      lignes.map((ligne) => ({
        source: ligne.source as SourceVisite,
        visites: ligne._sum.visiteurs ?? 0,
      })),
    );
  }

  private sourcesTriees(lignes: { source: SourceVisite; visites: number }[]) {
    return lignes
      .filter(
        (ligne) => SOURCES_VISITE.includes(ligne.source) && ligne.visites > 0,
      )
      .sort((a, b) => b.visites - a.visites);
  }

  /** Les fiches les plus consultées d'un type, avec leur titre et leurs demandes. */
  private async classement(
    type: TypeFiche,
    depuis: Date,
    jusqua: Date,
    limite = TOP,
  ): Promise<LigneBien[]> {
    const lignes = await this.prisma.visiteQuotidienne.groupBy({
      by: ['cible'],
      where: { type, jour: { gte: depuis, lte: jusqua } },
      _sum: { vues: true, visiteurs: true },
      orderBy: { _sum: { vues: 'desc' } },
      take: limite,
    });
    if (lignes.length === 0) return [];

    const ids = lignes.map((ligne) => ligne.cible);
    const [fiches, demandes] = await Promise.all([
      this.fiches(type, ids),
      this.demandesParFiche(type, ids, depuis),
    ]);

    const resultat: LigneBien[] = [];
    for (const ligne of lignes) {
      const fiche = fiches.get(ligne.cible);
      // Une fiche supprimée depuis n'a plus rien à montrer.
      if (!fiche) continue;
      resultat.push({
        type,
        id: ligne.cible,
        ...fiche,
        vues: ligne._sum.vues ?? 0,
        visiteurs: ligne._sum.visiteurs ?? 0,
        demandes: demandes.get(ligne.cible) ?? 0,
      });
    }
    return resultat;
  }

  private async fiches(
    type: TypeFiche,
    ids: string[],
  ): Promise<Map<string, Pick<LigneBien, 'titre' | 'reference' | 'lieu'>>> {
    const carte = new Map<
      string,
      Pick<LigneBien, 'titre' | 'reference' | 'lieu'>
    >();
    if (type === 'terrain') {
      const lignes = await this.prisma.terrain.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          nom: true,
          referenceInterne: true,
          commune: true,
          region: true,
        },
      });
      for (const t of lignes) {
        carte.set(t.id, {
          titre: t.nom,
          reference: t.referenceInterne,
          lieu: [t.commune, t.region].filter(Boolean).join(', ') || null,
        });
      }
    } else if (type === 'location') {
      const lignes = await this.prisma.bienLocatif.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          titre: true,
          type: true,
          referenceInterne: true,
          commune: true,
          region: true,
        },
      });
      for (const b of lignes) {
        carte.set(b.id, {
          titre: b.titre || `${b.type}${b.commune ? ` à ${b.commune}` : ''}`,
          reference: b.referenceInterne,
          lieu: [b.commune, b.region].filter(Boolean).join(', ') || null,
        });
      }
    } else {
      const lignes = await this.prisma.showcaseItem.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, location: true },
      });
      for (const s of lignes) {
        carte.set(s.id, { titre: s.title, reference: null, lieu: s.location });
      }
    }
    return carte;
  }

  private async demandesParFiche(
    type: TypeFiche,
    ids: string[],
    depuis: Date,
  ): Promise<Map<string, number>> {
    if (type === 'terrain') {
      const lignes = await this.prisma.contact.groupBy({
        by: ['terrainId'],
        where: { terrainId: { in: ids }, createdAt: { gte: depuis } },
        _count: { _all: true },
      });
      return new Map(
        lignes.flatMap((l) =>
          l.terrainId ? [[l.terrainId, l._count._all] as const] : [],
        ),
      );
    }
    if (type === 'location') {
      const lignes = await this.prisma.contact.groupBy({
        by: ['bienLocatifId'],
        where: { bienLocatifId: { in: ids }, createdAt: { gte: depuis } },
        _count: { _all: true },
      });
      return new Map(
        lignes.flatMap((l) =>
          l.bienLocatifId ? [[l.bienLocatifId, l._count._all] as const] : [],
        ),
      );
    }
    return new Map();
  }

  private async demandesDuBien(
    type: TypeFiche,
    id: string,
    depuis: Date,
  ): Promise<number> {
    if (type === 'terrain') {
      return this.prisma.contact.count({
        where: { terrainId: id, createdAt: { gte: depuis } },
      });
    }
    if (type === 'location') {
      return this.prisma.contact.count({
        where: { bienLocatifId: id, createdAt: { gte: depuis } },
      });
    }
    return 0;
  }
}
