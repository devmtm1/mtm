import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class TransitionPipelineDto {
  @ApiProperty({ description: 'Nouvelle étape du pipeline' })
  @IsString()
  @Length(1, 60)
  statutPipeline!: string;

  @ApiPropertyOptional({
    description: 'Justification métier (perte, blocage…)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  justification?: string;
}

export const PIPELINE_TERMINAL_STAGES = ['vente', 'perdu'] as const;
export type PipelineTerminalStage = (typeof PIPELINE_TERMINAL_STAGES)[number];
