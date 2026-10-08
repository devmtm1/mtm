import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { TerrainsAccessService } from '../terrains-access.service';
import type { ImportTerrainsDto } from '../dto/import-terrains.dto';
import { lireTableur } from './lecture-tableur';
import { preparerImport } from './terrain-import';
import {
  chargerOptionsImport,
  ecrireBiens,
  referencesExistantes,
} from './terrain-import-persist';

/** Au-delà, la liste est tronquée dans la réponse : le total, lui, reste exact. */
const MAX_DETAILS = 300;

type Utilisateur = { id: string; roles: string[]; permissions: string[] };

/**
 * Import d'un tableur de biens depuis le back-office. Deux temps, sans état
 * côté serveur : l'aperçu lit et contrôle le fichier sans rien écrire ;
 * l'import relit le même fichier et écrit. Le contrôle est donc refait à
 * l'écriture : ce qui est créé est toujours ce que les règles du moment
 * autorisent, même si les paramètres ont changé depuis l'aperçu.
 */
@Injectable()
export class TerrainsImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TerrainsAccessService,
  ) {}

  async apercu(
    fichier: Express.Multer.File | undefined,
    dto: ImportTerrainsDto,
    user: Utilisateur,
  ) {
    const analyse = await this.analyser(fichier, dto, user);
    return analyse.reponse;
  }

  async importer(
    fichier: Express.Multer.File | undefined,
    dto: ImportTerrainsDto,
    user: Utilisateur,
  ) {
    const { rapport, aCreer, reponse } = await this.analyser(
      fichier,
      dto,
      user,
    );
    // Seul l'encadrement voit tous les biens : un commercial n'importerait
    // sinon que des biens qu'il ne retrouverait pas dans sa liste.
    const responsableId = this.access.hasGlobalScope(user) ? null : user.id;
    const crees = await ecrireBiens(this.prisma, aCreer, {
      responsableId,
      archiveParId: user.id,
    });
    return { ...reponse, crees, refuses: rapport.refuses.length };
  }

  private async analyser(
    fichier: Express.Multer.File | undefined,
    dto: ImportTerrainsDto,
    user: Utilisateur,
  ) {
    if (!fichier) throw new BadRequestException('Aucun fichier reçu');
    if (dto.publierDisponibles) this.access.assertCanPublish(true, user);

    const tableur = await lireTableur(fichier, dto.feuille);
    const options = await chargerOptionsImport(this.prisma, {
      publierDisponibles: dto.publierDisponibles ?? false,
      archives: dto.archives ?? false,
    });
    const rapport = preparerImport(tableur.lignes, options);
    const existantes = await referencesExistantes(this.prisma, rapport.biens);
    const aCreer = rapport.biens.filter(
      (b) => !existantes.has(b.referenceInterne),
    );

    const reponse = {
      feuilles: tableur.feuilles,
      feuille: tableur.feuille,
      aCreer: aCreer.length,
      dejaPresents: rapport.biens.length - aCreer.length,
      refuses: rapport.refuses.length,
      ignorees: rapport.ignorees,
      nombreAvertissements: rapport.avertissements.length,
      lignesRefusees: rapport.refuses.slice(0, MAX_DETAILS),
      avertissements: rapport.avertissements.slice(0, MAX_DETAILS),
      apercu: aCreer.slice(0, 20).map((b) => ({
        ligne: b.ligne,
        referenceInterne: b.referenceInterne,
        nom: b.nom,
        statutJuridique: b.statutJuridique,
        statutCommercial: b.statutCommercial,
        nombreLots: b.nombreLots ?? null,
        superficie: b.superficie ?? null,
        prixPublic: b.prixPublic ?? null,
        contact: b.contactVendeurNom ?? null,
        modalitePaiement: b.modalitePaiement ?? null,
      })),
    };
    return { rapport, aCreer, reponse };
  }
}
