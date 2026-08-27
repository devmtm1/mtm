import { PartialType } from '@nestjs/swagger';
import { CreateProprietaireDto } from './create-proprietaire.dto';

export class UpdateProprietaireDto extends PartialType(CreateProprietaireDto) {}
