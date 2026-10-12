import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  LIBELLES_ACTIVITE,
  totaliser,
  serieMensuelle,
  type Activite,
} from '../finances/finances.calculs';
import { FinancesService } from '../finances/finances.service';
import {
  type ColonneRapport,
  type RapportDonnees,
  UN_JOUR,
  formaterMontant,
  formaterNombre,
  formaterPourcentage,
  joursEntre,
  moisDe,
  moyenne,
  nombre,
  tauxPourcent,
} from './pilotage.calculs';
import {
  CATALOGUE_RAPPORTS,
  type DefinitionRapport,
} from './rapports.catalogue';

const ZONE_INCONNUE = 'Non renseignée';
const LIMITE_LIGNES = 500;

const col = (
  cle: string,
  libelle: string,
  type: ColonneRapport['type'] = 'texte',
): ColonneRapport => ({
  cle,
  libelle,
  type,
});

const nomComplet = (
  p?: {
    firstName?: string | null;
    lastName?: string | null;
    prenom?: string | null;
    nom?: string | null;
  } | null,
): string =>
  [p?.firstName ?? p?.prenom, p?.lastName ?? p?.nom]
    .filter(Boolean)
    .join(' ')
    .trim() || '—';

const jourIso = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Rapports de la section 23, exportables en PDF et en Excel : ventes par
 * période et par zone, performance des commerciaux, terrains disponibles et
 * vendus, loyers et impayés, rentabilité par activité, activité des démarches.
 * Chaque rapport produit les mêmes données génériques (résumé + sections de
 * tableau) que lisent l'aperçu à l'écran, le PDF et le classeur Excel : un
 * chiffre ne peut donc pas différer d'un format à l'autre.
 */
