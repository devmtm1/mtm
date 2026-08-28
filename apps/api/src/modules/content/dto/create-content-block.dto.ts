import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateContentBlockDto {
  @ApiProperty({ example: 'home.hero.title' })
  @IsString()
  @Length(2, 200)
  key!: string;

  @ApiPropertyOptional({ example: 'Hero principal' })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  title?: string;

  @ApiProperty({ example: 'Votre projet. Notre engagement.' })
  @IsString()
  @Length(1, 10000)
  content!: string;

  @ApiPropertyOptional({
    example: 'hero',
    enum: ['text', 'hero', 'testimonial', 'stat'],
  })
  @IsOptional()
  @IsString()
  type?: string = 'text';

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
