import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateShowcaseItemDto {
  @ApiProperty({
    example: 'realisation',
    enum: ['realisation', 'projet_a_venir'],
  })
  @IsIn(['realisation', 'projet_a_venir'])
  category!: string;

  @ApiProperty({ example: 'Résidence Les Almadies' })
  @IsString()
  @Length(2, 200)
  title!: string;

  @ApiPropertyOptional({ example: 'Programme de 20 villas livré en 2025.' })
  @IsOptional()
  @IsString()
  @Length(0, 5000)
  description?: string;

  @ApiPropertyOptional({ example: 'Saly, Mbour' })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  location?: string;

  @ApiPropertyOptional({ example: '2025-06-01' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  ordre?: number = 0;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
