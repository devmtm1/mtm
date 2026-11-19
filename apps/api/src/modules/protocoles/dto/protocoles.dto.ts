import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  MOYENS_ENVOI,
  STATUTS_PROTOCOLE,
  TYPES_PROTOCOLE,
} from '../protocoles.regles';

export class CreateProtocoleDto {
  @ApiProperty()
  @IsUUID()
  dossierVenteId!: string;

  @ApiPropertyOptional({ enum: TYPES_PROTOCOLE })
  @IsOptional()
  @IsIn(TYPES_PROTOCOLE)
  type?: (typeof TYPES_PROTOCOLE)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titre?: string;
}

export class ChangerStatutProtocoleDto {
  @ApiProperty({ enum: STATUTS_PROTOCOLE })
  @IsIn(STATUTS_PROTOCOLE)
  statut!: (typeof STATUTS_PROTOCOLE)[number];

  @ApiPropertyOptional({
    description: 'Motif d’une correction ou d’une annulation.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motif?: string;

  @ApiPropertyOptional({
    description: 'Remarque libre, conservée dans l’historique.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateEnvoi?: Date;

  @ApiPropertyOptional({ enum: MOYENS_ENVOI })
  @IsOptional()
  @IsIn(MOYENS_ENVOI)
  moyenEnvoi?: (typeof MOYENS_ENVOI)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateReceptionSignee?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateSignatureMtm?: Date;
}

export class DeposerDocumentProtocoleDto {
  @ApiProperty({
    description: 'prepare : version préparée ; signe : copie signée.',
    enum: ['prepare', 'signe'],
  })
  @IsIn(['prepare', 'signe'])
  role!: 'prepare' | 'signe';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

export class ListerProtocolesDto {
  @ApiPropertyOptional({ enum: STATUTS_PROTOCOLE })
  @IsOptional()
  @IsIn(STATUTS_PROTOCOLE)
  statut?: (typeof STATUTS_PROTOCOLE)[number];

  @ApiPropertyOptional({
    description: 'Recherche : client, référence du dossier, bien.',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  dossierVenteId?: string;

  @ApiPropertyOptional({ description: 'Collaborateur responsable du dossier.' })
  @IsOptional()
  @IsUUID()
  responsableId?: string;

  @ApiPropertyOptional({
    enum: [
      'sans_signature',
      'en_retard',
      'incomplets',
      'a_valider',
      'en_attente',
    ],
  })
  @IsOptional()
  @IsIn([
    'sans_signature',
    'en_retard',
    'incomplets',
    'a_valider',
    'en_attente',
  ])
  filtre?:
    'sans_signature' | 'en_retard' | 'incomplets' | 'a_valider' | 'en_attente';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  depuis?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  jusqua?: Date;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
