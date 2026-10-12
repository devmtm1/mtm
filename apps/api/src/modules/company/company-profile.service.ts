import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
import { parseJpeg, type PdfJpeg } from '../../common/pdf/pdf-document';
import type { Societe } from '../../common/pdf/societe';
import { ProfilEntrepriseDto } from './dto/profil-entreprise.dto';

/** Clés des paramètres : tout ce que l'entreprise imprime sur ses documents. */
export const CLES_ENTREPRISE = {
  raisonSociale: 'entreprise.raisonSociale',
  nomCommercial: 'entreprise.nomCommercial',
  slogan: 'entreprise.slogan',
  formeJuridique: 'entreprise.formeJuridique',
  capital: 'entreprise.capital',
  ninea: 'entreprise.ninea',
  rccm: 'entreprise.rccm',
  adresse: 'entreprise.adresse',
  telephone: 'entreprise.telephone',
  email: 'entreprise.email',
  siteWeb: 'entreprise.siteWeb',
  banque: 'entreprise.banque',
  mentionPied: 'entreprise.mentionPied',
  logo: 'entreprise.logo',
} as const;

type ChampTexte = Exclude<keyof typeof CLES_ENTREPRISE, 'logo'>;

const CHAMPS_TEXTE = Object.keys(CLES_ENTREPRISE).filter(
  (cle) => cle !== 'logo',
) as ChampTexte[];

const NOM_PAR_DEFAUT = 'MTM Immobilier';
const SLOGAN_PAR_DEFAUT = 'Achat · Vente · Gérance immobilière & BTP';
const ADRESSE_PAR_DEFAUT = 'Dakar, Sénégal';

/** Le logo téléchargé est gardé en mémoire : un document ne doit pas attendre Cloudinary à chaque fois. */
const LOGO_TTL_MS = 60 * 60 * 1000;

export interface ProfilEntreprise {
  /** Valeurs saisies (chaîne vide = non renseigné). */
  valeurs: Record<ChampTexte, string>;
  /** Ce que les documents afficheront si le champ est laissé vide. */
  parDefaut: {
    nomCommercial: string;
    slogan: string;
    adresse: string;
    telephone: string;
    email: string;
  };
  logoUrl: string | null;
  /** Vrai quand un logo a été téléversé ; faux : le logo MTM par défaut s'applique. */
  logoPersonnalise: boolean;
}

/**
 * Identité de l'entreprise pour les documents générés : un seul endroit lit les
 * paramètres, le logo et les coordonnées du site, et en fait la `Societe` que
 * tous les générateurs de PDF utilisent. Auparavant chaque module avait sa
 * propre copie, avec seulement l'adresse, le téléphone et l'e-mail.
 */
@Injectable()
export class CompanyProfileService {
  private logoEnCache?: { cle: string; jpeg: PdfJpeg | null; expire: number };

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** L'identité prête à imprimer, logo compris. */
  async getSociete(): Promise<Societe> {
    const { valeurs, parDefaut } = await this.lire();
    return {
      name: valeurs.nomCommercial || parDefaut.nomCommercial,
      tagline: valeurs.slogan || parDefaut.slogan,
      adresse: valeurs.adresse || parDefaut.adresse,
      telephone: valeurs.telephone || parDefaut.telephone,
      email: valeurs.email || parDefaut.email,
      raisonSociale: valeurs.raisonSociale || undefined,
      formeJuridique: valeurs.formeJuridique || undefined,
      capital: valeurs.capital || undefined,
      ninea: valeurs.ninea || undefined,
      rccm: valeurs.rccm || undefined,
      siteWeb: valeurs.siteWeb || undefined,
      banque: valeurs.banque || undefined,
      mentionPied: valeurs.mentionPied || undefined,
      logo: await this.chargerLogo(),
    };
  }

  async getProfil(): Promise<ProfilEntreprise> {
    const { valeurs, parDefaut, logo } = await this.lire();
    return {
      valeurs,
      parDefaut,
      logoUrl: logo ? this.cloudinary.url(logo, 'image', true) || null : null,
      logoPersonnalise: Boolean(logo),
    };
  }

