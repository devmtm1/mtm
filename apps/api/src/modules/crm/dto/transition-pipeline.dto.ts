import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class TransitionPipelineDto {
  @ApiProperty({ description: 'Nouvelle étape du parcours commercial' })
  @IsString()
  @Length(1, 60)
  statutPipeline!: string;

  @ApiPropertyOptional({
    description:
      'Motif obligatoire pour une sortie (refusé, abandonné, injoignable)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  justification?: string;

  @ApiPropertyOptional({
    description:
      'Prochaine action : obligatoire tant que le prospect reste actif',
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  prochaineAction?: string;

  @ApiPropertyOptional({ description: 'Date de la prochaine relance' })
  @IsOptional()
  @IsDateString()
  prochaineRelanceLe?: string;
}

/** Étapes de fin de parcours (voir crm-options.service). */
export const PIPELINE_TERMINAL_STAGES = [
  'vente',
  'refuse',
  'abandonne',
  'injoignable',
] as const;
export type PipelineTerminalStage = (typeof PIPELINE_TERMINAL_STAGES)[number];