@Injectable()
export class RapportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finances: FinancesService,
  ) {}

  catalogue(): DefinitionRapport[] {
    return CATALOGUE_RAPPORTS;
  }

  async generer(
    code: string,
    query: { du?: string; au?: string; region?: string },
  ): Promise<RapportDonnees> {
    const definition = CATALOGUE_RAPPORTS.find((r) => r.code === code);
    if (!definition) throw new NotFoundException('Rapport inconnu');
    const periode = this.finances.periode(query);
    const region = query.region?.trim() || undefined;
    if (region && !definition.filtres.includes('region')) {
      throw new BadRequestException('Ce rapport ne se filtre pas par région');
    }
    const cadre = {
      du: periode.du,
      au: periode.au,
      region,
      auInclus: new Date(periode.au.getTime() - UN_JOUR),
    };
    switch (code) {
      case 'ventes_periode':
        return this.ventesPeriode(definition, cadre);
      case 'ventes_zone':
        return this.ventesZone(definition, cadre);
      case 'performance_commerciaux':
        return this.performance(definition, cadre);
      case 'terrains_etat':
        return this.terrains(definition, region);
      case 'loyers_impayes':
        return this.loyers(definition, cadre);
      case 'rentabilite_activite':
        return this.rentabilite(definition, cadre);
      default:
        return this.demarches(definition, cadre);
    }
  }

  private entete(
    definition: DefinitionRapport,
    cadre: { du: Date; auInclus: Date },
    region?: string,
  ) {
    const periode = definition.parPeriode
      ? `Du ${jourIso(cadre.du)} au ${jourIso(cadre.auInclus)}`
      : `Situation au ${jourIso(new Date())}`;
    return {
      code: definition.code,
      titre: definition.titre,
      sousTitre: region ? `${periode} · Région : ${region}` : periode,
      periode: definition.parPeriode
        ? { du: jourIso(cadre.du), au: jourIso(cadre.auInclus) }
        : null,
    };
  }

  // ------------------------------------------------------------------
  // 1 et 2. Ventes
  // ------------------------------------------------------------------

  private async ventesSoldees(du: Date, au: Date, region?: string) {
    return this.prisma.dossierVente.findMany({
      where: {
        statut: 'solde',
        dateVente: { gte: du, lt: au },
        ...(region
          ? {
              terrain: {
                region: { equals: region, mode: 'insensitive' as const },
              },
            }
          : {}),
      },
      select: {
        id: true,
        referenceInterne: true,
        prixVente: true,
        dateVente: true,
        prospect: { select: { nom: true, prenom: true } },
        commercialResponsable: { select: { firstName: true, lastName: true } },
        terrain: {
          select: {
            referenceInterne: true,
            nom: true,
            region: true,
            commune: true,
            superficie: true,
          },
        },
      },
      orderBy: { dateVente: 'asc' },
      take: LIMITE_LIGNES + 1,
    });
  }

  private async ventesPeriode(
    definition: DefinitionRapport,
    cadre: { du: Date; au: Date; auInclus: Date; region?: string },
  ): Promise<RapportDonnees> {
    const dossiers = await this.ventesSoldees(cadre.du, cadre.au, cadre.region);
    const tronque = dossiers.length > LIMITE_LIGNES;
    const lignesBrutes = dossiers.slice(0, LIMITE_LIGNES);
    const prix = lignesBrutes.map((d) => nombre(d.prixVente));
    const ca = prix.reduce((s, p) => s + p, 0);

    const parMois = new Map<string, { nombre: number; ca: number }>();
    for (const d of lignesBrutes) {
      if (!d.dateVente) continue;
      const cle = moisDe(d.dateVente);
      const courant = parMois.get(cle) ?? { nombre: 0, ca: 0 };
      courant.nombre += 1;
      courant.ca += nombre(d.prixVente);
      parMois.set(cle, courant);
    }

    return {
      ...this.entete(definition, cadre, cadre.region),
      resume: [
        {
          libelle: 'Ventes conclues',
          valeur: formaterNombre(lignesBrutes.length),
        },
        { libelle: 'Chiffre d’affaires', valeur: formaterMontant(ca) },
        {
          libelle: 'Prix moyen',
          valeur: lignesBrutes.length
            ? formaterMontant(ca / lignesBrutes.length)
            : '—',
        },
      ],
      sections: [
        {
          titre: 'Ventes conclues',
          colonnes: [
            col('date', 'Date', 'date'),
            col('reference', 'Dossier'),
            col('client', 'Client'),
            col('bien', 'Bien'),
            col('zone', 'Zone'),
            col('commercial', 'Commercial'),
            col('prix', 'Prix (FCFA)', 'montant'),
          ],
          lignes: lignesBrutes.map((d) => ({
            date: d.dateVente ? jourIso(d.dateVente) : null,
            reference: d.referenceInterne ?? '',
            client: nomComplet(d.prospect),
            bien: d.terrain
              ? `${d.terrain.referenceInterne} — ${d.terrain.nom}`
              : '—',
            zone:
              [d.terrain?.region, d.terrain?.commune]
                .filter(Boolean)
                .join(' · ') || ZONE_INCONNUE,
            commercial: nomComplet(d.commercialResponsable),
            prix: nombre(d.prixVente),
          })),
          total: { client: 'Total', prix: ca },
          note: tronque
            ? `Le rapport est limité aux ${LIMITE_LIGNES} premières ventes de la période : réduisez la période pour tout voir.`
            : undefined,
        },
        {
          titre: 'Par mois',
          colonnes: [
            col('mois', 'Mois'),
            col('ventes', 'Ventes', 'nombre'),
            col('ca', 'Chiffre d’affaires (FCFA)', 'montant'),
          ],
          lignes: [...parMois.entries()].map(([mois, v]) => ({
            mois,
            ventes: v.nombre,
            ca: v.ca,
          })),
          total: { mois: 'Total', ventes: lignesBrutes.length, ca },
        },
      ],
    };
  }

  private async ventesZone(
    definition: DefinitionRapport,
    cadre: { du: Date; au: Date; auInclus: Date; region?: string },
  ): Promise<RapportDonnees> {
    const dossiers = (
      await this.ventesSoldees(cadre.du, cadre.au, cadre.region)
    ).slice(0, LIMITE_LIGNES * 4);
    type Cumul = { ventes: number; ca: number; superficie: number };
    const regions = new Map<string, Cumul>();
    const communes = new Map<string, Cumul>();
    const ajouter = (
      map: Map<string, Cumul>,
      cle: string,
      prix: number,
      superficie: number,
    ) => {
      const c = map.get(cle) ?? { ventes: 0, ca: 0, superficie: 0 };
      c.ventes += 1;
      c.ca += prix;
      c.superficie += superficie;
      map.set(cle, c);
    };
    for (const d of dossiers) {
      const region = d.terrain?.region?.trim() || ZONE_INCONNUE;
      const commune = d.terrain?.commune?.trim();
      const prix = nombre(d.prixVente);
      const superficie = nombre(d.terrain?.superficie);
      ajouter(regions, region, prix, superficie);
      ajouter(
        communes,
        commune
          ? `${region} · ${commune}`
          : `${region} · (commune non renseignée)`,
        prix,
        superficie,
      );
    }
    const lignes = (map: Map<string, Cumul>, cle: string) =>
      [...map.entries()]
        .sort((a, b) => b[1].ca - a[1].ca)
        .map(([zone, c]) => ({
          [cle]: zone,
          ventes: c.ventes,
          ca: c.ca,
          prixMoyen: Math.round(c.ca / c.ventes),
          superficie: c.superficie,
        }));
    const colonnes = (cle: string, libelle: string) => [
      col(cle, libelle),
      col('ventes', 'Ventes', 'nombre'),
      col('ca', 'Chiffre d’affaires (FCFA)', 'montant'),
      col('prixMoyen', 'Prix moyen (FCFA)', 'montant'),
      col('superficie', 'Superficie vendue (m²)', 'nombre'),
    ];
    const totalCa = dossiers.reduce((s, d) => s + nombre(d.prixVente), 0);
    const inconnue = regions.get(ZONE_INCONNUE)?.ventes ?? 0;
    return {
      ...this.entete(definition, cadre, cadre.region),
      resume: [
        { libelle: 'Ventes', valeur: formaterNombre(dossiers.length) },
        { libelle: 'Chiffre d’affaires', valeur: formaterMontant(totalCa) },
        { libelle: 'Régions concernées', valeur: formaterNombre(regions.size) },
      ],
      sections: [
        {
          titre: 'Par région',
          colonnes: colonnes('zone', 'Région'),
          lignes: lignes(regions, 'zone'),
          total: {
            zone: 'Total',
            ventes: dossiers.length,
            ca: totalCa,
            superficie: dossiers.reduce(
              (s, d) => s + nombre(d.terrain?.superficie),
              0,
            ),
          },
          note: inconnue
            ? `${inconnue} vente(s) sans région renseignée dans la fiche du bien : complétez-la pour qu’elles soient classées.`
            : undefined,
        },
        {
          titre: 'Par commune',
          colonnes: colonnes('zone', 'Région · commune'),
          lignes: lignes(communes, 'zone'),
        },
      ],
    };
  }

  // ------------------------------------------------------------------
  // 3. Performance des commerciaux
  // ------------------------------------------------------------------

  private async performance(
    definition: DefinitionRapport,
    cadre: { du: Date; au: Date; auInclus: Date },
  ): Promise<RapportDonnees> {
    const equipe = await this.prisma.user.findMany({
      where: {
        isActive: true,
        roles: {
          some: {
            role: { name: { in: ['commercial', 'responsable_commercial'] } },
          },
        },
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    const ids = equipe.map((u) => u.id);
    const periodes = derniersMoisEntre(cadre.du, cadre.au);
    const [prospects, visites, ventes, commissions, objectifs] =
      await Promise.all([
        this.prisma.prospect.groupBy({
          by: ['commercialResponsableId'],
          where: {
            commercialResponsableId: { in: ids },
            createdAt: { gte: cadre.du, lt: cadre.au },
          },
          _count: { _all: true },
        }),
        this.prisma.visiteProspect.findMany({
          where: {
            statut: 'effectuee',
            dateConfirmee: { gte: cadre.du, lt: cadre.au },
          },
          select: {
            accompagnateurId: true,
            prospect: { select: { commercialResponsableId: true } },
          },
        }),
        this.prisma.dossierVente.findMany({
          where: {
            statut: 'solde',
            dateVente: { gte: cadre.du, lt: cadre.au },
            commercialResponsableId: { in: ids },
          },
          select: { commercialResponsableId: true, prixVente: true },
        }),
        this.prisma.commissionVente.findMany({
          where: {
            commercialId: { in: ids },
            createdAt: { gte: cadre.du, lt: cadre.au },
          },
          select: { commercialId: true, montantEstime: true },
        }),
        this.prisma.objectifCommercial.findMany({
          where: { commercialId: { in: ids }, periode: { in: periodes } },
          select: {
            commercialId: true,
            cibleVentes: true,
            cibleChiffreAffaires: true,
          },
        }),
      ]);

    const lignes = equipe.map((u) => {
      const v = ventes.filter((x) => x.commercialResponsableId === u.id);
      const ca = v.reduce((s, x) => s + nombre(x.prixVente), 0);
      const cibleVentes = objectifs
        .filter((o) => o.commercialId === u.id)
        .reduce((s, o) => s + (o.cibleVentes ?? 0), 0);
      const cibleCa = objectifs
        .filter((o) => o.commercialId === u.id)
        .reduce((s, o) => s + nombre(o.cibleChiffreAffaires), 0);
      return {
        commercial: nomComplet(u),
        prospects:
          prospects.find((p) => p.commercialResponsableId === u.id)?._count
            ._all ?? 0,
        visites: visites.filter(
          (x) =>
            (x.accompagnateurId ?? x.prospect.commercialResponsableId) === u.id,
        ).length,
        ventes: v.length,
        ca,
        commissions: commissions
          .filter((c) => c.commercialId === u.id)
          .reduce((s, c) => s + nombre(c.montantEstime), 0),
        cibleVentes: cibleVentes || null,
        atteinte: tauxPourcent(v.length, cibleVentes),
        cibleCa: cibleCa || null,
        atteinteCa: tauxPourcent(ca, cibleCa),
      };
    });
    lignes.sort((a, b) => b.ca - a.ca);
    const somme = (
      cle: 'prospects' | 'visites' | 'ventes' | 'ca' | 'commissions',
    ) => lignes.reduce((s, l) => s + l[cle], 0);

    return {
      ...this.entete(definition, cadre),
      resume: [
        { libelle: 'Ventes soldées', valeur: formaterNombre(somme('ventes')) },
        { libelle: 'Chiffre d’affaires', valeur: formaterMontant(somme('ca')) },
        { libelle: 'Commerciaux', valeur: formaterNombre(lignes.length) },
      ],
      sections: [
        {
          titre:
            'Résultats par commercial (du plus au moins haut chiffre d’affaires)',
          colonnes: [
            col('commercial', 'Commercial'),
            col('prospects', 'Prospects créés', 'nombre'),
            col('visites', 'Visites faites', 'nombre'),
            col('ventes', 'Ventes soldées', 'nombre'),
            col('ca', 'CA (FCFA)', 'montant'),
            col('commissions', 'Commissions estimées', 'montant'),
            col('cibleVentes', 'Objectif ventes', 'nombre'),
            col('atteinte', 'Atteinte', 'pourcentage'),
          ],
          lignes,
          total: {
            commercial: 'Total',
            prospects: somme('prospects'),
            visites: somme('visites'),
            ventes: somme('ventes'),
            ca: somme('ca'),
            commissions: somme('commissions'),
          },
          note: 'Les objectifs sont ceux des mois de la période. Un commercial sans objectif n’a pas de taux d’atteinte.',
        },
      ],
    };
  }

  // ------------------------------------------------------------------
  // 4. Terrains
  // ------------------------------------------------------------------

  private async terrains(
    definition: DefinitionRapport,
    region?: string,
  ): Promise<RapportDonnees> {
    const biens = await this.prisma.terrain.findMany({
      where: {
        archiveLe: null,
        ...(region
          ? { region: { equals: region, mode: 'insensitive' as const } }
          : {}),
      },
      select: {
        referenceInterne: true,
        nom: true,
        region: true,
        commune: true,
        superficie: true,
        prixPublic: true,
        statutCommercial: true,
      },
      orderBy: { referenceInterne: 'asc' },
    });
    const parStatut = new Map<
      string,
      { n: number; valeur: number; superficie: number }
    >();
    const parZone = new Map<
      string,
      { disponibles: number; vendus: number; autres: number }
    >();
    for (const b of biens) {
      const s = parStatut.get(b.statutCommercial) ?? {
        n: 0,
        valeur: 0,
        superficie: 0,
      };
      s.n += 1;
      s.valeur += nombre(b.prixPublic);
      s.superficie += nombre(b.superficie);
      parStatut.set(b.statutCommercial, s);
      const zone = b.region?.trim() || ZONE_INCONNUE;
      const z = parZone.get(zone) ?? { disponibles: 0, vendus: 0, autres: 0 };
      if (b.statutCommercial === 'Disponible') z.disponibles += 1;
      else if (b.statutCommercial === 'Vendu') z.vendus += 1;
      else z.autres += 1;
      parZone.set(zone, z);
    }
    const disponibles = biens.filter(
      (b) => b.statutCommercial === 'Disponible',
    );
    const vendus = biens.filter((b) => b.statutCommercial === 'Vendu').length;
    const valeurDisponible = disponibles.reduce(
      (s, b) => s + nombre(b.prixPublic),
      0,
    );

    return {
      ...this.entete(
        definition,
        { du: new Date(), auInclus: new Date() },
        region,
      ),
      resume: [
        { libelle: 'Biens au catalogue', valeur: formaterNombre(biens.length) },
        { libelle: 'Disponibles', valeur: formaterNombre(disponibles.length) },
        { libelle: 'Vendus', valeur: formaterNombre(vendus) },
        {
          libelle: 'Valeur des biens disponibles',
          valeur: formaterMontant(valeurDisponible),
        },
      ],
      sections: [
        {
          titre: 'Par statut commercial',
          colonnes: [
            col('statut', 'Statut'),
            col('biens', 'Biens', 'nombre'),
            col('valeur', 'Valeur au prix public (FCFA)', 'montant'),
            col('superficie', 'Superficie (m²)', 'nombre'),
          ],
          lignes: [...parStatut.entries()]
            .sort((a, b) => b[1].n - a[1].n)
            .map(([statut, s]) => ({
              statut,
              biens: s.n,
              valeur: s.valeur,
              superficie: s.superficie,
            })),
          total: {
            statut: 'Total',
            biens: biens.length,
            valeur: biens.reduce((s, b) => s + nombre(b.prixPublic), 0),
            superficie: biens.reduce((s, b) => s + nombre(b.superficie), 0),
          },
        },
        {
          titre: 'Par région',
          colonnes: [
            col('zone', 'Région'),
            col('disponibles', 'Disponibles', 'nombre'),
            col('vendus', 'Vendus', 'nombre'),
            col('autres', 'Autres statuts', 'nombre'),
          ],
          lignes: [...parZone.entries()]
            .sort((a, b) => b[1].disponibles - a[1].disponibles)
            .map(([zone, z]) => ({ zone, ...z })),
        },
        {
          titre: 'Biens disponibles',
          colonnes: [
            col('reference', 'Référence'),
            col('nom', 'Bien'),
            col('zone', 'Zone'),
            col('superficie', 'Superficie (m²)', 'nombre'),
            col('prix', 'Prix public (FCFA)', 'montant'),
          ],
          lignes: disponibles.slice(0, LIMITE_LIGNES).map((b) => ({
            reference: b.referenceInterne,
            nom: b.nom,
            zone:
              [b.region, b.commune].filter(Boolean).join(' · ') ||
              ZONE_INCONNUE,
            superficie: b.superficie === null ? null : nombre(b.superficie),
            prix: b.prixPublic === null ? null : nombre(b.prixPublic),
          })),
          note:
            disponibles.length > LIMITE_LIGNES
              ? `Liste limitée aux ${LIMITE_LIGNES} premiers biens sur ${disponibles.length}.`
              : undefined,
        },
      ],
    };
  }

  // ------------------------------------------------------------------
  // 5. Loyers et impayés
  // ------------------------------------------------------------------

  private async loyers(
    definition: DefinitionRapport,
    cadre: { du: Date; au: Date; auInclus: Date },
  ): Promise<RapportDonnees> {
    const maintenant = new Date();
    const [echeances, impayes] = await Promise.all([
      this.prisma.echeanceLoyer.findMany({
        where: {
          dateEcheance: { gte: cadre.du, lt: cadre.au },
          statut: { not: 'annulee' },
        },
        select: {
          montantPrevu: true,
          montantPaye: true,
          bailLocatif: {
            select: {
              bienLocatif: {
                select: { referenceInterne: true, adresse: true },
              },
            },
          },
        },
      }),
      this.prisma.echeanceLoyer.findMany({
        where: {
          dateEcheance: { lt: maintenant },
          statut: { in: ['en_retard', 'impayee', 'partielle', 'a_venir'] },
        },
        select: {
          dateEcheance: true,
          montantPrevu: true,
          montantPaye: true,
          bailLocatif: {
            select: {
              referenceInterne: true,
              locataire: { select: { firstName: true, lastName: true } },
              bienLocatif: { select: { referenceInterne: true } },
            },
          },
        },
        orderBy: { dateEcheance: 'asc' },
        take: LIMITE_LIGNES + 1,
      }),
    ]);

    const parBien = new Map<
      string,
      { adresse: string; attendu: number; encaisse: number }
    >();
    for (const e of echeances) {
      const bien = e.bailLocatif.bienLocatif;
      const c = parBien.get(bien.referenceInterne) ?? {
        adresse: bien.adresse,
        attendu: 0,
        encaisse: 0,
      };
      c.attendu += nombre(e.montantPrevu);
      c.encaisse += nombre(e.montantPaye);
      parBien.set(bien.referenceInterne, c);
    }
    const attendu = [...parBien.values()].reduce((s, b) => s + b.attendu, 0);
    const encaisse = [...parBien.values()].reduce((s, b) => s + b.encaisse, 0);

    const dus = impayes
      .map((e) => ({
        e,
        reste: nombre(e.montantPrevu) - nombre(e.montantPaye),
      }))
      .filter(({ reste }) => reste > 0);
    const tronque = dus.length > LIMITE_LIGNES;
    const totalDu = dus.reduce((s, { reste }) => s + reste, 0);
    const prolonges = dus.filter(
      ({ e }) => joursEntre(e.dateEcheance, maintenant) > 30,
    ).length;

    return {
      ...this.entete(definition, cadre),
      resume: [
        { libelle: 'Loyers attendus', valeur: formaterMontant(attendu) },
        { libelle: 'Loyers encaissés', valeur: formaterMontant(encaisse) },
        {
          libelle: 'Taux de recouvrement',
          valeur:
            attendu > 0
              ? formaterPourcentage(tauxPourcent(encaisse, attendu) ?? 0)
              : '—',
        },
        {
          libelle: 'Impayés à ce jour',
          valeur: `${formaterMontant(totalDu)} (${dus.length})`,
        },
      ],
      sections: [
        {
          titre: 'Loyers par bien sur la période',
          colonnes: [
            col('bien', 'Bien'),
            col('adresse', 'Adresse'),
            col('attendu', 'Attendu (FCFA)', 'montant'),
            col('encaisse', 'Encaissé (FCFA)', 'montant'),
            col('reste', 'Reste (FCFA)', 'montant'),
            col('taux', 'Recouvrement', 'pourcentage'),
          ],
          lignes: [...parBien.entries()]
            .sort(
              (a, b) =>
                b[1].attendu - b[1].encaisse - (a[1].attendu - a[1].encaisse),
            )
            .map(([bien, c]) => ({
              bien,
              adresse: c.adresse,
              attendu: c.attendu,
              encaisse: c.encaisse,
              reste: Math.max(0, c.attendu - c.encaisse),
              taux: tauxPourcent(c.encaisse, c.attendu),
            })),
          total: {
            bien: 'Total',
            attendu,
            encaisse,
            reste: Math.max(0, attendu - encaisse),
            taux: tauxPourcent(encaisse, attendu),
          },
        },
        {
          titre: `Impayés au ${jourIso(maintenant)}${prolonges ? ` (dont ${prolonges} de plus de 30 jours)` : ''}`,
          colonnes: [
            col('echeance', 'Échéance', 'date'),
            col('bail', 'Bail'),
            col('bien', 'Bien'),
            col('locataire', 'Locataire'),
            col('retard', 'Retard (jours)', 'nombre'),
            col('reste', 'Reste dû (FCFA)', 'montant'),
          ],
          lignes: dus.slice(0, LIMITE_LIGNES).map(({ e, reste }) => ({
            echeance: jourIso(e.dateEcheance),
            bail: e.bailLocatif.referenceInterne,
            bien: e.bailLocatif.bienLocatif.referenceInterne,
            locataire: nomComplet(e.bailLocatif.locataire),
            retard: joursEntre(e.dateEcheance, maintenant),
            reste,
          })),
          total: { bail: 'Total dû', reste: totalDu },
          note: tronque
            ? `Liste limitée aux ${LIMITE_LIGNES} plus anciens impayés.`
            : undefined,
        },
      ],
    };
  }

  // ------------------------------------------------------------------
  // 6. Rentabilité par activité
  // ------------------------------------------------------------------

  private async rentabilite(
    definition: DefinitionRapport,
    cadre: { du: Date; au: Date; auInclus: Date },
  ): Promise<RapportDonnees> {
    const { lignes } = await this.finances.lignesDe({
      du: jourIso(cadre.du),
      au: jourIso(cadre.auInclus),
    });
    const { global, parActivite } = totaliser(lignes);
    const serie = serieMensuelle(lignes, cadre.du, cadre.au);
    return {
      ...this.entete(definition, cadre),
      resume: [
        { libelle: 'Revenu de MTM', valeur: formaterMontant(global.revenu) },
        { libelle: 'Dépenses', valeur: formaterMontant(global.depenses) },
        { libelle: 'Résultat', valeur: formaterMontant(global.resultat) },
        {
          libelle: 'Marge sur revenu',
          valeur:
            global.revenu > 0
              ? formaterPourcentage(
                  tauxPourcent(global.resultat, global.revenu) ?? 0,
                )
              : '—',
        },
      ],
      sections: [
        {
          titre: 'Par activité',
          colonnes: [
            col('activite', 'Activité'),
            col('encaissements', 'Encaissements (FCFA)', 'montant'),
            col('revenu', 'Revenu MTM (FCFA)', 'montant'),
            col('depenses', 'Dépenses (FCFA)', 'montant'),
            col('resultat', 'Résultat (FCFA)', 'montant'),
            col('marge', 'Marge', 'pourcentage'),
          ],
          lignes: (Object.keys(parActivite) as Activite[]).map((a) => ({
            activite: LIBELLES_ACTIVITE[a],
            ...parActivite[a],
            marge: tauxPourcent(parActivite[a].resultat, parActivite[a].revenu),
          })),
          total: {
            activite: 'Total',
            ...global,
            marge: tauxPourcent(global.resultat, global.revenu),
          },
          note: 'Les encaissements sont l’argent reçu (loyers et prix de vente compris) ; le revenu est la part de MTM : marge des ventes, commission de gestion, prestations, recettes saisies.',
        },
        {
          titre: 'Par mois',
          colonnes: [
            col('mois', 'Mois'),
            col('encaissements', 'Encaissements (FCFA)', 'montant'),
            col('revenu', 'Revenu MTM (FCFA)', 'montant'),
            col('depenses', 'Dépenses (FCFA)', 'montant'),
            col('resultat', 'Résultat (FCFA)', 'montant'),
          ],
          lignes: serie.map((p) => ({
            mois: p.periode,
            encaissements: p.encaissements,
            revenu: p.revenu,
            depenses: p.depenses,
            resultat: p.revenu - p.depenses,
          })),
        },
      ],
    };
  }

  // ------------------------------------------------------------------
  // 7. Démarches
  // ------------------------------------------------------------------

  private async demarches(
    definition: DefinitionRapport,
    cadre: { du: Date; au: Date; auInclus: Date },
  ): Promise<RapportDonnees> {
    const missions = await this.prisma.missionVerification.findMany({
      where: { dateDemande: { gte: cadre.du, lt: cadre.au } },
      select: {
        referenceInterne: true,
        typeVerification: true,
        statut: true,
        decision: true,
        dateDemande: true,
        dateRapport: true,
        montantDevis: true,
        montantPaye: true,
        prospect: { select: { nom: true, prenom: true } },
      },
      orderBy: { dateDemande: 'asc' },
      take: LIMITE_LIGNES + 1,
    });
    const tronque = missions.length > LIMITE_LIGNES;
    const lignes = missions.slice(0, LIMITE_LIGNES);
    const delais = lignes
      .filter((m) => m.dateRapport)
      .map((m) => joursEntre(m.dateDemande, m.dateRapport as Date));
    const parType = new Map<
      string,
      { ouvertes: number; rapports: number; devis: number; paye: number }
    >();
    for (const m of lignes) {
      const c = parType.get(m.typeVerification) ?? {
        ouvertes: 0,
        rapports: 0,
        devis: 0,
        paye: 0,
      };
      c.ouvertes += 1;
      if (m.dateRapport) c.rapports += 1;
      c.devis += nombre(m.montantDevis);
      c.paye += nombre(m.montantPaye);
      parType.set(m.typeVerification, c);
    }
    const parDecision = new Map<string, number>();
    for (const m of lignes) {
      if (m.decision)
        parDecision.set(m.decision, (parDecision.get(m.decision) ?? 0) + 1);
    }
    const devis = lignes.reduce((s, m) => s + nombre(m.montantDevis), 0);
    const paye = lignes.reduce((s, m) => s + nombre(m.montantPaye), 0);
    const delaiMoyen = moyenne(delais);

    return {
      ...this.entete(definition, cadre),
      resume: [
        { libelle: 'Missions ouvertes', valeur: formaterNombre(lignes.length) },
        { libelle: 'Rapports rendus', valeur: formaterNombre(delais.length) },
        {
          libelle: 'Délai moyen de rapport',
          valeur: delaiMoyen === null ? '—' : `${delaiMoyen} jours`,
        },
        {
          libelle: 'Réglé / facturé',
          valeur: `${formaterMontant(paye)} / ${formaterMontant(devis)}`,
        },
      ],
      sections: [
        {
          titre: 'Par type de prestation',
          colonnes: [
            col('type', 'Prestation'),
            col('ouvertes', 'Ouvertes', 'nombre'),
            col('rapports', 'Rapports rendus', 'nombre'),
            col('devis', 'Facturé (FCFA)', 'montant'),
            col('paye', 'Réglé (FCFA)', 'montant'),
          ],
          lignes: [...parType.entries()].map(([type, c]) => ({
            type: type.replace(/_/g, ' '),
            ...c,
          })),
          total: {
            type: 'Total',
            ouvertes: lignes.length,
            rapports: delais.length,
            devis,
            paye,
          },
        },
        {
          titre: 'Décisions rendues',
          colonnes: [
            col('decision', 'Décision'),
            col('missions', 'Missions', 'nombre'),
          ],
          lignes: [...parDecision.entries()].map(([decision, missions]) => ({
            decision: decision.replace(/_/g, ' '),
            missions,
          })),
        },
        {
          titre: 'Détail des missions',
          colonnes: [
            col('date', 'Demandée le', 'date'),
            col('reference', 'Mission'),
            col('client', 'Client'),
            col('type', 'Prestation'),
            col('statut', 'Étape'),
            col('delai', 'Délai (jours)', 'nombre'),
            col('paye', 'Réglé (FCFA)', 'montant'),
          ],
          lignes: lignes.map((m) => ({
            date: jourIso(m.dateDemande),
            reference: m.referenceInterne ?? '',
            client: nomComplet(m.prospect),
            type: m.typeVerification.replace(/_/g, ' '),
            statut: m.statut.replace(/_/g, ' '),
            delai: m.dateRapport
              ? joursEntre(m.dateDemande, m.dateRapport)
              : null,
            paye: m.montantPaye === null ? null : nombre(m.montantPaye),
          })),
          note: tronque
            ? `Liste limitée aux ${LIMITE_LIGNES} premières missions de la période.`
            : undefined,
        },
      ],
    };
  }
}

/** Mois (AAAA-MM) couverts par [du, au[. */
function derniersMoisEntre(du: Date, au: Date): string[] {
  const mois: string[] = [];
  const courant = new Date(Date.UTC(du.getUTCFullYear(), du.getUTCMonth(), 1));
  while (courant < au) {
    mois.push(moisDe(courant));
    courant.setUTCMonth(courant.getUTCMonth() + 1);
  }
  return mois;
}