  /** Enregistre les champs envoyés ; un champ vide est effacé. */
  async enregistrer(dto: ProfilEntrepriseDto, userId: string) {
    for (const champ of CHAMPS_TEXTE) {
      const valeur = dto[champ];
      if (valeur === undefined) continue;
      await this.ecrire(CLES_ENTREPRISE[champ], valeur.trim(), userId);
    }
    return this.getProfil();
  }

  /** Remplace le logo : image JPG, PNG ou WebP ; l'ancien est supprimé de Cloudinary. */
  async changerLogo(file: Express.Multer.File | undefined, userId: string) {
    if (!file) throw new BadRequestException('Une image est obligatoire');
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException(
        'Le logo doit être une image (JPG, PNG ou WebP)',
      );
    }
    validateUploadedAsset(file, 'media');
    const envoye = await this.cloudinary.upload(file, 'mtm/entreprise', true);
    const ancien = await this.cleLogo();
    await this.ecrire(CLES_ENTREPRISE.logo, envoye.publicId, userId);
    if (ancien) await this.cloudinary.destroy(ancien, 'image', true);
    this.logoEnCache = undefined;
    return this.getProfil();
  }

  /** Retire le logo téléversé : les documents reprennent le logo MTM par défaut. */
  async retirerLogo(userId: string) {
    const ancien = await this.cleLogo();
    await this.ecrire(CLES_ENTREPRISE.logo, '', userId);
    if (ancien) await this.cloudinary.destroy(ancien, 'image', true);
    this.logoEnCache = undefined;
    return this.getProfil();
  }

  // --- internes ---

  private async cleLogo(): Promise<string> {
    const ligne = await this.prisma.systemSetting.findUnique({
      where: { key: CLES_ENTREPRISE.logo },
      select: { value: true },
    });
    return typeof ligne?.value === 'string' ? ligne.value : '';
  }

  private async chargerLogo(): Promise<PdfJpeg | null> {
    const cle = await this.cleLogo();
    if (!cle) return null;
    const maintenant = Date.now();
    if (this.logoEnCache?.cle === cle && this.logoEnCache.expire > maintenant) {
      return this.logoEnCache.jpeg;
    }
    const octets = await this.cloudinary.downloadJpeg(cle, true);
    const jpeg = octets ? parseJpeg(octets) : null;
    // Un échec n'est mémorisé que brièvement : le logo reviendra dès que Cloudinary répond.
    this.logoEnCache = {
      cle,
      jpeg,
      expire: maintenant + (jpeg ? LOGO_TTL_MS : 30_000),
    };
    return jpeg;
  }

  private async lire() {
    const blocs = await this.prisma.contentBlock.findMany({
      where: {
        key: { in: ['contact.adresse', 'contact.telephone', 'contact.email'] },
        isActive: true,
      },
      select: { key: true, content: true },
    });
    const bloc = (cle: string, repli: string): string =>
      blocs.find((ligne) => ligne.key === cle)?.content?.trim() || repli;

    const lignes = await this.prisma.systemSetting.findMany({
      where: { key: { in: Object.values(CLES_ENTREPRISE) } },
      select: { key: true, value: true },
    });
    const texte = (cle: string): string => {
      const valeur = lignes.find((ligne) => ligne.key === cle)?.value;
      return typeof valeur === 'string' ? valeur.trim() : '';
    };
    const valeurs = Object.fromEntries(
      CHAMPS_TEXTE.map((champ) => [champ, texte(CLES_ENTREPRISE[champ])]),
    ) as Record<ChampTexte, string>;

    return {
      valeurs,
      logo: texte(CLES_ENTREPRISE.logo),
      parDefaut: {
        nomCommercial: NOM_PAR_DEFAUT,
        slogan: SLOGAN_PAR_DEFAUT,
        adresse: bloc('contact.adresse', ADRESSE_PAR_DEFAUT),
        telephone: bloc('contact.telephone', ''),
        email: bloc('contact.email', ''),
      },
    };
  }

  private async ecrire(cle: string, valeur: string, userId: string) {
    await this.prisma.systemSetting.upsert({
      where: { key: cle },
      update: { value: valeur, updatedById: userId },
      create: {
        key: cle,
        value: valeur,
        description:
          'Identité de l’entreprise imprimée sur les documents générés',
        isSensitive: false,
        updatedById: userId,
      },
    });
  }
}
