import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ConvertContactDto {
  @ApiPropertyOptional({
    description: 'Commercial à assigner au nouveau prospect',
  })
  @IsOptional()
  @IsUUID()
  commercialResponsableId?: string;
}
