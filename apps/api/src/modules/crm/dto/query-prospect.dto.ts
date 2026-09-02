import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryProspectDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsUUID() commercialResponsableId?: string;
  @IsOptional() @IsString() statutPipeline?: string;
  @IsOptional() @IsString() sourceAcquisition?: string;
  @IsOptional() @IsDateString() dateMin?: string;
  @IsOptional() @IsDateString() dateMax?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize = 25;
  @IsOptional() @IsIn(['createdAt', 'nom', 'statutPipeline', 'score']) sortBy =
    'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'desc';
}
