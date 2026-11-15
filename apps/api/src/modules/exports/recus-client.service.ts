import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CompanyProfileService } from '../company/company-profile.service';
import {
  type RapportDonnees,
  formaterDate,
  formaterMontant,
} from '../pilotage/pilotage.calculs';
import { renderRapportPdf } from '../pilotage/rapport-pdf';

const MODES: Record<string, string> = {
  acompte: 'Acompte',
  virement: 'Virement',
  especes: 'Espèces',
  cheque: 'Chèque',
  wave: 'Wave',
  orange_money: 'Orange Money',
  mobile_money: 'Mobile Money',
  carte: 'Carte bancaire',
};

function libelleMode(code: string): string {
  return MODES[code] ?? code.replace(/_/g, ' ');
}

export interface RecuPaiement {
  numero: string;
  date: Date;
  montant: number;
  mode: string;
  /** Ce qui est réglé : un loyer, un dossier de vente. */
  objet: string;
  /** Lignes d'information du reçu (parties, cumul, reste dû). */
  details: Array<{ libelle: string; valeur: string }>;
}

/** Le reçu d'un paiement, au format que lit le moteur PDF des rapports : un bloc d'indicateurs et une ligne. */
export function rapportRecu(recu: RecuPaiement): RapportDonnees {
  return {
    code: 'recu_paiement',
    titre: 'Reçu de paiement',
    sousTitre: `Reçu n° ${recu.numero} · ${formaterDate(recu.date)}`,
    periode: null,
    resume: [
      { libelle: 'Montant reçu', valeur: formaterMontant(recu.montant) },
      { libelle: 'Mode de paiement', valeur: libelleMode(recu.mode) },
      ...recu.details,
    ],
    sections: [
      {
        titre: 'Paiement enregistré',
        colonnes: [
          { cle: 'date', libelle: 'Date', type: 'date' },
          { cle: 'objet', libelle: 'Objet', type: 'texte' },
          { cle: 'mode', libelle: 'Mode', type: 'texte' },
          { cle: 'montant', libelle: 'Montant (FCFA)', type: 'montant' },
        ],
        lignes: [
          {
            date: recu.date.toISOString().slice(0, 10),
            objet: recu.objet,
            mode: libelleMode(recu.mode),
            montant: recu.montant,
          },
        ],
        total: { objet: 'Total reçu', montant: recu.montant },
        note: 'Ce reçu atteste d’un paiement validé par MTM Immobilier. Il ne remplace pas le contrat ou la quittance officielle.',
      },
    ],
  };
}

/**
 * Reçus de paiement téléchargeables par le client, depuis son espace. Un reçu n'existe que pour un paiement VALIDÉ
 * par MTM, et seul le client concerné peut le télécharger : un autre compte reçoit « introuvable ».
 */
@Injectable()
export class RecusClientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly company: CompanyProfileService,
  ) {}

  async recuVente(userId: string, paiementId: string): Promise<Buffer> {
    const prospectId = await this.rattachement(userId, 'clientProspectId');
    const paiement = await this.prisma.paiement.findFirst({
      where: {
        id: paiementId,
        statut: 'valide',
        dossierVente: { prospectId },
      },
      select: {
        id: true,
        montant: true,
        datePaiement: true,
        mode: true,
        reference: true,
        dossierVenteId: true,
        dossierVente: {
          select: {
            referenceInterne: true,
            prixVente: true,
            terrain: { select: { nom: true, commune: true } },
            prospect: { select: { nom: true, prenom: true } },
          },
        },
      },
    });
    if (!paiement) throw new NotFoundException('Reçu introuvable');
    const cumul = await this.prisma.paiement.aggregate({
      where: {
        dossierVenteId: paiement.dossierVenteId,
        statut: 'valide',
        datePaiement: { lte: paiement.datePaiement },
      },
      _sum: { montant: true },
    });
    const paye = Number(cumul._sum.montant ?? 0);
    const prix = paiement.dossierVente.prixVente
      ? Number(paiement.dossierVente.prixVente)
      : null;
    const client = [
      paiement.dossierVente.prospect?.prenom,
      paiement.dossierVente.prospect?.nom,
    ]
      .filter(Boolean)
      .join(' ');
    const bien = paiement.dossierVente.terrain
      ? [
          paiement.dossierVente.terrain.nom,
          paiement.dossierVente.terrain.commune,
        ]
          .filter(Boolean)
          .join(', ')
      : 'Dossier de vente';
    return this.rendre({
      numero: paiement.reference ?? paiement.id.slice(0, 8).toUpperCase(),
      date: paiement.datePaiement,
      montant: Number(paiement.montant),
      mode: paiement.mode,
      objet: `${bien}${paiement.dossierVente.referenceInterne ? ` · dossier ${paiement.dossierVente.referenceInterne}` : ''}`,
      details: [
        ...(client ? [{ libelle: 'Client', valeur: client }] : []),
        { libelle: 'Total payé à cette date', valeur: formaterMontant(paye) },
        ...(prix !== null
          ? [
              {
                libelle: 'Reste à payer',
                valeur: formaterMontant(Math.max(0, prix - paye)),
              },
            ]
          : []),
      ],
    });
  }

  async recuLoyer(userId: string, paiementId: string): Promise<Buffer> {
    const locataireId = await this.rattachement(userId, 'clientLocataireId');
    const paiement = await this.prisma.paiementLoyer.findFirst({
      where: {
        id: paiementId,
        statut: 'valide',
        bailLocatif: { locataireId },
      },
      select: {
        id: true,
        montant: true,
        datePaiement: true,
        modePaiement: true,
        reference: true,
        echeance: { select: { periode: true } },
        bailLocatif: {
          select: {
            referenceInterne: true,
            bienLocatif: { select: { adresse: true, commune: true } },
            locataire: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!paiement) throw new NotFoundException('Reçu introuvable');
    const bail = paiement.bailLocatif;
    const locataire = [bail.locataire?.firstName, bail.locataire?.lastName]
      .filter(Boolean)
      .join(' ');
    const periode = paiement.echeance?.periode
      ? paiement.echeance.periode.toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : null;
    return this.rendre({
      numero: paiement.reference ?? paiement.id.slice(0, 8).toUpperCase(),
      date: paiement.datePaiement,
      montant: Number(paiement.montant),
      mode: paiement.modePaiement,
      objet: periode ? `Loyer de ${periode}` : 'Règlement de loyer',
      details: [
        ...(locataire ? [{ libelle: 'Locataire', valeur: locataire }] : []),
        {
          libelle: 'Logement',
          valeur: [
            bail.bienLocatif.adresse,
            bail.referenceInterne && `bail ${bail.referenceInterne}`,
          ]
            .filter(Boolean)
            .join(' · '),
        },
      ],
    });
  }

  private async rendre(recu: RecuPaiement): Promise<Buffer> {
    return renderRapportPdf(rapportRecu(recu), await this.company.getSociete());
  }

  /** L'identifiant client rattaché au compte, ou un refus net : un compte du personnel n'a pas de reçu à lui. */
  private async rattachement(
    userId: string,
    champ: 'clientProspectId' | 'clientLocataireId',
  ): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { [champ]: true },
    });
    const id = (user as Record<string, string | null> | null)?.[champ];
    if (!id)
      throw new ForbiddenException(
        'Ce compte n’est pas rattaché à ce type d’espace',
      );
    return id;
  }
}
