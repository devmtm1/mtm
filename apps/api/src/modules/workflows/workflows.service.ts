import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { VentesWorkflowService } from '../ventes/ventes-workflow.service';
import {
  WORKFLOWS,
  workflowDe,
  type DefinitionWorkflow,
} from './workflows.catalogue';

const FORMAT_ETAPE = /^[a-z][a-z0-9_]{1,39}$/;
const MAX_ETAPES = 30;

export interface EntreeWorkflow {
  statuts: string[];
  transitions?: Record<string, string[]>;
}

/**
 * Éditeur des parcours des dossiers (section 21). Écrit les mêmes paramètres
 * que lisent déjà les modules, après contrôle : une erreur de saisie ne doit
 * pas pouvoir bloquer les paiements ou la réception d'un chantier.
 */
@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly ventes: VentesWorkflowService,
  ) {}

  async lister() {
    return Promise.all(WORKFLOWS.map((workflow) => this.decrire(workflow)));
  }

  private async decrire(workflow: DefinitionWorkflow) {
    const statuts = await this.settings.getStringList(
      workflow.statutsCle,
      workflow.statutsDefauts,
    );
    const transitions = workflow.transitionsCle
      ? await this.ventes.getAllowedTransitions()
      : undefined;
    return {
      module: workflow.module,
      libelle: workflow.libelle,
      description: workflow.description,
      statuts,
      /** Étapes d'origine : protégées, on ne les retire pas. */
      obligatoires: [...workflow.statutsDefauts],
      transitions,
      transitionsObligatoires: workflow.transitionsDefauts,
      compte: await this.compter(workflow),
    };
  }

  /** Nombre de dossiers par étape : on voit ce qu'une étape contient avant d'y toucher. */
  private async compter(workflow: DefinitionWorkflow) {
    const lignes =
      workflow.comptage === 'ventes'
        ? await this.prisma.dossierVente.groupBy({
            by: ['statut'],
            _count: { _all: true },
          })
        : workflow.comptage === 'crm'
          ? await this.prisma.prospect.groupBy({
              by: ['statutPipeline'],
              _count: { _all: true },
            })
          : await this.prisma.projetConstruction.groupBy({
              by: ['statut'],
              _count: { _all: true },
            });
    const compte: Record<string, number> = {};
    for (const ligne of lignes as Array<Record<string, unknown>>) {
      const etape = (ligne.statut ?? ligne.statutPipeline) as string;
      compte[etape] = (ligne._count as { _all: number })._all;
    }
    return compte;
  }

  validerEntree(workflow: DefinitionWorkflow, entree: EntreeWorkflow) {
    const statuts = entree.statuts;
    if (!Array.isArray(statuts) || statuts.some((s) => typeof s !== 'string')) {
      throw new BadRequestException('La liste des étapes est invalide');
    }
    if (statuts.length > MAX_ETAPES) {
      throw new BadRequestException(`Au plus ${MAX_ETAPES} étapes`);
    }
    for (const etape of statuts) {
      if (!FORMAT_ETAPE.test(etape)) {
        throw new BadRequestException(
          `« ${etape} » n’est pas un nom d’étape valide : minuscules, chiffres et tiret bas, 2 à 40 caractères`,
        );
      }
    }
    if (new Set(statuts).size !== statuts.length) {
      throw new BadRequestException('Une étape apparaît deux fois');
    }
    const retirees = workflow.statutsDefauts.filter(
      (e) => !statuts.includes(e),
    );
    if (retirees.length > 0) {
      throw new BadRequestException(
        `Les étapes d’origine ne se retirent pas (le système s’en sert) : ${retirees.join(', ')}`,
      );
    }

    if (!workflow.transitionsCle) return undefined;
    const transitions = entree.transitions ?? {};
    const propres: Record<string, string[]> = {};
    for (const etape of statuts) {
      const cibles = transitions[etape] ?? [];
      if (!Array.isArray(cibles) || cibles.some((c) => typeof c !== 'string')) {
        throw new BadRequestException(`Passages invalides depuis « ${etape} »`);
      }
      const inconnue = cibles.find((cible) => !statuts.includes(cible));
      if (inconnue) {
        throw new BadRequestException(
          `« ${etape} » mène à « ${inconnue} », qui n’existe pas`,
        );
      }
      propres[etape] = [...new Set(cibles.filter((c) => c !== etape))];
    }
    for (const cle of Object.keys(transitions)) {
      if (!statuts.includes(cle)) {
        throw new BadRequestException(
          `Passages définis pour une étape inconnue : ${cle}`,
        );
      }
    }
    // Les passages d'origine sont indispensables : le calcul des paiements s'y appuie.
    for (const [depuis, cibles] of Object.entries(
      workflow.transitionsDefauts ?? {},
    )) {
      const manquants = cibles.filter(
        (cible) => !propres[depuis]?.includes(cible),
      );
      if (manquants.length > 0) {
        throw new BadRequestException(
          `Le passage d’origine « ${depuis} » → « ${manquants.join(', ')} » ne peut pas être retiré`,
        );
      }
    }
    return propres;
  }

  async enregistrer(module: string, entree: EntreeWorkflow, userId: string) {
    const workflow = workflowDe(module);
    if (!workflow) throw new NotFoundException('Parcours inconnu');
    const transitions = this.validerEntree(workflow, entree);

    // Une étape ajoutée puis utilisée ne peut disparaître : ses dossiers n'auraient plus d'étape.
    const avant = await this.settings.getStringList(
      workflow.statutsCle,
      workflow.statutsDefauts,
    );
    const compte = await this.compter(workflow);
    const occupees = avant.filter(
      (etape) => !entree.statuts.includes(etape) && (compte[etape] ?? 0) > 0,
    );
    if (occupees.length > 0) {
      throw new BadRequestException(
        `Des dossiers sont encore à l’étape « ${occupees.join(', ')} » : déplacez-les avant de la retirer`,
      );
    }

    await this.ecrire(workflow.statutsCle, entree.statuts, userId);
    if (workflow.transitionsCle && transitions) {
      await this.ecrire(workflow.transitionsCle, transitions, userId);
    }
    return this.decrire(workflow);
  }

  private async ecrire(cle: string, valeur: unknown, userId: string) {
    await this.prisma.systemSetting.upsert({
      where: { key: cle },
      update: { value: valeur as object, updatedById: userId },
      create: {
        key: cle,
        value: valeur as object,
        description:
          'Étapes du parcours, réglées depuis Administration › Réglages › Étapes des dossiers',
        isSensitive: false,
        updatedById: userId,
      },
    });
  }
}
