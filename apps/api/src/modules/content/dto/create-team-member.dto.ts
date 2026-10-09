import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { versBooleen } from '../../../common/utils/booleen.transform';

export const TEAM_KINDS = ['directeur', 'groupe', 'membre'] as const;

export class CreateTeamMemberDto {
  @ApiProperty({ enum: TEAM_KINDS })
  @IsIn(TEAM_KINDS)
  kind!: string;

  @ApiProperty({
    example: 'Awa Diop',
    description: 'Pour la photo de groupe : la légende',
  })
  @IsString()
  @Length(2, 200)
  nom!: string;

  @ApiPropertyOptional({ example: 'Responsable commercial' })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  poste?: string;

  @ApiPropertyOptional({ description: 'Mot du directeur' })
  @IsOptional()
  @IsString()
  @Length(0, 3000)
  message?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  ordre?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  isActive?: boolean;
}
