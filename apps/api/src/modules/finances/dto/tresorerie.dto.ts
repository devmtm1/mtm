import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MODES_REVERSEMENT, TYPES_COMPTE } from '../tresorerie.calculs';

const MONTANT_MAX = 1_000_000_000_000;

const montant = () => [
  Type(() => Number),
  IsNumber({ maxDecimalPlaces: 0 }),
  Min(1),
  Max(MONTANT_MAX),
];

function appliquer(decorateurs: PropertyDecorator[]): PropertyDecorator {
  return (cible, cle) => {
    for (const decorateur of decorateurs) decorateur(cible, cle);
  };
}
const Montant = () => appliquer(montant());

// --- Comptes de trésorerie ---

export class CreateCompteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nom!: string;

  @IsIn(TYPES_COMPTE)
  type!: string;

  /** Modes de paiement servis par ce compte : especes, virement, wave, orange_money… */
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  modes!: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  @Max(MONTANT_MAX)
  soldeInitial?: number;

  /** Les mouvements antérieurs à cette date ne comptent pas dans le solde. */
  @IsOptional()
  @IsDateString()
  dateSoldeInitial?: string;
}

export class UpdateCompteDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nom?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  modes?: string[];

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

export class QuerySoldesDto {
  /** Solde à la fin de ce jour (AAAA-MM-JJ) ; par défaut aujourd'hui. */
  @IsOptional()
  @IsDateString()
  au?: string;
}

// --- Mouvements de fonds ---

export const TYPES_MOUVEMENT = [
  'transfert',
  'remise_fonds',
  'avance',
  'remboursement',
] as const;

export class CreateMouvementFondsDto {
  @IsIn(TYPES_MOUVEMENT)
  type!: string;

  @IsOptional()
  @IsUUID()
  compteSourceId?: string;

  @IsOptional()
  @IsUUID()
  compteDestinationId?: string;

  @Montant()
  montant!: number;

  @IsDateString()
  date!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  motif!: string;

  /** D'où vient l'argent : recettes du jour, retrait bancaire, vente de… */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  origine?: string;

  @IsOptional()
  @IsUUID()
  remetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  remetNom?: string;

  @IsOptional()
  @IsUUID()
  recoitId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  recoitNom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}

export class QueryMouvementsDto {
  @IsOptional()
  @IsIn(TYPES_MOUVEMENT)
  type?: string;

  @IsOptional()
  @IsIn(['en_attente', 'confirme', 'rejete'])
  statut?: string;

  @IsOptional()
  @IsUUID()
  compteId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;
}

export class MotifDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  motif!: string;
}

// --- Clôture de caisse ---

export class CloturerCaisseDto {
  @IsUUID()
  compteId!: string;

  /** Le jour clôturé (AAAA-MM-JJ), jamais dans le futur. */
  @IsDateString()
  date!: string;

  /** Ce que la comptable a réellement compté. */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  @Max(MONTANT_MAX)
  montantCompte!: number;

  /** Obligatoire dès qu'il y a un écart. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  explication?: string;
}

export class DecisionEcartDto {
  @IsIn(['acceptee', 'a_corriger'])
  decision!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  motif!: string;
}

export class QueryCloturesCaisseDto {
  @IsOptional()
  @IsUUID()
  compteId?: string;

  @IsOptional()
  @IsIn(['aucune', 'en_attente', 'acceptee', 'a_corriger'])
  decision?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;
}

// --- Reversements aux propriétaires ---

export class QuerySituationsDto {
  @IsOptional()
  @IsUUID()
  proprietaireId?: string;

  @IsOptional()
  @IsUUID()
  dossierVenteId?: string;
}

export class CreateReversementDto {
  @IsUUID()
  dossierVenteId!: string;

  @Montant()
  montant!: number;

  /** normal : dans ce que MTM a encaissé pour le propriétaire ; avance : au-delà, exceptionnel. */
  @IsOptional()
  @IsIn(['normal', 'avance'])
  type?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  motif!: string;
}

export class QueryReversementsDto {
  @IsOptional()
  @IsIn(['en_attente', 'autorise', 'paye', 'rejete'])
  statut?: string;

  @IsOptional()
  @IsUUID()
  proprietaireId?: string;

  @IsOptional()
  @IsUUID()
  dossierVenteId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;
}

export class AutoriserReversementDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  motif?: string;
}

export class PayerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  modePaiement!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  reference!: string;

  /** Jour du paiement (AAAA-MM-JJ), jamais dans le futur. */
  @IsDateString()
  datePaiement!: string;
}

export class ModeReversementDto {
  @IsIn(MODES_REVERSEMENT)
  modeReversement!: string;
}

// --- Désistement et remboursement ---

export class CreateRemboursementDto {
  @IsUUID()
  dossierVenteId!: string;

  /** Date de réception de la demande du client (AAAA-MM-JJ). */
  @IsDateString()
  dateDemande!: string;

  /** Avance versée sur laquelle porte la retenue ; par défaut l'acompte de la réservation. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  @Max(MONTANT_MAX)
  avance?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motif?: string;

  /** Version du protocole signé par le client, conservée avec la demande. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  versionProtocole?: string;
}

export class DecisionRemboursementDto {
  @IsIn(['acceptee', 'refusee'])
  decision!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  motif!: string;
}

// --- Chantiers ---

export class EcheanceChantierDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  libelle!: string;

  @IsOptional()
  @IsDateString()
  dateEcheance?: string;

  @Montant()
  montantPrevu!: number;
}

export class DefinirEcheancesDto {
  @IsArray()
  @ArrayMaxSize(24)
  @ValidateNested({ each: true })
  @Type(() => EcheanceChantierDto)
  echeances!: EcheanceChantierDto[];
}

export class CreatePaiementChantierDto {
  @IsOptional()
  @IsUUID()
  echeanceId?: string;

  @Montant()
  montant!: number;

  @IsDateString()
  date!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  mode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class QueryPaiementsChantierDto {
  @IsOptional()
  @IsIn(['en_attente', 'valide', 'rejete'])
  statut?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;
}

// --- Rapports ---

export class QueryRapportDto {
  @IsOptional()
  @IsDateString()
  du?: string;

  @IsOptional()
  @IsDateString()
  au?: string;

  @IsOptional()
  @IsUUID()
  compteId?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  csv?: boolean;
}

export class QueryRapportQuotidienDto {
  /** Le jour du rapport (AAAA-MM-JJ) ; par défaut aujourd'hui. */
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class QueryRapportsQuotidiensDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  limite = 30;
}

// --- Rapprochement bancaire ---

export class QueryRapprochementDto {
  @IsOptional()
  @IsDateString()
  du?: string;

  @IsOptional()
  @IsDateString()
  au?: string;
}

export class RapprocherDto {
  /** Identifiant du mouvement du logiciel : paiement:…, operation:…, fonds:… */
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  mouvementId!: string;
}
