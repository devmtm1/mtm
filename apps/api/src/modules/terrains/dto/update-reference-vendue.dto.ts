import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';
import { versBooleen } from '../../../common/utils/booleen.transform';

/** Affiche ou retire un bien vendu du site public. */
export class UpdateReferenceVendueDto {
  @ApiProperty({
    description: 'true : le bien vendu s’affiche sur le site public',
  })
  @Transform(versBooleen)
  @IsBoolean()
  afficher!: boolean;
}
