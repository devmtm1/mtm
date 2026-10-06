import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';
import { versBooleen } from '../../../common/utils/booleen.transform';

export class PublishContentBlockDto {
  @Transform(versBooleen)
  @IsBoolean()
  isActive!: boolean;
}
