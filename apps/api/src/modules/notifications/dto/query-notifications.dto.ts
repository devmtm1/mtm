import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { versBooleen } from '../../../common/utils/booleen.transform';

export class QueryNotificationsDto {
  @IsOptional()
  @Transform(versBooleen)
  @IsBoolean()
  nonLues?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number;
}
