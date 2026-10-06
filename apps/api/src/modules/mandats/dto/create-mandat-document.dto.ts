import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { versBooleen } from '../../../common/utils/booleen.transform';

export class CreateMandatDocumentDto {
  @ApiProperty() @IsString() type!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  isPublic?: boolean;
}
