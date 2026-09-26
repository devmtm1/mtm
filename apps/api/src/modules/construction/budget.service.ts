import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  ConstructionAccessService,
  type ConstructionUser,
} from './construction-access.service';
import { ConstructionOptionsService } from './construction-options.service';
import { calculerBudget, synchroniserChantier } from './chantier.helper';
import {
  CreateDepenseDto,
  CreateIntervenantDto,
  CreateLigneBudgetDto,
  UpdateIntervenantDto,
  UpdateLigneBudgetDto,
  ValiderDepenseDto,
} from './dto/chantier-suivi.dto';

/**
 * Prestataires, budget prévisionnel et dépenses d'un chantier (section 16 :
 * « devis, budget, prestataires, matériaux, paiements »).
 *
 * Deux principes tiennent l'ensemble. Le budget se lit poste par poste, pas
 * seulement en total : une dépense rattachée à sa ligne permet de voir lequel
 * dérape. Et une dépense ne pèse qu'une fois validée — la saisie sur le
 * chantier et le contrôle comptable sont deux gestes distincts, comme les
 * encaissements de loyer en J2.1 (section 24).
 */
@Injectable()
export class BudgetChantierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ConstructionAccessService,
    private readonly options: ConstructionOptionsService,
  ) {}

  // ----------------------------------------------------------------
  // Prestataires
  // ----------------------------------------------------------------

  async listerIntervenants(projetId: string, user: ConstructionUser) {
    await this.access.ensureAccessible(projetId, user);
    return this.prisma.intervenantChantier.findMany({
      where: { projetId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { depenses: true } } },
    });
  }

  async ajouterIntervenant(
    projetId: string,
    dto: CreateIntervenantDto,
    user: ConstructionUser,
  ) {
    await this.access.ensureAccessible(projetId, user);
    await Promise.all([
      this.options.assertMetier(dto.metier),
      this.options.assertStatutIntervenant(dto.statut),
    ]);

    const intervenant = await this.prisma.intervenantChantier.create({
      data: {
        projetId,
        nom: dto.nom,
        metier: dto.metier,
        telephone: dto.telephone,
        email: dto.email,
        reference: dto.reference,
        montantContrat: dto.montantContrat,
        dateDebut: dto.dateDebut ? new Date(dto.dateDebut) : null,
        dateFin: dto.dateFin ? new Date(dto.dateFin) : null,
        statut: dto.statut ?? 'engage',
        notes: dto.notes,
      },
    });
    await this.resynchroniser(projetId);
    return intervenant;
  }

  async modifierIntervenant(
    projetId: string,
    intervenantId: string,
    dto: UpdateIntervenantDto,
    user: ConstructionUser,
  ) {
    await this.access.ensureAccessible(projetId, user);
    await this.assertAppartenance(
      'intervenantChantier',
      projetId,
      intervenantId,
      'Prestataire introuvable',
    );
    await Promise.all([
      this.options.assertMetier(dto.metier),
      this.options.assertStatutIntervenant(dto.statut),
    ]);

    const intervenant = await this.prisma.intervenantChantier.update({
      where: { id: intervenantId },
      data: {
        ...(dto.nom !== undefined ? { nom: dto.nom } : {}),
        ...(dto.metier !== undefined ? { metier: dto.metier } : {}),
        ...(dto.telephone !== undefined ? { telephone: dto.telephone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.reference !== undefined ? { reference: dto.reference } : {}),
        ...(dto.montantContrat !== undefined
          ? { montantContrat: dto.montantContrat }
          : {}),
        ...(dto.dateDebut !== undefined
          ? { dateDebut: dto.dateDebut ? new Date(dto.dateDebut) : null }
          : {}),
        ...(dto.dateFin !== undefined
          ? { dateFin: dto.dateFin ? new Date(dto.dateFin) : null }
          : {}),
        ...(dto.statut !== undefined ? { statut: dto.statut } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
    await this.resynchroniser(projetId);
    return intervenant;
  }

  async retirerIntervenant(
    projetId: string,
    intervenantId: string,
    user: ConstructionUser,
  ): Promise<void> {
    await this.access.ensureAccessible(projetId, user);
    await this.assertAppartenance(
      'intervenantChantier',
      projetId,
      intervenantId,
      'Prestataire introuvable',
    );
    const depenses = await this.prisma.depenseChantier.count({
      where: { intervenantId, statut: 'valide' },
    });
    if (depenses > 0) {
      throw new ConflictException(
        'Ce prestataire porte des dépenses validées : passez son contrat en « résilié » plutôt que de le supprimer',
      );
    }
    await this.prisma.intervenantChantier.delete({
      where: { id: intervenantId },
    });
    await this.resynchroniser(projetId);
  }

  // ----------------------------------------------------------------
  // Budget prévisionnel
  // ----------------------------------------------------------------

  async listerLignes(projetId: string, user: ConstructionUser) {
    await this.access.ensureAccessible(projetId, user);
    return this.prisma.ligneBudgetChantier.findMany({
      where: { projetId },
      orderBy: [{ poste: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async ajouterLigne(
    projetId: string,
    dto: CreateLigneBudgetDto,
    user: ConstructionUser,
  ) {
    await this.access.ensureAccessible(projetId, user);
    await Promise.all([
      this.options.assertPosteBudget(dto.poste),
      this.options.assertUnite(dto.unite),
    ]);

    const ligne = await this.prisma.ligneBudgetChantier.create({
      data: {
        projetId,
        poste: dto.poste,
        libelle: dto.libelle,
        quantite: dto.quantite,
        unite: dto.unite,
        prixUnitaire: dto.prixUnitaire,
        montantPrevu: this.montantLigne(dto),
        notes: dto.notes,
      },
    });
    await this.resynchroniser(projetId);
    return ligne;
  }

  async modifierLigne(
    projetId: string,
    ligneId: string,
    dto: UpdateLigneBudgetDto,
    user: ConstructionUser,
  ) {
    await this.access.ensureAccessible(projetId, user);
    const existante = await this.prisma.ligneBudgetChantier.findFirst({
      where: { id: ligneId, projetId },
    });
    if (!existante) throw new NotFoundException('Ligne de budget introuvable');
    await Promise.all([
      this.options.assertPosteBudget(dto.poste),
      this.options.assertUnite(dto.unite),
    ]);

    // Le total se recalcule dès que la quantité ou le prix bouge, pour qu'une
    // ligne ne puisse jamais contredire ses propres composantes.
    const quantite = dto.quantite ?? Number(existante.quantite ?? 0);
    const prixUnitaire =
      dto.prixUnitaire ?? Number(existante.prixUnitaire ?? 0);
    const montantPrevu =
      dto.montantPrevu ??
      (quantite > 0 && prixUnitaire > 0
        ? quantite * prixUnitaire
        : Number(existante.montantPrevu));

    const ligne = await this.prisma.ligneBudgetChantier.update({
      where: { id: ligneId },
      data: {
        ...(dto.poste !== undefined ? { poste: dto.poste } : {}),
        ...(dto.libelle !== undefined ? { libelle: dto.libelle } : {}),
        ...(dto.quantite !== undefined ? { quantite: dto.quantite } : {}),
        ...(dto.unite !== undefined ? { unite: dto.unite } : {}),
        ...(dto.prixUnitaire !== undefined
          ? { prixUnitaire: dto.prixUnitaire }
          : {}),
        montantPrevu,
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
    await this.resynchroniser(projetId);
    return ligne;
  }

  async retirerLigne(
    projetId: string,
    ligneId: string,
    user: ConstructionUser,
  ): Promise<void> {
    await this.access.ensureAccessible(projetId, user);
    await this.assertAppartenance(
      'ligneBudgetChantier',
      projetId,
      ligneId,
      'Ligne de budget introuvable',
    );
    await this.prisma.ligneBudgetChantier.delete({ where: { id: ligneId } });
    await this.resynchroniser(projetId);
  }

  // ----------------------------------------------------------------
  // Dépenses
  // ----------------------------------------------------------------

  async listerDepenses(projetId: string, user: ConstructionUser) {
    await this.access.ensureAccessible(projetId, user);
    return this.prisma.depenseChantier.findMany({
      where: { projetId },
      orderBy: { date: 'desc' },
      include: {
        intervenant: { select: { id: true, nom: true, metier: true } },
        ligneBudget: { select: { id: true, libelle: true, poste: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        validatedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async ajouterDepense(
    projetId: string,
    dto: CreateDepenseDto,
    user: ConstructionUser,
  ) {
    await this.access.ensureAccessible(projetId, user);
    await Promise.all([
      this.options.assertPosteBudget(dto.poste),
      this.options.assertModePaiement(dto.modePaiement),
    ]);
    if (dto.ligneBudgetId) {
      await this.assertAppartenance(
        'ligneBudgetChantier',
        projetId,
        dto.ligneBudgetId,
        'Cette ligne de budget n’appartient pas à ce chantier',
      );
    }
    if (dto.intervenantId) {
      await this.assertAppartenance(
        'intervenantChantier',
        projetId,
        dto.intervenantId,
        'Ce prestataire n’intervient pas sur ce chantier',
      );
    }

    const depense = await this.prisma.depenseChantier.create({
      data: {
        projetId,
        ligneBudgetId: dto.ligneBudgetId ?? null,
        intervenantId: dto.intervenantId ?? null,
        libelle: dto.libelle,
        poste: dto.poste,
        montant: dto.montant,
        date: dto.date ? new Date(dto.date) : new Date(),
        modePaiement: dto.modePaiement,
        reference: dto.reference,
        // Toute dépense entre en attente : elle ne pèsera sur le budget
        // qu'une fois contrôlée.
        statut: 'en_attente',
        createdById: user.id,
      },
    });
    await this.resynchroniser(projetId);
    return depense;
  }

  /**
   * Contrôle comptable. La permission `construction:payer` est distincte de
   * `construction:modifier` : celui qui engage la dépense sur le terrain ne
   * doit pas être celui qui l'entérine (section 24).
   */
  async validerDepense(
    projetId: string,
    depenseId: string,
    user: ConstructionUser,
  ) {
    this.assertPeutPayer(user);
    await this.access.ensureAccessible(projetId, user);
    const depense = await this.prisma.depenseChantier.findFirst({
      where: { id: depenseId, projetId },
      select: { id: true, statut: true },
    });
    if (!depense) throw new NotFoundException('Dépense introuvable');
    if (depense.statut === 'valide') {
      throw new ConflictException('Cette dépense est déjà validée');
    }

    const validee = await this.prisma.depenseChantier.update({
      where: { id: depenseId },
      data: {
        statut: 'valide',
        motifRejet: null,
        validatedById: user.id,
        validatedAt: new Date(),
      },
    });
    await this.resynchroniser(projetId);
    return validee;
  }

  async rejeterDepense(
    projetId: string,
    depenseId: string,
    dto: ValiderDepenseDto,
    user: ConstructionUser,
  ) {
    this.assertPeutPayer(user);
    await this.access.ensureAccessible(projetId, user);
    const depense = await this.prisma.depenseChantier.findFirst({
      where: { id: depenseId, projetId },
      select: { id: true, statut: true },
    });
    if (!depense) throw new NotFoundException('Dépense introuvable');
    if (!dto.motif?.trim()) {
      throw new BadRequestException(
        'Un rejet doit être motivé : le chantier doit savoir quoi corriger',
      );
    }

    const rejetee = await this.prisma.depenseChantier.update({
      where: { id: depenseId },
      data: {
        statut: 'rejete',
        motifRejet: dto.motif.trim(),
        validatedById: user.id,
        validatedAt: new Date(),
      },
    });
    await this.resynchroniser(projetId);
    return rejetee;
  }

  async retirerDepense(
    projetId: string,
    depenseId: string,
    user: ConstructionUser,
  ): Promise<void> {
    await this.access.ensureAccessible(projetId, user);
    const depense = await this.prisma.depenseChantier.findFirst({
      where: { id: depenseId, projetId },
      select: { id: true, statut: true },
    });
    if (!depense) throw new NotFoundException('Dépense introuvable');
    if (depense.statut === 'valide' && !this.peutPayer(user)) {
      throw new ForbiddenException(
        'Une dépense validée ne se supprime qu’avec la permission construction:payer',
      );
    }
    await this.prisma.depenseChantier.delete({ where: { id: depenseId } });
    await this.resynchroniser(projetId);
  }

  /**
   * Synthèse budgétaire du chantier, poste par poste : c'est ce que la fiche
   * affiche et ce que le rapport client reprend.
   */
  async synthese(projetId: string, user: ConstructionUser) {
    await this.access.ensureAccessible(projetId, user);
    const [projet, lignes, depenses, intervenants, reglages] =
      await Promise.all([
        this.prisma.projetConstruction.findUnique({
          where: { id: projetId },
          select: { montantDevis: true, budgetPrevu: true },
        }),
        this.prisma.ligneBudgetChantier.findMany({
          where: { projetId },
          select: { poste: true, montantPrevu: true },
        }),
        this.prisma.depenseChantier.findMany({
          where: { projetId },
          select: { poste: true, montant: true, statut: true },
        }),
        this.prisma.intervenantChantier.findMany({
          where: { projetId },
          select: { montantContrat: true, statut: true },
        }),
        this.options.getReglages(),
      ]);
    if (!projet) throw new NotFoundException('Chantier introuvable');

    const global = calculerBudget(
      projet,
      lignes,
      depenses,
      intervenants,
      reglages.seuilAlerteBudget,
    );

    // Un poste dépassé se repère seulement si on compare prévu et dépensé au
    // même niveau de détail.
    const postes = new Map<
      string,
      { prevu: number; depense: number; enAttente: number }
    >();
    const entree = (poste: string) => {
      const existante = postes.get(poste) ?? {
        prevu: 0,
        depense: 0,
        enAttente: 0,
      };
      postes.set(poste, existante);
      return existante;
    };
    for (const ligne of lignes) {
      entree(ligne.poste).prevu += Number(ligne.montantPrevu);
    }
    for (const depense of depenses) {
      const cible = entree(depense.poste);
      if (depense.statut === 'valide') cible.depense += Number(depense.montant);
      else if (depense.statut === 'en_attente')
        cible.enAttente += Number(depense.montant);
    }

    return {
      ...global,
      parPoste: [...postes.entries()]
        .map(([poste, valeurs]) => ({
          poste,
          ...valeurs,
          ecart: valeurs.prevu - valeurs.depense,
          depassement: valeurs.prevu > 0 && valeurs.depense > valeurs.prevu,
        }))
        .sort((a, b) => b.depense - a.depense),
    };
  }

  /** Quantité × prix unitaire si les deux sont là, sinon le total saisi. */
  private montantLigne(dto: CreateLigneBudgetDto): number {
    if (dto.quantite && dto.prixUnitaire) {
      return dto.quantite * dto.prixUnitaire;
    }
    if (dto.montantPrevu === undefined) {
      throw new BadRequestException(
        'Indiquez un montant prévu, ou une quantité et un prix unitaire',
      );
    }
    return dto.montantPrevu;
  }

  private peutPayer(user: ConstructionUser): boolean {
    return user.permissions?.includes('construction:payer') ?? false;
  }

  private assertPeutPayer(user: ConstructionUser): void {
    if (!this.peutPayer(user)) {
      throw new ForbiddenException(
        'Le contrôle des dépenses relève de la permission construction:payer',
      );
    }
  }

  /** Une pièce d'un autre chantier n'a rien à faire dans celui-ci. */
  private async assertAppartenance(
    modele: 'intervenantChantier' | 'ligneBudgetChantier',
    projetId: string,
    id: string,
    message: string,
  ): Promise<void> {
    const trouve =
      modele === 'intervenantChantier'
        ? await this.prisma.intervenantChantier.findFirst({
            where: { id, projetId },
            select: { id: true },
          })
        : await this.prisma.ligneBudgetChantier.findFirst({
            where: { id, projetId },
            select: { id: true },
          });
    if (!trouve) throw new NotFoundException(message);
  }

  private async resynchroniser(projetId: string): Promise<void> {
    const reglages = await this.options.getReglages();
    await this.prisma.$transaction((tx) =>
      synchroniserChantier(tx, projetId, {
        seuilPourcent: reglages.seuilAlerteBudget,
        horizonJours: reglages.horizonEcheanceJours,
      }),
    );
  }
}
